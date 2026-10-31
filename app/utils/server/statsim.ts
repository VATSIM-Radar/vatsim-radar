import type { FetchOptions } from 'ofetch';
import { getRedisSync, setRedisSync } from '~/utils/server/redis.ts';
import type { VatsimEvent } from '~/types/data/vatsim.ts';
import { getVATSIMIdentHeaders } from '~/utils/server/index.ts';

export function statsimRequest<T extends Record<string, any> | any[]>(path: string, options: FetchOptions = {}): Promise<T> {
    if (!process.env.STATSIM_API_KEY) throw new Error('Statsim API key is required');

    return $fetch<T>(`https://api.statsim.net/${ path }`, {
        ...options,
        method: 'GET',
        headers: {
            ...(options.headers || {}),
            'X-Api-Key': process.env.STATSIM_API_KEY,
        },
    });
}

export interface StatsimAircraft {
    id: number;
    vatsimid: string;
    callsign: string;
    departure: string;
    destination: string;
    aircraft: string;
    route: string;
    departed: string;
    arrived: string;
    loggedOn: string;
}

export interface StatsimAircraftDetailed extends StatsimAircraft {
    positions: {
        time: string;
        latitude: number;
        longitude: number;
        speed: number;
        altitude: number;
        heading: number;
    }[];
}

export async function getEventPlayback(event: VatsimEvent) {
    const cached = await getRedisSync(`playback-${ event.id }`);
    if (cached) return JSON.parse(cached);

    const departures = event.routes?.length ? event.routes.map(x => x.departure) : event.airports.map(x => x.icao);
    const arrivals = event.routes?.length ? event.routes.map(x => x.arrival) : departures;
    const airports = [...new Set([...departures, ...arrivals])];

    const from = new Date(event.start_time).toISOString();
    const to = new Date(event.end_time).toISOString();

    const addedAircraft = new Set<number>();
    const aircraftList: StatsimAircraftDetailed[] = [];

    for (let i = 0; i < [...departures, ...arrivals].length; i += 2) {
        await Promise.all(airports.slice(i, i + 5).map(async icao => {
            let list: StatsimAircraft[] = [];

            if (departures.includes(icao)) {
                list = [...await statsimRequest<StatsimAircraft[]>(`api/Flights/IcaoOrigin?icao=${ icao }&from=${ from }&to=${ to }`).catch(() => [])];
            }

            if (arrivals.includes(icao)) {
                list = [...list, ...await statsimRequest<StatsimAircraft[]>(`api/Flights/IcaoDestination?icao=${ icao }&from=${ from }&to=${ to }`).catch(() => [])];
            }

            for (let i = 0; i < list.length; i += 5) {
                await Promise.all(list.slice(i, i + 5).map(async aircraft => {
                    if (addedAircraft.has(aircraft.id)) return;

                    const flight = await statsimRequest<StatsimAircraftDetailed>(`api/Flights/Id/${ aircraft.id }`);
                    if (addedAircraft.has(aircraft.id)) return;
                    addedAircraft.add(aircraft.id);

                    aircraftList.push(flight);
                }));
            }
        }));
    }

    await setRedisSync(`playback-${ event.id }`, JSON.stringify(aircraftList), 1000 * 60 * 60 * 24 * 30);

    return aircraftList;
}
