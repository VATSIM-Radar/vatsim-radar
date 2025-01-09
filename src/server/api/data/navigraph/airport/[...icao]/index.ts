import { handleH3Error } from '~/utils/backend/h3';
import { findAndRefreshFullUserByCookie } from '~/utils/backend/user';
import { getNavigraphGates, getNavigraphLayout, getNavigraphRunways } from '~/utils/backend/navigraph';
import type {
    NavigraphAirportData,
    NavigraphGate,
    NavigraphLayout,
    NavigraphRunway,
} from '~/types/data/navigraph';
import type { AmdbLayerName, AmdbResponseStructure } from '@navigraph/amdb';
import type { PartialRecord } from '~/types';
import { multiLineString } from '@turf/helpers';
import type { Point } from 'geojson';
import nearestPointOnLine from '@turf/nearest-point-on-line';
import { fromServerLonLat } from '~/utils/backend/vatsim';

const allowedProperties: PartialRecord<AmdbLayerName, string[]> = {
    taxiwayintersectionmarking: ['idlin'],
    taxiwayguidanceline: ['color', 'style', 'idlin'],
    taxiwayholdingposition: ['idlin', 'catstop'],
    runwaythreshold: ['idthr', 'brngtrue'],
    finalapproachandtakeoffarea: ['idrwy'],
    verticalpolygonalstructure: ['plysttyp', 'ident'],
    deicingarea: ['ident'],
} satisfies {
    [K in AmdbLayerName]?: (keyof AmdbResponseStructure[K]['features'][number]['properties'])[]
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

    let layout: Partial<AmdbResponseStructure> | null | undefined = null;

    let gates: NavigraphGate[] | undefined;
    let runways: NavigraphRunway[] | undefined;

    if (isLayout) {
        layout = await getNavigraphLayout({ icao }).catch(() => undefined);
    }

    if (!dataFromLayout || !isLayout || !layout || !layout.standguidanceline?.features.length || !layout.parkingstandarea?.features.length) {
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
        gates = layout.parkingstandarea.features.flatMap(area => {
            const { centroid } = (area.properties as unknown as { centroid: Point });

            const subGates = area.properties.idstd?.split('_');

            if (!subGates) {
                // TODO: Handle parkingstandareas with a null idstd

                return [];
            }

            // Generate stands for subgates which have associated standguidancelines
            const guidanceLineGates = subGates.flatMap(ident => {
                const applicableStandLines = layout.standguidanceline!.features.filter(line => line.properties.termref === area.properties.termref && line.properties.idstd?.split('_').includes(ident));

                if (applicableStandLines.length === 0) {
                    return [];
                }

                const geometry = multiLineString(applicableStandLines.map(line => line.geometry.coordinates));

                const nearestPoint = nearestPointOnLine(geometry, centroid);

                const coords = fromServerLonLat(nearestPoint.geometry.coordinates);

                return [{
                    gate_identifier: `${ ident }:${ area.properties.termref }`,
                    gate_longitude: coords[0],
                    gate_latitude: coords[1],
                    name: ident,
                    airport_identifier: area.properties.idarpt,
                }];
            });

            const remainingGates = subGates.filter(ident => !guidanceLineGates.find(item => item.name === ident));

            const coords = fromServerLonLat(centroid.coordinates);

            // For all subGates which have no associated standguidancelines, place a gate at the centroid of the parkingstandarea
            const centroidGates = remainingGates.map(ident => ({
                gate_identifier: `${ ident }:${ area.properties.termref }`,
                gate_longitude: coords[0],
                gate_latitude: coords[1],
                name: ident,
                airport_identifier: area.properties.idarpt,
            }));

            return [...guidanceLineGates, ...centroidGates];
        });

        const _layout = layout as NavigraphLayout;

        Object.entries(_layout).forEach(([key, value]) => {
            const property = allowedProperties[key as AmdbLayerName];
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
        gates,
        layout: layout ?? undefined,
    };
});
