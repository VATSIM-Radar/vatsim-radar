import type { VatsimPilot, VatsimPilotFlightPlan } from '~/types/data/vatsim';
import { influxDBQuery } from '~/utils/server/influx/influx';

export type InfluxFlight = {
    [K in keyof Pick<VatsimPilot, 'altitude' | 'callsign' | 'cid' | 'groundspeed' | 'heading' | 'latitude' | 'longitude' | 'name' | 'qnh_mb' | 'transponder'>]?: VatsimPilot[K] | null
} & {
    [K in keyof Pick<VatsimPilotFlightPlan, 'aircraft_short' | 'altitude' | 'arrival' | 'departure' | 'deptime' | 'enroute_time' | 'flight_rules' | 'route'> as K extends 'deptime' ? 'fpl_departure_time' : `fpl_${ K }`]?: VatsimPilotFlightPlan[K] | null
} & {
    _time: string;
    time: number;
    cid: string;
    disconnected?: boolean | null;
};
type InfluxFlightKey = Extract<keyof InfluxFlight, string>;
const flightKeys = Object.keys({
    _time: true,
    fpl_aircraft_short: true,
    altitude: true,
    fpl_arrival: true,
    fpl_altitude: true,
    callsign: true,
    cid: true,
    fpl_departure: true,
    fpl_departure_time: true,
    disconnected: true,
    fpl_enroute_time: true,
    fpl_flight_rules: true,
    groundspeed: true,
    heading: true,
    latitude: true,
    longitude: true,
    name: true,
    qnh_mb: true,
    fpl_route: true,
    time: true,
    transponder: true,
} satisfies Record<InfluxFlightKey, true>) as InfluxFlightKey[];

const planFields: InfluxFlightKey[] = [
    'callsign',
    'fpl_arrival',
    'fpl_departure',
    'fpl_departure_time',
    'fpl_enroute_time',
    'heading',
    'name',
    'qnh_mb',
    'transponder',
];
const turnsFields: InfluxFlightKey[] = ['altitude', 'groundspeed', 'latitude', 'longitude'];

function sqlString(value: string | number) {
    return `'${ String(value).replaceAll('\'', '\'\'') }'`;
}

function sqlIdentifier(value: string) {
    return `"${ value.replaceAll('"', '""') }"`;
}

function sqlTimestamp(value: string | number | Date) {
    return sqlString(value instanceof Date ? value.toISOString() : value);
}

function getFieldsSelect(fields: InfluxFlightKey[]) {
    return ['time', 'cid', ...fields].map(sqlIdentifier).join(', ');
}

function getCidFilter(cids: Array<string | number>) {
    return cids.map(cid => `${ sqlIdentifier('cid') } = ${ sqlString(cid) }`).join(' OR ');
}

function normalizeInfluxTime(value: unknown): string {
    if (value instanceof Date) return value.toISOString();
    return String(value);
}

async function getFlightRows(query: string, database: string) {
    const rows: InfluxFlight[] = [];

    for await (const item of influxDBQuery.query(query, database, { type: 'sql' })) {
        const _time = normalizeInfluxTime(item.time);
        const row = {
            _time,
            time: new Date(_time).getTime(),
            cid: String(item.cid),
        } as InfluxFlight;

        for (const key of flightKeys) {
            if (key === '_time' || key === 'time' || key === 'cid') continue;
            if (item[key] !== undefined && item[key] !== null) row[key] = item[key] as never;
        }

        rows.push(row);
    }

    return rows.sort((a, b) => b.time! - a.time!);
}

export function filterRows(rows: InfluxFlight[]): InfluxFlight[] {
    return rows.filter((row, index) => {
        const nextRow = rows[index + 1];

        const isNew = !row?.heading || !row.name || !row.qnh_mb || !row.transponder || !row.fpl_arrival;
        const isFplnChange = row?.fpl_arrival !== nextRow?.fpl_arrival && row?.fpl_departure !== nextRow?.fpl_departure;

        if (isNew && !isFplnChange) return true;

        const similarRow = (
            row.fpl_arrival &&
            nextRow?.fpl_departure === row.fpl_departure &&
            nextRow.callsign === row.callsign &&
            (
                (
                    !!row.fpl_departure_time &&
                    !!nextRow.fpl_departure_time &&
                    nextRow.fpl_departure_time === row.fpl_departure_time
                ) ||
                (
                    !row.fpl_departure_time &&
                    !nextRow.fpl_departure_time &&
                    nextRow.fpl_arrival === row.fpl_arrival &&
                    nextRow.fpl_enroute_time === row.fpl_enroute_time
                )
            )
        ) || (!nextRow?.fpl_arrival && nextRow?.name === row.name && nextRow?.callsign === row.callsign)
            ? rows[index + 1]
            : null;
        return !similarRow;
    });
}

