import { getVATSIMIdentHeaders } from '~/utils/server';
import { getRedisSync, setRedisSync } from '~/utils/server/redis';

interface CachedMetar {
    icao: string;
    metar: string;
    taf: string | null;
    date: number;
}

type AirportWeatherResponse = { metar: string | null; taf: string | null } | null;

export async function getAirportWeather(icao: string[]): Promise<Record<string, AirportWeatherResponse>>;
export async function getAirportWeather(icao: string): Promise<AirportWeatherResponse>;
export async function getAirportWeather(icao: string | string[]): Promise<Record<string, AirportWeatherResponse> | AirportWeatherResponse> {
    const icaos = typeof icao === 'string' ? [icao] : icao;

    const cachedMetars: Record<string, CachedMetar | null> = Object.fromEntries(await Promise.all(icaos.map(async icao => {
        const redisData = await getRedisSync(`airport-${ icao }-metar`);

        return [icao, redisData ? JSON.parse(redisData) : null];
    })));

    const metarsToFetch = icaos.filter(x => !cachedMetars[x]);

    if (metarsToFetch.length) {
        try {
            const [metar, taf] = await Promise.all([
                $fetch<string>(`https://aviationweather.gov/api/data/metar?ids=${ metarsToFetch.join(',') }&format=raw`, { responseType: 'text' }).catch(() => ''),
                $fetch<string>(`https://aviationweather.gov/api/data/taf?ids=${ metarsToFetch.join(',') }&format=raw`, { responseType: 'text' }).catch(() => ''),
            ]);

            for (const entry of metar.split('\n')) {
                const splitted = entry.split(' ');
                const icao = splitted[1];
                if (!metarsToFetch.includes(icao)) continue;

                cachedMetars[icao] = {
                    icao,
                    metar: splitted.slice(1, splitted.length).join(' '),
                    taf: null,
                    date: Date.now(),
                };
            }

            let currentIcao = '';

            for (const entry of taf.split('\n')) {
                const splitted = entry.split(' ');
                const icao = splitted[0] === 'TAF' ? (cachedMetars[splitted[1]] ? splitted[1] : splitted[2]) : currentIcao;
                if (!metarsToFetch.includes(icao) || !cachedMetars[icao]) {
                    currentIcao = '';
                    continue;
                }

                currentIcao = icao;

                if (cachedMetars[icao].taf) cachedMetars[icao].taf += '\n' + entry;
                else cachedMetars[icao].taf = entry;
            }

            for (const icao of metarsToFetch) {
                if (cachedMetars[icao]) await setRedisSync(`airport-${ icao }-metar`, JSON.stringify(cachedMetars[icao]), 1000 * 60 * 3);
                else {
                    const metar = await $fetch<string>(`https://metar.vatsim.net/${ icao }`, { responseType: 'text', headers: getVATSIMIdentHeaders() }).catch(console.error);
                    if (metar) {
                        cachedMetars[icao] = {
                            icao,
                            metar,
                            taf: null,
                            date: Date.now(),
                        };

                        await setRedisSync(`airport-${ icao }-metar`, JSON.stringify(cachedMetars[icao]), 1000 * 60 * 3);
                    }
                }
            }
        }
        catch (e) {
            console.error(e);
        }
    }

    const data = Object.fromEntries(Object.entries(cachedMetars).map(([icao, x]) => [icao, (x
        ? {
            metar: x.metar,
            taf: x.taf,
        }
        : null) satisfies AirportWeatherResponse as AirportWeatherResponse]));

    if (typeof icao === 'string') return data[icao];
    return data;
}
