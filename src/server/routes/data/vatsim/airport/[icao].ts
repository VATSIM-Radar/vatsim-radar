import { handleH3Error } from '~/utils/backend/h3';
import { radarStorage } from '~/utils/backend/storage';

export interface VatsimAirportData {
    metar?: string;
    taf?: string;
    notams?: {
        title: string
        content: string
    }[];
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
}

const caches: {
    icao: string
    metar?: string
    taf?: string
    date: number
}[] = [];

const regex = new RegExp('<b>(?<title>.*) - (?<content>[\\s\\S]*?)<\\/PRE>', 'g');

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

    const data: VatsimAirportData = {};
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
        }));

        promises.push(new Promise<void>(async (resolve) => {
            const formData = new FormData();

            formData.set('retrieveLocId', icao);
            formData.set('reportType', 'Report');
            formData.set('actionType', 'notamRetrievalByICAOs');
            formData.set('submit', 'View NOTAMs');

            const html = await $fetch<string>('https://www.notams.faa.gov/dinsQueryWeb/queryRetrievalMapAction.do', {
                headers: {
                    'User-Agent': 'VatsimRadar/0.0',
                },
                method: 'POST',
                responseType: 'text',
                body: formData,
            });

            data.notams = [];

            let result: RegExpExecArray | null;

            while ((result = regex.exec(html)) !== null) {
                data.notams.push({
                    title: result.groups?.title?.replaceAll('</b>', '').trim() ?? '',
                    content: result.groups?.content?.trim() ?? '',
                });
            }

            resolve();
        }));
    }

    await Promise.all(promises);

    return data;
});