export async function getInfluxFlightsForCid({
    cid,
    limit,
    startDate,
    endDate,
}: {
    cid: string;
    limit: number;
    startDate: number;
    endDate?: number;
    offset?: number;
    onlineOnly?: boolean;
}) {
    const database = process.env.INFLUX_BUCKET_PLANS!;
    const sqlQuery =
        `SELECT ${ getFieldsSelect(planFields) }
FROM ${ sqlIdentifier('data') }
WHERE ${ sqlIdentifier('time') } >= ${ sqlTimestamp(new Date(startDate)) }
  AND ${ sqlIdentifier('time') } <= ${ endDate ? sqlTimestamp(new Date(endDate)) : 'now()' }
  AND ${ sqlIdentifier('cid') } = ${ sqlString(cid) }
ORDER BY ${ sqlIdentifier('time') } DESC`;

    const rows = await getFlightRows(sqlQuery, database);

    return {
        rows: filterRows(rows).slice(0, limit),
    };
}

export async function getInfluxLatestFlightForCids({
    cids,
    startDate,
    endDate,
}: {
    cids: number[];
    startDate: number;
    endDate?: number;
}) {
    const database = process.env.INFLUX_BUCKET_PLANS!;
    const sqlQuery =
        `SELECT ${ getFieldsSelect(planFields) }
FROM ${ sqlIdentifier('data') }
WHERE ${ sqlIdentifier('time') } >= ${ sqlTimestamp(new Date(startDate)) }
  AND ${ sqlIdentifier('time') } <= ${ endDate ? sqlTimestamp(new Date(endDate)) : 'now()' }
  AND (${ getCidFilter(cids) })
ORDER BY ${ sqlIdentifier('time') } DESC`;

    const rows = await getFlightRows(sqlQuery, database);

    const pilots: {
        cid: number;
        row: InfluxFlight | undefined;
    }[] = [];

    for (const row of rows) {
        if (pilots.some(x => x.cid === +row.cid!) || !row.cid) continue;

        const foundRow = filterRows(rows.filter(x => x.cid === row.cid))[0];
        pilots.push({
            cid: +row.cid!,
            row: foundRow,
        });
    }

    return pilots.filter(x => x.row);
}

export async function getInfluxOnlineFlightTurns(cid: string, start?: string) {
    const { rows: [row] } = await getInfluxFlightsForCid({
        cid,
        limit: 1,
        onlineOnly: true,
        startDate: new Date().getTime() - (1000 * 60 * 60 * 24),
    });

    if (!row) return null;

    const database = process.env.INFLUX_BUCKET_MAIN!;
    const sqlQuery =
        `SELECT ${ getFieldsSelect(turnsFields) }
FROM ${ sqlIdentifier('data') }
WHERE ${ sqlIdentifier('time') } >= ${ sqlTimestamp(start || row._time) }
  AND ${ sqlIdentifier('cid') } = ${ sqlString(cid) }
ORDER BY ${ sqlIdentifier('time') } DESC`;

    const rows = await getFlightRows(sqlQuery, database);

    const features: InfluxFlight[] = rows;

    for (let i = features.length - 1; i >= 0; i--) {
        const row = features[i];

        for (const key of flightKeys) {
            if (!row[key] && rows[i + 1]?.[key]) {
                // @ts-expect-error Restoring data from prev entry
                row[key] = rows[i + 1]?.[key];
            }
        }
    }

    return {
        flightPlanStart: row._time,
        features,
    };
}

export async function getInfluxOnlineFlightsTurns(cids: number[]) {
    const flights = await getInfluxLatestFlightForCids({
        cids,
        startDate: new Date().getTime() - (1000 * 60 * 60 * 24),
    });

    if (!flights.length) return null;

    const database = process.env.INFLUX_BUCKET_MAIN!;
    const sqlQuery =
        `SELECT ${ getFieldsSelect(turnsFields) }
FROM ${ sqlIdentifier('data') }
WHERE ${ sqlIdentifier('time') } >= ${ sqlTimestamp(flights.sort((a, b) => a.row!.time! - b.row!.time!)[0].row!._time) }
  AND ${ sqlIdentifier('time') } <= now() - INTERVAL '5 seconds'
  AND (${ getCidFilter(flights.map(x => x.cid)) })
ORDER BY ${ sqlIdentifier('time') } DESC`;

    const rows = await getFlightRows(sqlQuery, database);

    const pilots: {
        cid: number;
        rows: InfluxFlight[];
    }[] = [];

    for (const row of rows) {
        if (pilots.some(x => x.cid === +row.cid!) || !row.cid) continue;

        const flight = flights.find(x => x.cid === +row.cid!);
        if (!flight || row.time < flight.row!.time!) continue;

        const foundRows = rows.filter(x => x.cid === row.cid);

        pilots.push({
            cid: +row.cid!,
            rows: foundRows.reverse().map((row, index) => {
                for (const key of flightKeys) {
                    if (!row[key] && foundRows[index - 1]?.[key]) {
                        // @ts-expect-error Restoring data from prev entry
                        row[key] = foundRows[index - 1]?.[key];
                    }
                }

                return row;
            }).reverse(),
        });
    }

    return pilots;
}
