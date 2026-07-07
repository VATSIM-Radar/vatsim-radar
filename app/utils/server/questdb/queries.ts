import type { VatsimPilot, VatsimPilotFlightPlan } from '~/types/data/vatsim';
import { questDBQuery } from '~/utils/server/questdb/client';

export type QuestDBFlight = {
    [K in keyof Pick<VatsimPilot, 'altitude' | 'callsign' | 'cid' | 'groundspeed' | 'heading' | 'latitude' | 'longitude' | 'name' | 'qnh_mb' | 'transponder'>]?: VatsimPilot[K] | null
} & {
    [K in keyof Pick<VatsimPilotFlightPlan, 'aircraft_short' | 'altitude' | 'arrival' | 'departure' | 'deptime' | 'enroute_time' | 'flight_rules' | 'route' | 'departed_at' | 'arrived_at'> as K extends 'deptime' ? 'fpl_departure_time' : `fpl_${ K }`]?: VatsimPilotFlightPlan[K] | null
} & {
    _time: string;
    time: number;
    cid: string;
    fpl_revision?: VatsimPilotFlightPlan['revision_id'] | null;
    disconnected?: boolean | null;
};
type QuestDBFlightKey = Extract<keyof QuestDBFlight, string>;
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
    fpl_revision: true,
    fpl_departed_at: true,
    fpl_arrived_at: true,
    fpl_route: true,
    time: true,
    transponder: true,
} satisfies Record<QuestDBFlightKey, true>) as QuestDBFlightKey[];

const planFields: QuestDBFlightKey[] = [
    'callsign',
    'fpl_arrival',
    'fpl_departure',
    'fpl_departure_time',
    'fpl_enroute_time',
    'fpl_revision',
    'heading',
    'name',
    'qnh_mb',
    'transponder',
];
const turnsFields: QuestDBFlightKey[] = ['altitude', 'groundspeed', 'latitude', 'longitude', 'fpl_departed_at', 'fpl_arrived_at'];

function getMainTable() {
    return process.env.QUESTDB_TABLE_MAIN || 'vatsim_tracks';
}

function getPlansTable() {
    return process.env.QUESTDB_TABLE_PLANS || 'vatsim_plans';
}

function getTimestampColumn() {
    return process.env.QUESTDB_TIMESTAMP_COLUMN || 'timestamp';
}

function sqlString(value: string | number) {
    return `'${ String(value).replaceAll('\'', '\'\'') }'`;
}

function sqlIdentifier(value: string) {
    return `"${ value.replaceAll('"', '""') }"`;
}

function normalizeTimestamp(value: string | number | Date) {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'number') return new Date(value).toISOString();
    if (/^\d+$/.test(value)) return new Date(Number(value)).toISOString();

    return value;
}

function sqlTimestamp(value: string | number | Date) {
    return sqlString(normalizeTimestamp(value));
}

function getFieldsSelect(fields: QuestDBFlightKey[]) {
    return [`${ sqlIdentifier(getTimestampColumn()) } AS ${ sqlIdentifier('time') }`, sqlIdentifier('cid'), ...fields.map(sqlIdentifier)].join(', ');
}

function getCidFilter(cids: Array<string | number>) {
    return cids.map(cid => `${ sqlIdentifier('cid') } = ${ sqlString(cid) }`).join(' OR ');
}

function normalizeQuestDBTime(value: unknown): string {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string' && /^\d+$/.test(value)) return new Date(Number(value)).toISOString();
    if (typeof value === 'string') {
        return value.replace(/\.(\d{3})\d+Z$/, '.$1Z');
    }

    return String(value);
}

async function getFlightRows(query: string) {
    const rows: QuestDBFlight[] = [];

    const items = await questDBQuery(query);
    for (const item of items) {
        const _time = normalizeQuestDBTime(item.time);
        const row = {
            _time,
            time: new Date(_time).getTime(),
            cid: String(item.cid),
        } as QuestDBFlight;

        for (const key of flightKeys) {
            if (key === '_time' || key === 'time' || key === 'cid') continue;
            if (item[key] !== undefined && item[key] !== null) row[key] = item[key] as never;
        }

        rows.push(row);
    }

    return rows.sort((a, b) => b.time! - a.time!);
}

function hasLowerRevisionWithSameCallsign(row: QuestDBFlight, nextRow: QuestDBFlight | undefined) {
    return row.callsign &&
        row.callsign === nextRow?.callsign &&
        row.fpl_departure_time === nextRow?.fpl_departure_time &&
        typeof row.fpl_revision === 'number' &&
        typeof nextRow.fpl_revision === 'number' &&
        row.fpl_revision > nextRow.fpl_revision;
}

