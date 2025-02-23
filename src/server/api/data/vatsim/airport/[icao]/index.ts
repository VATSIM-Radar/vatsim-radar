import { radarStorage } from '~/utils/backend/storage';
import type { VatsimAirportInfo } from '~/utils/backend/vatsim';
import { getVatsimAirportInfo, validateAirportIcao } from '~/utils/backend/vatsim';
import { getAirportWeather } from '~/utils/backend/vatsim/weather';
import { getFirsPolygons } from '~/utils/backend/vatsim/vatspy';

export interface VatsimAirportData {
    metar?: string;
    taf?: string;
    vatInfo?: VatsimAirportInfo | null;
    center: string[];
}

export default defineEventHandler(async (event): Promise<VatsimAirportData | undefined> => {
    const validateAirport = await validateAirportIcao(event, true);
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

    const list = await getFirsPolygons();

    const firs = list.map(fir => {
        return fir.polygon.intersectsCoordinate([airport.lon, airport.lat]) &&
            radarStorage.vatsim.firs.filter(
                x => x.firs.some(x => x.icao === fir.icao && x.boundaryId === fir.featureId) && x.controller,
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
