import type { InfluxFlight } from '~/utils/backend/influx/queries';
import { getInfluxOnlineFlightTurns } from '~/utils/backend/influx/queries';
import type { FeatureCollection, Point } from 'geojson';
import { radarStorage } from '~/utils/backend/storage';
import type { VatsimPilot } from '~/types/data/vatsim';
import { getFlightRowGroup } from '~/utils/shared/flight';
import {getPilotTrueAltitude} from "~/utils/shared/vatsim";

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

export type InfluxGeojsonFeatureCollection = FeatureCollection<Point, {
    type: 'turn';
    timestamp?: string;
    color?: number | null;
    altitude?: number | null | undefined;
    speed?: number | null | undefined;
    standing?: boolean;
}>;

export type InfluxGeojsonFeature = InfluxGeojsonFeatureCollection['features'][0];

export type InfluxGeojson = {
    flightPlan?: string;
    flightPlanTime?: string;
    features?: InfluxGeojsonFeatureCollection[];
};

export function getGeojsonForData(rows: InfluxFlight[], flightPlanStart: string, short = false): InfluxGeojson {
    function getRowColor(row: InfluxFlight) {
        return getFlightRowGroup(row.altitude);
    }

    const geoRows: InfluxGeojsonFeature[] = [];

    for (const row of rows.filter(x => x.latitude && x.longitude)) {
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
        } satisfies InfluxGeojsonFeature);
    }

    const rowsGroups: InfluxGeojsonFeatureCollection[] = [];

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

    let lastTime = '';

    for (const group of rowsGroups) {
        for (let i = 0; i < group.features.length; i++) {
            const feature = group.features[i];
            const savedTime = feature.properties.timestamp;

            if ((short || lastTime === feature.properties.timestamp!.slice(0, 16)) && i !== 0 && i !== group.features.length - 1) {
                delete feature.properties!.altitude;
                delete feature.properties!.speed;
                delete feature.properties!.timestamp;
            }
            else if (short) {
                delete feature.properties!.altitude;
                delete feature.properties!.speed;
            }
            if (savedTime) lastTime = savedTime.slice(0, 16);

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
        features: rowsGroups,
    };
}

export async function getInfluxOnlineFlightTurnsGeojson(cid: string, start?: string): Promise<InfluxGeojson | null> {
    const rows = await getInfluxOnlineFlightTurns(cid, start);
    if (!rows?.features.length) return null;

    return getGeojsonForData(rows.features, rows.flightPlanStart, !!start);
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

export function getShortInfluxDataForPilots() {
    const date = `${ Date.now() }000000`;

    const newPilotsData: typeof previousShortData = {};

    const data = radarStorage.vatsim.data!.pilots.filter(x => x.cid && x.callsign).map(pilot => {
        const previousPilot = previousShortData[pilot.cid];

        const previousAltitude = !newPilotsData[pilot.cid]?.previousAltitude ||
        (Math.abs(newPilotsData[pilot.cid].previousAltitude - getPilotTrueAltitude(pilot)) > 500)
            ? getPilotTrueAltitude(pilot)
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
            altitude: getPilotTrueAltitude(pilot),
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
            altitude: getPilotTrueAltitude(previousPilot.pilot),
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
