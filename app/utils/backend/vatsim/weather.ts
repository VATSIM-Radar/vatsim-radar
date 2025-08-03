import { getVATSIMIdentHeaders } from '~/utils/backend';
import { getRedisSync, setRedisSync } from '~/utils/backend/redis';

interface CachedMetar {
    icao: string;
    metar: string;
    taf: string | null;
    date: number;
}

export async function getAirportWeather(icao: string): Promise<{ metar: string | null; taf: string | null } | null> {
    const redisMetar = await getRedisSync(`airport-${ icao }-metar`);

    const cachedMetar = redisMetar ? JSON.parse(redisMetar) as CachedMetar : undefined;

    const data: { metar: string | null; taf: string | null } = {
        metar: null,
        taf: null,
    };

    if (cachedMetar?.metar) {
        data.metar = cachedMetar.metar;
        data.taf = cachedMetar.taf ?? null;
    }
    else {
        try {
            const [metar, noaaMetar, taf] = await Promise.all([
                $fetch<string>(`https://metar.vatsim.net/${ icao }`, { responseType: 'text', headers: getVATSIMIdentHeaders() }).catch(console.error),
                $fetch<string>(`https://tgftp.nws.noaa.gov/data/observations/metar/stations/${ icao }.TXT`, { responseType: 'text' }).catch(() => {}),
                $fetch<string>(`https://tgftp.nws.noaa.gov/data/forecasts/taf/stations/${ icao }.TXT`, { responseType: 'text' }).catch(() => {}),
            ]);

            data.metar = metar ?? noaaMetar ?? null;
            const splitTaf = taf?.split('\n');
            if (splitTaf) {
                data.taf = splitTaf.slice(1, splitTaf.length).join('\n');
            }

            if (data.metar) {
                await setRedisSync(`airport-${ icao }-metar`, JSON.stringify({
                    icao,
                    metar: data.metar,
                    taf: data.taf,
                    date: Date.now(),
                }), 1000 * 60 * 10);
            }
        }
        catch (e) {
            console.error(e);

            if (cachedMetar?.metar) {
                data.metar = cachedMetar.metar;
            }

            if (cachedMetar?.taf) {
                data.taf = cachedMetar.taf;
            }

            if (!data.metar && !data.taf) return null;
        }
    }

    return data;
}
