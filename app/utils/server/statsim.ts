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

export interface StatsimController {
    id: number;
    vatsimid: string;
    callsign: string;
    loggedOn: string;
    loggedOff: string;
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

export function getStatsCacheTTL(from: Date, to: Date): number {
    const monthEnd = new Date(from);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
    return to >= monthEnd ? 1000 * 60 * 60 * 24 : 1000 * 60 * 30;
}

export async function getEventPlayback(event: VatsimEvent): Promise<StatsimAircraftDetailed[]> {
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

export async function getFlights(from: Date, to: Date): Promise<StatsimAircraft[]> {
    const cacheKey = `flights-${ from.getTime() }-${ to.getTime() }`;
    const cached = await getRedisSync(cacheKey);
    if (cached) return JSON.parse(cached);

    const monthKey = getStatsimMonthKey('flights', from, to);
    const monthly = monthKey && await getRedisSync(monthKey);
    if (monthly) return JSON.parse(monthly);

    const flights = await statsimRequest<StatsimAircraft[]>(`api/Flights/Dates?from=${ from.toISOString() }&to=${ to.toISOString() }`);
    await setRedisSync(cacheKey, JSON.stringify(flights), getStatsCacheTTL(from, to));
    if (monthKey) await setRedisSync(monthKey, JSON.stringify(flights), getStatsCacheTTL(from, to));
    return flights;
}

export async function getATCSessions(from: Date, to: Date): Promise<StatsimController[]> {
    const cacheKey = `atc-${ from.getTime() }-${ to.getTime() }`;
    const cached = await getRedisSync(cacheKey);
    if (cached) return JSON.parse(cached);

    const monthKey = getStatsimMonthKey('atc', from, to);
    const monthly = monthKey && await getRedisSync(monthKey);
    if (monthly) return JSON.parse(monthly);

    const atc = await statsimRequest<StatsimController[]>(`api/Atcsessions/Dates?from=${ from.toISOString() }&to=${ to.toISOString() }`);
    await setRedisSync(cacheKey, JSON.stringify(atc), getStatsCacheTTL(from, to));
    if (monthKey) await setRedisSync(monthKey, JSON.stringify(atc), getStatsCacheTTL(from, to));
    return atc;
}

function getStatsimMonthKey(type: string, from: Date, to: Date): string | null {
    if (from.getUTCDate() !== 1 || from.getUTCHours() || from.getUTCMinutes() || from.getUTCSeconds() || from.getUTCMilliseconds()) return null;
    const nextMonth = new Date(from);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
    if (nextMonth.getTime() !== to.getTime()) return null;

    return `statsim-${ type }-month-${ from.toISOString().slice(0, 7) }`;
}
