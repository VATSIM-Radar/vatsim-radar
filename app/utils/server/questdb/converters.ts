import type { FeatureCollection, Point } from 'geojson';
import type { QuestDBFlight } from '~/utils/server/questdb/queries';
import { getQuestDBOnlineFlightTurns } from '~/utils/server/questdb/queries';
import { radarStorage } from '~/utils/server/storage';
import type { VatsimPilot } from '~/types/data/vatsim';
import { getFlightRowGroup } from '~/utils/shared/flight';
import { getPilotTrueAltitude } from '~/utils/shared/vatsim';

export interface VatsimPilotConnection {
    id: number;
    vatsim_id: number;
    type: number;
    rating: number;
    callsign: number;
    start: string;
    end: string | null;
    server: string;
}

export type QuestDBGeojsonFeatureCollection = FeatureCollection<Point, {
    type: 'turn';
    timestamp?: string;
    color?: number | null;
    altitude?: number | null | undefined;
    speed?: number | null | undefined;
    standing?: boolean;
}>;

export type QuestDBGeojsonFeature = QuestDBGeojsonFeatureCollection['features'][0];

export type QuestDBGeojson = {
    flightPlan?: string;
    flightPlanTime?: string;
    departedAt?: string | null;
    arrivedAt?: string | null;
    features?: QuestDBGeojsonFeatureCollection[];
};

function getQuestDBTableName(table: string) {
    return table.replaceAll(/[, \n\r\t]/g, '_');
}

export function getGeojsonForData(rows: QuestDBFlight[], flightPlanStart: string, short = false): QuestDBGeojson {
    function getRowColor(row: QuestDBFlight) {
        return getFlightRowGroup(row.altitude);
    }

    const geoRows: QuestDBGeojsonFeature[] = [];
    let depTime: string | null = null;
    let arrTime: string | null = null;

    for (const row of rows.filter(x => x.latitude && x.longitude)) {
        if (row.fpl_departed_at) {
            depTime = row.fpl_departed_at;
        }

        if (row.fpl_arrived_at) {
            arrTime = row.fpl_arrived_at;
        }

        geoRows.push({
            type: 'Feature',
            properties: {
                type: 'turn',
                standing: row.groundspeed !== undefined && row.groundspeed !== null && row.groundspeed < 50,
                timestamp: row._time,
                color: getRowColor(row),
                speed: row.groundspeed,
                altitude: row.altitude,
            },
            geometry: {
                type: 'Point',
                coordinates: [
                    row.longitude!,
                    row.latitude!,
                ],
            },
        } satisfies QuestDBGeojsonFeature);
    }

    const rowsGroups: QuestDBGeojsonFeatureCollection[] = [];

    for (const row of geoRows) {
        const lastGroup = rowsGroups[rowsGroups.length - 1];
        if (lastGroup && lastGroup.features[0].properties!.color === row.properties!.color) {
            lastGroup.features.push(row);
        }
        else {
            rowsGroups.push({
                type: 'FeatureCollection',
                features: [row],
            });
        }
    }

    let hadStanding = false;

    for (const group of rowsGroups) {
        for (let i = 0; i < group.features.length; i++) {
            const feature = group.features[i];

            if (short) {
                delete feature.properties!.altitude;
                delete feature.properties!.speed;
            }

            if (!hadStanding && feature.properties!.standing) {
                hadStanding = true;
            }
            else delete feature.properties!.standing;

            if (i === 0 || i === group.features.length - 1) continue;
            delete feature.properties!.color;
        }
    }

    return {
        flightPlanTime: flightPlanStart,
        departedAt: depTime,
        arrivedAt: arrTime,
        features: rowsGroups,
    };
}

export async function getQuestDBOnlineFlightTurnsGeojson(cid: string, start?: string, full = false): Promise<QuestDBGeojson | null> {
    const rows = await getQuestDBOnlineFlightTurns(cid, start);
    if (!rows?.features.length) return null;

    return getGeojsonForData(rows.features, rows.flightPlanStart, !!start && !full);
}

function outputQuestDBValue(value: string | number | boolean, isFloat = false) {
    if (typeof value === 'string') return `"${ value.replaceAll('"', '\\"') }"`;
    if (typeof value === 'number') {
        if (!value.toString().includes('.') && !isFloat) return `${ value }i`;
        return value;
    }
    if (typeof value === 'boolean') return String(value);
}

let previousPlanData: Record<number, VatsimPilot> = {};

interface PreviousPilot {
    previousLogTime: number; previousAltitude: number; pilot: VatsimPilot;
}

let previousShortData: Record<number, PreviousPilot> = {};

