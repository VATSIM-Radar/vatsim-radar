import { handleH3Error } from '~/utils/backend/h3';
import { findAndRefreshFullUserByCookie } from '~/utils/backend/user';
import { getNavigraphGates, getNavigraphLayout, getNavigraphRunways } from '~/utils/backend/navigraph';
import type {
    NavigraphAirportData,
    NavigraphGate,
    NavigraphLayout,
    NavigraphLayoutType,
    NavigraphRunway,
} from '~/types/data/navigraph';
import type { FeatureCollection, Point } from 'geojson';
import { fromServerLonLat } from '~/utils/backend/vatsim';
import type { PartialRecord } from '~/types';

const allowedProperties: PartialRecord<NavigraphLayoutType, string[]> = {
    taxiwayintersectionmarking: ['idlin'],
    taxiwayguidanceline: ['color', 'style', 'idlin'],
    taxiwayholdingposition: ['idlin', 'catstop'],
    runwaythreshold: ['idthr', 'brngtrue'],
    finalapproachandtakeoffarea: ['idrwy'],
    verticalpolygonalstructure: ['plysttyp', 'ident'],
};

export default defineEventHandler(async (event): Promise<NavigraphAirportData | undefined> => {
    const user = await findAndRefreshFullUserByCookie(event);

    const icao = getRouterParam(event, 'icao');

    if (icao?.length !== 4) {
        handleH3Error({
            event,
            statusCode: 400,
            data: 'Invalid code',
        });
        return;
    }

    const query = getQuery(event);
    const isLayout = query.layout !== '0' && !!user?.hasFms && user.hasCharts;
    const dataFromLayout = isLayout && query.originalData !== '1';

    let layout: NavigraphLayout | null | undefined = null;

    let gates: NavigraphGate[] | undefined;
    let runways: NavigraphRunway[] | undefined;

    if (isLayout) {
        layout = await getNavigraphLayout({ icao }).catch(() => undefined);
    }

    if (!dataFromLayout || !isLayout || !layout || !('parkingstandlocation' in layout) || !(layout.parkingstandlocation as FeatureCollection).features.length) {
        gates = await getNavigraphGates({
            user,
            event,
            icao,
        });

        runways = await getNavigraphRunways({
            user,
            event,
            icao,
        });

        if (!gates || !runways) return;
    }
    else {
        const _layout = layout as NavigraphLayout;

        gates = _layout.parkingstandlocation?.features.map(feature => {
            const coords = fromServerLonLat((feature.geometry as Point).coordinates);

            return {
                gate_identifier: `${ feature.properties!.idstd }:${ feature.properties!.termref }`,
                gate_longitude: coords[0],
                gate_latitude: coords[1],
                name: feature.properties!.idstd || feature.properties!.termref,
                airport_identifier: feature.properties!.idarpt,
            };
        }) ?? [];

        gates = gates.filter((x, index) => x.name && !(gates as NavigraphGate[]).some((y, yIndex) => y.gate_identifier === x.gate_identifier && index > yIndex));

        delete layout.parkingstandlocation;

        Object.entries(_layout).forEach(([key, value]) => {
            const property = allowedProperties[key as NavigraphLayoutType];
            if (!property?.length) value.features.forEach(feature => feature.properties = {});
            else {
                value.features.forEach(feature => {
                    for (const i in feature.properties) {
                        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                        if (!property.includes(i)) delete feature.properties[i];
                    }
                });
            }
        });
    }

    if (!import.meta.dev) {
        setResponseHeader(event, 'Cache-Control', 'private, max-age=604800, stale-while-revalidate=86400, immutable');
    }

    return {
        airport: icao,
        runways: runways ?? [],
        gates: gates as NavigraphGate[],
        layout: layout as NavigraphLayout,
    };
});
