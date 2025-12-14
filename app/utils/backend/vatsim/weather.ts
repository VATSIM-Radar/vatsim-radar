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
            let [metar, noaaMetar, taf] = await Promise.all([
                $fetch<string>(`https://metar.vatsim.net/${ icao }`, { responseType: 'text', headers: getVATSIMIdentHeaders() }).catch(console.error),
                $fetch<string>(`https://tgftp.nws.noaa.gov/data/observations/metar/stations/${ icao }.TXT`, { responseType: 'text' }).catch(() => {}),
                $fetch<string>(`https://tgftp.nws.noaa.gov/data/forecasts/taf/stations/${ icao }.TXT`, { responseType: 'text' }).catch(() => {}),
            ]);

            if (noaaMetar) {
                noaaMetar = noaaMetar.split('\n')[1] ?? noaaMetar;
            }

            data.metar = metar ?? noaaMetar ?? null;

            if (metar && noaaMetar && metar !== noaaMetar) {
                const vatsimDay = Number(metar.slice(5, 7));
                const noaaDay = Number(noaaMetar.slice(5, 7));
                const currentDate = new Date().getUTCDate();

                if (noaaDay === currentDate) {
                    if (noaaDay !== vatsimDay) {
                        data.metar = noaaMetar;
                    }
                    else {
                        const vatsimTime = Number(metar.slice(7, 11));
                        const noaaTime = Number(noaaMetar.slice(7, 11));

                        if (!isNaN(vatsimTime) && !isNaN(noaaTime) && noaaTime > vatsimTime) data.metar = noaaMetar;
                    }
                }
            }

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
                }), 1000 * 60 * 3);
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
