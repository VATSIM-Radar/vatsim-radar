import type { InfluxFlight } from '~/utils/backend/influx/queries';
import { getInfluxOnlineFlightTurns } from '~/utils/backend/influx/queries';
import type { Feature, FeatureCollection, Point } from 'geojson';
import { radarStorage } from '~/utils/backend/storage';
import type { VatsimPilot } from '~/types/data/vatsim';
import { getFlightRowGroup } from '~/utils/shared/flight';

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

export type InfluxGeojson = {
    flightPlanTime: string;
    features: FeatureCollection<Point>[];
};

export function getGeojsonForData(rows: InfluxFlight[], flightPlanStart: string): InfluxGeojson {
    function getRowColor(row: InfluxFlight) {
        return getFlightRowGroup(row.altitude);
    }

    const geoRows: Feature<Point>[] = [];

    for (const row of rows.filter(x => x.latitude && x.longitude)) {
        geoRows.push({
            type: 'Feature',
            properties: {
                type: 'turn',
                standing: row.groundspeed !== undefined && row.groundspeed !== null && row.groundspeed < 50,
                timestamp: row._time,
                color: getRowColor(row),
            },
            geometry: {
                type: 'Point',
                coordinates: [
                    row.longitude!,
                    row.latitude!,
                ],
            },
        });
    }

    const rowsGroups: FeatureCollection<Point>[] = [];

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
            if (!hadStanding && feature.properties!.standing) {
                hadStanding = true;
            }
            else delete feature.properties!.standing;

            if (i === 0 || i === group.features.length - 1) continue;
            delete feature.properties!.color;
            delete feature.properties!.timestamp;
        }
    }

    return {
        flightPlanTime: flightPlanStart,
        features: rowsGroups,
    };
}

export async function getInfluxOnlineFlightTurnsGeojson(cid: string, start?: string): Promise<InfluxGeojson | null> {
    const rows = await getInfluxOnlineFlightTurns(cid, start);
    if (!rows?.features.length) return null;

    return getGeojsonForData(rows.features, rows.flightPlanStart);
}

function outputInfluxValue(value: string | number | boolean, isFloat = false) {
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

export function getPlanInfluxDataForPilots() {
    const date = `${ Date.now() }000000`;

    const data = radarStorage.vatsim.data!.pilots.filter(x => x.cid && x.callsign).map(pilot => {
        const previousPilot = previousPlanData[pilot.cid];

        const obj = {
            altitude: pilot.altitude,
            callsign: pilot.callsign,
            groundspeed: pilot.groundspeed,
            heading: pilot.heading,
            latitude: pilot.latitude,
            longitude: pilot.longitude,
            name: pilot.name,
            qnh_mb: pilot.qnh_mb,
            transponder: pilot.transponder,
            fpl_route: pilot.flight_plan?.route,
            fpl_enroute_time: pilot.flight_plan?.enroute_time,
            fpl_departure_time: pilot.flight_plan?.deptime,
            fpl_flight_rules: pilot.flight_plan?.flight_rules,
            fpl_departure: pilot.flight_plan?.departure,
            fpl_arrival: pilot.flight_plan?.arrival,
            fpl_altitude: pilot.flight_plan?.altitude,
        };

        if (previousPilot && previousPilot.callsign === obj.callsign && previousPilot.flight_plan?.deptime === obj.fpl_departure_time && previousPilot.flight_plan?.enroute_time === obj.fpl_enroute_time && previousPilot.flight_plan?.departure === obj.fpl_departure) return;

        const entries = Object.entries(obj)
            .filter(([key, value]) => value !== undefined && value !== null)
            .map(([key, value]) => `${ key }=${ outputInfluxValue(value!, key === 'latitude' || key === 'longitude') }`)
            .join(',');

        if (!entries) return;

        return `data,cid=${ pilot.cid } ${ entries } ${ date }`;
    }).filter(x => !!x) as string[];

    previousPlanData = Object.fromEntries(radarStorage.vatsim.data!.pilots.map(x => [x.cid, x]));

    return data;
}

function shouldUpdatePilot(pilot: VatsimPilot, { pilot: previousPilot, previousAltitude, previousLogTime }: PreviousPilot): boolean {
    if (previousPilot.heading === pilot.heading && Math.abs(previousAltitude - pilot.altitude) < 100) return false;
    if (previousPilot.longitude === pilot.longitude && previousPilot.latitude === pilot.latitude) return false;

    const diff = Date.now() - previousLogTime;
    const altitude = pilot.altitude;
    if (altitude > 30000) return diff > 1000 * 30;
    if (altitude > 20000) return diff > 1000 * 20;
    if (altitude > 15000) return diff > 1000 * 10;
    if (altitude > 10000) return diff > 1000 * 7;

    return true;
}

export function getShortInfluxDataForPilots() {
    const date = `${ Date.now() }000000`;

    const newPilotsData: typeof previousShortData = {};

    const data = radarStorage.vatsim.data!.pilots.filter(x => x.cid && x.callsign).map(pilot => {
        const previousPilot = previousShortData[pilot.cid];

        const previousAltitude = !newPilotsData[pilot.cid]?.previousAltitude ||
        (Math.abs(newPilotsData[pilot.cid].previousAltitude - pilot.altitude) > 500)
            ? pilot.altitude
            : newPilotsData[pilot.cid].previousAltitude;

        if (previousPilot && !shouldUpdatePilot(pilot, previousPilot)) {
            newPilotsData[pilot.cid] = {
                previousLogTime: previousPilot.previousLogTime,
                pilot,
                previousAltitude,
            };
            return;
        }

        const obj = {
            altitude: pilot.altitude,
            callsign: pilot.callsign,
            groundspeed: pilot.groundspeed,
            heading: pilot.heading,
            latitude: pilot.latitude,
            longitude: pilot.longitude,
            name: pilot.name,
            qnh_mb: pilot.qnh_mb,
            transponder: pilot.transponder,
        };

        const previousObj = previousPilot && {
            altitude: previousPilot.pilot.altitude,
            callsign: previousPilot.pilot.callsign,
            groundspeed: previousPilot.pilot.groundspeed,
            heading: previousPilot.pilot.heading,
            latitude: previousPilot.pilot.latitude,
            longitude: previousPilot.pilot.longitude,
            name: previousPilot.pilot.name,
            qnh_mb: previousPilot.pilot.qnh_mb,
            transponder: previousPilot.pilot.transponder,
        };

        const entries = Object.entries(obj)
            .filter(([key, value]) => value !== undefined && value !== null && (!previousObj || previousObj[key as keyof typeof previousObj] !== value))
            .map(([key, value]) => `${ key }=${ outputInfluxValue(value!, key === 'latitude' || key === 'longitude') }`)
            .join(',');

        if (!entries) return;

        newPilotsData[pilot.cid] = {
            previousLogTime: Date.now(),
            pilot,
            previousAltitude,
        };

        return `data,cid=${ pilot.cid } ${ entries } ${ date }`;
    }).filter(x => !!x) as string[];

    previousShortData = newPilotsData;
    return data;
}