export function getPlanQuestDBDataForPilots() {
    const table = getQuestDBTableName(process.env.QUESTDB_TABLE_PLANS || 'vatsim_plans');
    const date = BigInt(Date.now()) * 1000000n;

    const data = radarStorage.vatsim.data!.pilots.filter(x => x.cid && x.callsign).map(pilot => {
        const previousPilot = previousPlanData[pilot.cid];

        const obj = {
            altitude: getPilotTrueAltitude(pilot),
            callsign: pilot.callsign,
            groundspeed: pilot.groundspeed,
            heading: pilot.heading,
            latitude: pilot.latitude,
            longitude: pilot.longitude,
            name: pilot.name,
            qnh_mb: pilot.qnh_mb,
            transponder: pilot.transponder,
            fpl_route: pilot.flight_plan?.route,
            fpl_revision: pilot.flight_plan?.revision_id,
            fpl_enroute_time: pilot.flight_plan?.enroute_time,
            fpl_departure_time: pilot.flight_plan?.deptime,
            fpl_flight_rules: pilot.flight_plan?.flight_rules,
            fpl_departure: pilot.flight_plan?.departure,
            fpl_arrival: pilot.flight_plan?.arrival,
            fpl_altitude: pilot.flight_plan?.altitude,
        };

        if (previousPilot &&
            previousPilot.callsign === obj.callsign &&
            previousPilot.flight_plan?.deptime === obj.fpl_departure_time &&
            previousPilot.flight_plan?.enroute_time === obj.fpl_enroute_time &&
            previousPilot.flight_plan?.revision_id === obj.fpl_revision
        ) return;

        const entries = Object.entries(obj)
            .filter(([, value]) => value !== undefined && value !== null)
            .map(([key, value]) => `${ key }=${ outputQuestDBValue(value!, key === 'latitude' || key === 'longitude') }`)
            .join(',');

        if (!entries) return;

        return `${ table },cid=${ pilot.cid } ${ entries } ${ date }`;
    }).filter(x => !!x) as string[];

    previousPlanData = Object.fromEntries(radarStorage.vatsim.data!.pilots.map(x => [x.cid, x]));

    return data;
}

function shouldUpdatePilot(pilot: VatsimPilot, { pilot: previousPilot, previousAltitude, previousLogTime }: PreviousPilot): boolean {
    const diff = Date.now() - previousLogTime;

    if (previousPilot.longitude === pilot.longitude && previousPilot.latitude === pilot.latitude) return false;
    if (
        previousPilot.heading === pilot.heading && Math.abs(previousAltitude - getPilotTrueAltitude(pilot)) < 100 && Math.abs(previousPilot.groundspeed - pilot.groundspeed) < 5
    ) return diff > 1000 * 120;

    const altitude = getPilotTrueAltitude(pilot);
    if (altitude > 30000) return diff > 1000 * 30;
    if (altitude > 20000) return diff > 1000 * 20;
    if (altitude > 15000) return diff > 1000 * 10;
    if (altitude > 10000) return diff > 1000 * 7;

    return true;
}

export function getShortQuestDBDataForPilots() {
    const table = getQuestDBTableName(process.env.QUESTDB_TABLE_MAIN || 'vatsim_tracks');
    const date = BigInt(Date.now()) * 1000000n;

    const newPilotsData: typeof previousShortData = {};

    const data = radarStorage.vatsim.extendedPilots.filter(x => x.cid && x.callsign).map(pilot => {
        const previousPilot = previousShortData[pilot.cid];

        const previousAltitude = !previousShortData[pilot.cid]?.previousAltitude ||
        (Math.abs(previousShortData[pilot.cid].previousAltitude - getPilotTrueAltitude(pilot)) > 500)
            ? getPilotTrueAltitude(pilot)
            : previousShortData[pilot.cid].previousAltitude;

        if (previousPilot && !shouldUpdatePilot(pilot, previousPilot)) {
            newPilotsData[pilot.cid] = {
                previousLogTime: previousPilot.previousLogTime,
                pilot: previousPilot.pilot,
                previousAltitude,
            };
            return;
        }

        const obj = {
            altitude: getPilotTrueAltitude(pilot),
            callsign: pilot.callsign,
            groundspeed: pilot.groundspeed,
            heading: pilot.heading,
            latitude: pilot.latitude,
            longitude: pilot.longitude,
            name: pilot.name,
            qnh_mb: pilot.qnh_mb,
            transponder: pilot.transponder,
            fpl_departed_at: pilot.flight_plan?.departed_at,
            fpl_arrived_at: pilot.flight_plan?.arrived_at,
        };

        const previousObj = previousPilot && {
            altitude: getPilotTrueAltitude(previousPilot.pilot),
            callsign: previousPilot.pilot.callsign,
            groundspeed: previousPilot.pilot.groundspeed,
            heading: previousPilot.pilot.heading,
            latitude: previousPilot.pilot.latitude,
            longitude: previousPilot.pilot.longitude,
            name: previousPilot.pilot.name,
            qnh_mb: previousPilot.pilot.qnh_mb,
            transponder: previousPilot.pilot.transponder,
            fpl_departed_at: previousPilot.pilot.flight_plan?.departed_at,
            fpl_arrived_at: previousPilot.pilot.flight_plan?.arrived_at,
        };

        const entries = Object.entries(obj)
            .filter(([key, value]) => value !== undefined && value !== null && (!previousObj || previousObj[key as keyof typeof previousObj] !== value))
            .map(([key, value]) => `${ key }=${ outputQuestDBValue(value!, key === 'latitude' || key === 'longitude') }`)
            .join(',');

        if (!entries) return;

        newPilotsData[pilot.cid] = {
            previousLogTime: Date.now(),
            pilot,
            previousAltitude,
        };

        return `${ table },cid=${ pilot.cid } ${ entries } ${ date }`;
    }).filter(x => !!x) as string[];

    previousShortData = newPilotsData;
    return data;
}
