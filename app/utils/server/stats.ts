import type { H3Event } from 'h3';
import { isValidDate } from '~/utils/shared';
import { isStatsRangeWithin31Days } from '~/utils/shared/stats-range';
import { getRedisSync, setRedisSync } from '~/utils/server/redis';
import { handleH3Error } from '~/utils/server/h3';
import { getFlights, getATCSessions, getStatsCacheTTL } from '~/utils/server/statsim';
import type { StatsimAircraft, StatsimController } from '~/utils/server/statsim';
import { radarStorage } from '~/utils/server/storage';
import type { StatsAirport, StatsAirline, StatsAircraft, StatsRoute, StatsATC } from '~/types/data/stats';

type StatsKind = 'airports' | 'airlines' | 'aircraft' | 'routes' | 'atc';

function aggregateFlights(kind: Exclude<StatsKind, 'atc'>, flights: StatsimAircraft[]): StatsAirport[] | StatsAirline[] | StatsAircraft[] | StatsRoute[] {
    const rows: Record<string, any> = {};
    for (const flight of flights) {
        if (kind === 'airports') {
            for (const [icao, field] of [[flight.departure, 'departures'], [flight.destination, 'arrivals']] as const) {
                if (!icao) continue;
                const row = rows[icao] ??= { icao, departures: 0, arrivals: 0, count: 0 };
                row[field]++;
                row.count++;
            }
        }
        else if (kind === 'airlines') {
            const prefix = /^[A-Z]+/.exec(flight.callsign)?.[0];
            const airline = prefix && radarStorage.airlines.airlines[prefix];
            if (airline) {
                const row = rows[airline.icao] ??= { ...airline, count: 0 };
                row.count++;
            }
        }
        else if (kind === 'aircraft') {
            const aircraft = flight.aircraft?.split('/')[0];
            if (aircraft) {
                const row = rows[aircraft] ??= { aircraft, count: 0 };
                row.count++;
            }
        }
        else if (flight.departure && flight.destination) {
            const key = `${ flight.departure }-${ flight.destination }`;
            const row = rows[key] ??= { key, from: flight.departure, to: flight.destination, count: 0 };
            row.count++;
        }
    }

    return Object.values(rows).sort((a, b) => b.count - a.count).slice(0, 1000);
}

// Time Online sums overlapping sessions, while uptime merges intervals before dividing by the full range.
function aggregateATC(sessions: StatsimController[], from: Date, to: Date, combined: boolean): StatsATC[] {
    const groups = new Map<string, { key: string; duration: number; intervals: [number, number][] }>();
    for (const session of sessions) {
        if (!session.callsign) continue;
        const start = new Date(session.loggedOn).getTime();
        const loggedOff = session.loggedOff ? new Date(session.loggedOff).getTime() : NaN;
        if (!Number.isFinite(start)) continue;

        const first = Math.max(start, from.getTime());
        const last = Math.min(Number.isFinite(loggedOff) ? loggedOff : to.getTime(), to.getTime());
        if (last <= first) continue;

        const key = combined ? session.callsign.split('_')[0] : session.callsign;
        const group = groups.get(key) ?? { key, duration: 0, intervals: [] };
        group.duration += last - first;
        group.intervals.push([first, last]);
        groups.set(key, group);
    }

    return [...groups.values()].map(group => {
        group.intervals.sort((a, b) => a[0] - b[0]);
        let covered = 0;
        let [start, end] = group.intervals[0];
        for (const [nextStart, nextEnd] of group.intervals.slice(1)) {
            if (nextStart <= end) end = Math.max(end, nextEnd);
            else {
                covered += end - start;
                [start, end] = [nextStart, nextEnd];
            }
        }
        covered += end - start;
        return { key: group.key, duration: group.duration, uptime: 100 * covered / (to.getTime() - from.getTime()) };
    }).sort((a, b) => b.duration - a.duration).slice(0, 1000);
}

export async function getStats(event: H3Event, kind: StatsKind) {
    const query = getQuery(event);
    const from = typeof query.from === 'string' ? new Date(query.from) : null;
    const to = typeof query.to === 'string' ? new Date(query.to) : null;
    if (!from || !to || !isValidDate(from) || !isValidDate(to) || !isStatsRangeWithin31Days(from, to)) {
        return handleH3Error({ event, statusCode: 400, data: 'Invalid date range (maximum 31 days)' });
    }
    if (kind === 'atc' && query.combined !== undefined && query.combined !== 'true' && query.combined !== 'false') {
        return handleH3Error({ event, statusCode: 400, data: 'Invalid combined option' });
    }

    const combined = kind === 'atc' && query.combined === 'true';
    const key = `stats-${ kind }-${ combined ? 'combined-' : '' }${ from.getTime() }-${ to.getTime() }`;
    const cached = await getRedisSync(key);
    if (cached) return JSON.parse(cached);

    const result = kind === 'atc'
        ? aggregateATC(from.getTime() <= Date.now() ? await getATCSessions(from, to) : [], from, to, combined)
        : aggregateFlights(kind, from.getTime() <= Date.now() ? await getFlights(from, to) : []);
    await setRedisSync(key, JSON.stringify(result), getStatsCacheTTL(from, to));
    return result;
}