export function filterRows(rows: QuestDBFlight[]): QuestDBFlight[] {
    return rows.filter((row, index) => {
        const nextRow = rows[index + 1];

        if (nextRow && hasLowerRevisionWithSameCallsign(row, nextRow)) return false;
        if (!nextRow) return true;

        const isNew = !row?.heading || !row.name || !row.qnh_mb || !row.transponder || !row.fpl_arrival;
        const isFplnChange = row?.fpl_revision !== nextRow?.fpl_revision || row?.fpl_departure_time !== nextRow?.fpl_departure_time;

        if (isNew && !isFplnChange) return true;

        const similarRow = (
            nextRow?.callsign === row.callsign && (
                !!row.fpl_departure_time &&
                    !!nextRow.fpl_departure_time &&
                    (nextRow.fpl_departure_time === row.fpl_departure_time || (nextRow.fpl_departure === row.fpl_departure && nextRow.fpl_arrival === row.fpl_arrival)) &&
                    nextRow.fpl_enroute_time === row.fpl_enroute_time
            )
        ) || (!nextRow?.fpl_arrival && nextRow?.name === row.name && nextRow?.callsign === row.callsign)
            ? rows[index + 1]
            : null;

        return !similarRow;
    });
}

export async function getQuestDBFlightsForCid({
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
    const sqlQuery =
        `SELECT ${ getFieldsSelect(planFields) }
FROM ${ sqlIdentifier(getPlansTable()) }
WHERE ${ sqlIdentifier(getTimestampColumn()) } >= ${ sqlTimestamp(new Date(startDate)) }
  AND ${ sqlIdentifier(getTimestampColumn()) } <= ${ endDate ? sqlTimestamp(new Date(endDate)) : 'now()' }
  AND ${ sqlIdentifier('cid') } = ${ sqlString(cid) }
ORDER BY ${ sqlIdentifier(getTimestampColumn()) } DESC`;

    const rows = await getFlightRows(sqlQuery);

    return {
        rows: filterRows(rows).slice(0, limit),
    };
}

export async function getQuestDBLatestFlightForCids({
    cids,
    startDate,
    endDate,
}: {
    cids: number[];
    startDate: number;
    endDate?: number;
}) {
    const sqlQuery =
        `SELECT ${ getFieldsSelect(planFields) }
FROM ${ sqlIdentifier(getPlansTable()) }
WHERE ${ sqlIdentifier(getTimestampColumn()) } >= ${ sqlTimestamp(new Date(startDate)) }
  AND ${ sqlIdentifier(getTimestampColumn()) } <= ${ endDate ? sqlTimestamp(new Date(endDate)) : 'now()' }
  AND (${ getCidFilter(cids) })
ORDER BY ${ sqlIdentifier(getTimestampColumn()) } DESC`;

    const rows = await getFlightRows(sqlQuery);

    const pilots: {
        cid: number;
        row: QuestDBFlight | undefined;
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

export async function getQuestDBOnlineFlightTurns(cid: string, start?: string) {
    const { rows: [row] } = await getQuestDBFlightsForCid({
        cid,
        limit: 1,
        onlineOnly: true,
        startDate: new Date().getTime() - (1000 * 60 * 60 * 24),
    });

    if (!row) return null;

    const sqlQuery =
        `SELECT ${ getFieldsSelect(turnsFields) }
FROM ${ sqlIdentifier(getMainTable()) }
WHERE ${ sqlIdentifier(getTimestampColumn()) } >= ${ sqlTimestamp(start || row._time) }
  AND ${ sqlIdentifier('cid') } = ${ sqlString(cid) }
ORDER BY ${ sqlIdentifier(getTimestampColumn()) } DESC`;

    const rows = await getFlightRows(sqlQuery);

    const features: QuestDBFlight[] = rows;

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

export async function getQuestDBOnlineFlightsTurns(cids: number[]) {
    const flights = await getQuestDBLatestFlightForCids({
        cids,
        startDate: new Date().getTime() - (1000 * 60 * 60 * 24),
    });

    if (!flights.length) return null;

    const sqlQuery =
        `SELECT ${ getFieldsSelect(turnsFields) }
FROM ${ sqlIdentifier(getMainTable()) }
WHERE ${ sqlIdentifier(getTimestampColumn()) } >= ${ sqlTimestamp(flights.sort((a, b) => a.row!.time! - b.row!.time!)[0].row!._time) }
  AND ${ sqlIdentifier(getTimestampColumn()) } <= ${ sqlTimestamp(Date.now() - 5000) }
  AND (${ getCidFilter(flights.map(x => x.cid)) })
ORDER BY ${ sqlIdentifier(getTimestampColumn()) } DESC`;

    const rows = await getFlightRows(sqlQuery);

    const pilots: {
        cid: number;
        rows: QuestDBFlight[];
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
