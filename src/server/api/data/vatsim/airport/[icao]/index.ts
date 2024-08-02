import { radarStorage } from '~/utils/backend/storage';
import { MultiPolygon } from 'ol/geom';
import type { VatsimAirportInfo } from '~/utils/backend/vatsim';
import { fromServerLonLat, getVatsimAirportInfo, validateAirportIcao } from '~/utils/backend/vatsim';
import { getAirportWeather } from '~/utils/backend/vatsim/weather';

export interface VatsimAirportData {
    metar?: string;
    taf?: string;
    vatInfo?: VatsimAirportInfo;
    center: string[];
}

export default defineEventHandler(async (event): Promise<VatsimAirportData | undefined> => {
    const validateAirport = validateAirportIcao(event, true);
    if (!validateAirport) return;

    const { icao, airport } = validateAirport;

    const weatherOnly = getQuery(event).requestedDataType === '1';
    const controllersOnly = getQuery(event).requestedDataType === '2';

    const data: VatsimAirportData = {
        center: [],
    };
    const promises: PromiseLike<any>[] = [];

    if (!controllersOnly) {
        promises.push(new Promise<void>(async resolve => {
            const weather = await getAirportWeather(icao);
            if (weather?.metar) data.metar = weather.metar;
            if (weather?.taf) data.taf = weather.taf;

            resolve();
        }));
    }
    if (!weatherOnly && !controllersOnly) {
        promises.push(new Promise<void>(async resolve => {
            try {
                data.vatInfo = await getVatsimAirportInfo(icao);

                resolve();
            }
            catch (e) {
                console.error(e);
                resolve();
            }
        }));
    }

    await Promise.allSettled(promises);

    const list = radarStorage.vatspy.data?.firs ?? [];

    const firs = list.map(fir => {
        const geometry = new MultiPolygon(fir.feature.geometry.coordinates.map(x => x.map(x => x.map(x => fromServerLonLat(x)))));
        return geometry.intersectsCoordinate([airport.lon, airport.lat]) &&
            radarStorage.vatsim.firs.filter(
                x => x.firs.some(x => x.icao === fir.icao && x.boundaryId === fir.feature.id) && x.controller,
            )!;
    }).filter(x => !!x);

    if (firs.length) {
        data.center = [...new Set(
            firs
                .flatMap(x => x ? x.map(x => x.controller?.callsign) : [])
                .filter(x => !!x) as string[],
        )];
    }

    return data;
});
