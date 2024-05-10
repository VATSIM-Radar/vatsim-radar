import { handleH3Error } from '~/utils/backend/h3';
import { radarStorage } from '~/utils/backend/storage';
import { MultiPolygon } from 'ol/geom';
import { fromServerLonLat } from '~/utils/backend/vatsim';

export interface VatsimAirportData {
    metar?: string;
    taf?: string;
    vatInfo?: {
        name?: string;
        altitude_m?: number
        altitude_ft?: number
        transition_alt?: number
        transition_level?: string
        transition_level_by_atc?: boolean
        city?: number
        country?: string
        division_id?: string
        ctafFreq?: string;
    };
    center: string[]
}

const caches: {
    icao: string
    metar?: string
    taf?: string
    date: number
}[] = [];

export default defineEventHandler(async (event): Promise<VatsimAirportData | undefined> => {
    const icao = getRouterParam(event, 'icao')?.toUpperCase();
    if (icao?.length !== 4) {
        handleH3Error({
            event,
            statusCode: 400,
            statusMessage: 'Invalid ICAO',
        });
        return;
    }

    const airport = radarStorage.vatspy.data?.airports.find(x => x.icao === icao);
    if (!airport) {
        handleH3Error({
            event,
            statusCode: 404,
            statusMessage: 'Airport not found',
        });
        return;
    }

    const weatherOnly = getQuery(event).weatherOnly === '1';

    const data: VatsimAirportData = {
        center: [],
    };
    const promises: PromiseLike<any>[] = [];

    promises.push(new Promise<void>(async (resolve) => {
        const cachedMetar = caches.find(x => x.icao === icao);
        if (cachedMetar?.metar && cachedMetar.taf && cachedMetar.date > Date.now() - 1000 * 60 * 5) {
            data.metar = cachedMetar.metar;
            data.taf = cachedMetar.taf;
        }
        else {
            try {
                const [metar, taf] = await Promise.all([
                    $fetch<string>(`https://tgftp.nws.noaa.gov/data/observations/metar/stations/${ icao }.TXT`, { responseType: 'text' }),
                    $fetch<string>(`https://tgftp.nws.noaa.gov/data/forecasts/taf/stations/${ icao }.TXT`, { responseType: 'text' }),
                ]);

                data.metar = metar.split('\n')[1];
                const splitTaf = taf.split('\n');
                data.taf = splitTaf.slice(1, splitTaf.length).join('\n');

                if (cachedMetar) {
                    cachedMetar.date = Date.now();
                    cachedMetar.metar = data.metar;
                    cachedMetar.taf = data.taf;
                }
                else {
                    caches.push({
                        icao,
                        metar: data.metar,
                        taf: data.taf,
                        date: Date.now(),
                    });
                }
            }
            catch (e) {
                if (cachedMetar?.metar) {
                    data.metar = cachedMetar.metar;
                }

                if (cachedMetar?.taf) {
                    data.taf = cachedMetar.metar;
                }
            }
        }

        resolve();
    }));

    if (!weatherOnly) {
        promises.push(new Promise<void>(async (resolve) => {
            try {
                const { data: airportData } = await $fetch<{
                    data: VatsimAirportData['vatInfo'] & { stations: { ctaf: boolean, frequency: string }[] }
                }>(`https://my.vatsim.net/api/v2/aip/airports/${ icao }`);

                data.vatInfo = {
                    name: airportData?.name,
                    altitude_m: airportData?.altitude_m,
                    altitude_ft: airportData?.altitude_ft,
                    transition_alt: airportData?.transition_alt,
                    transition_level: airportData?.transition_level,
                    transition_level_by_atc: airportData?.transition_level_by_atc,
                    city: airportData?.city,
                    country: airportData?.country,
                    division_id: airportData?.division_id,
                    ctafFreq: airportData?.stations?.find(x => x.ctaf)?.frequency,
                };

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

    const firs = list.map((fir) => {
        const geometry = new MultiPolygon(fir.feature.geometry.coordinates.map(x => x.map(x => x.map(x => fromServerLonLat(x)))));
        return geometry.intersectsCoordinate([airport.lon, airport.lat]) &&
            radarStorage.vatsim.firs.filter(
                x => x.firs.some(x => x.icao === fir.icao && x.boundaryId === fir.feature.id) && x.controller,
            )!;
    }).filter(x => !!x);

    if (firs.length) {
        data.center = [...new Set(
            //@ts-expect-error
            firs.flatMap(x => x && x.map(x => x.controller?.callsign)).filter(x => !!x) as string[],
        )];
    }

    return data;
});
