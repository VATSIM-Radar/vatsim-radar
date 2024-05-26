import type { QueryApi } from '@influxdata/influxdb-client';
import { InfluxDB } from '@influxdata/influxdb-client';
import type { VatsimPilot, VatsimPilotFlightPlan } from '~/types/data/vatsim';
import type { FeatureCollection, Point } from 'geojson';
import { fromServerLonLat } from '~/utils/backend/vatsim';

export let influxDB: QueryApi;

export function initInfluxDB() {
    const config = useRuntimeConfig();

    influxDB = new InfluxDB({
        url: config.INFLUX_URL,
        token: config.INFLUX_TOKEN,
    }).getQueryApi(config.INFLUX_ORG);

    getInfluxOnlineFlightTurns('1599139');
}

export type InfluxFlight = {
    [K in keyof Pick<VatsimPilot, 'altitude' | 'callsign' | 'cid' | 'groundspeed' | 'heading' | 'latitude' | 'longitude' | 'name' | 'qnh_mb' | 'transponder'>]?: VatsimPilot[K] | null
} & {
    [K in keyof Pick<VatsimPilotFlightPlan, 'aircraft_short' | 'altitude' | 'arrival' | 'departure' | 'enroute_time' | 'flight_rules' | 'route'> as `fpl_${ K }`]?: VatsimPilotFlightPlan[K] | null
} & {
    _time: string;
    time?: number;
    disconnected?: boolean | null;
};

const flightKeys = Object.keys({
    _time: true,
    fpl_aircraft_short: true,
    altitude: true,
    fpl_arrival: true,
    fpl_altitude: true,
    callsign: true,
    cid: true,
    fpl_departure: true,
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
} satisfies Record<keyof InfluxFlight, true>) as Array<keyof InfluxFlight>;

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

async function getFlightRows(query: string) {
    return (await influxDB.collectRows<InfluxFlight>(query))
        .map(x => ({
            ...x,
            time: new Date(x._time).getTime(),
        }) satisfies InfluxFlight)
        .sort((a, b) => b.time - a.time);
}

export async function getInfluxFlightsForCid({ cid, limit, offset, onlineOnly }: {
    cid: string;
    limit: number;
    offset?: number;
    onlineOnly?: boolean;
}) {
    let { items: flights, count: flightsCount } =
        await $fetch<{ items: VatsimPilotConnection[]; count: number }>(`https://api.vatsim.net/v2/members/${ cid }/history?limit=${ limit }&offset=${ offset ?? 0 }`);

    if (onlineOnly) {
        if (flights[0].end !== null) {
            return {
                rows: [],
                count: 0,
            };
        }
        else {
            flightsCount = 1;
        }
    }

    let [min, max] = flights.reduce(([min, max], flight) => {
        if (!flight.start) return [min, max];
        const start = new Date(flight.start).getTime();
        const end = new Date(flight.end ?? flight.start).getTime();
        if (end > max) max = end;
        if (start < min || min === 0) min = start;

        return [min, max];
    }, [0, 0]);

    if (flights.some(x => !x.end)) max = 0;

    const fluxQuery =
        `import "influxdata/influxdb/schema" import "strings" from(bucket: "${ process.env.INFLUX_BUCKET_MAIN }")
  |> range(start: ${ Math.round(min / 1000) }, stop: ${ max ? Math.round(max / 1000) : 'now()' })
  |> filter(fn: (r) => r["_measurement"] == "pilot")
  |> filter(fn: (r) => r["id"] == "${ cid }")
  |> schema.fieldsAsCols()
  |> filter(fn: (r) => r["fpl_callsign"] != "" or r["callsign"] != "" or r["fpl_departure"] != "" or r["fpl_arrival"] != "")
  |> group(columns: ["_time"])`;

    const rows = await getFlightRows(fluxQuery);

    const finalRows: InfluxFlight[] = [];

    for (const flight of flights) {
        const start = new Date(flight.start).getTime();
        // 2 minutes gap for API update
        const row = rows.find(x => x.time > start && x.time < start + (1000 * 60 * 2));
        if (!row) continue;

        finalRows.push(row);
    }

    return {
        rows: finalRows,
        count: flightsCount,
    };
}

export async function getInfluxOnlineFlightTurns(cid: string) {
    const { rows: [row] } = await getInfluxFlightsForCid({
        cid,
        limit: 1,
        onlineOnly: true,
    });

    if (!row) return null;

    const fluxQuery =
        `import "influxdata/influxdb/schema" import "strings" from(bucket: "${ process.env.INFLUX_BUCKET_MAIN }")
  |> range(start: ${ row._time })
  |> filter(fn: (r) => r["_measurement"] == "pilot")
  |> filter(fn: (r) => r["id"] == "${ cid }")
  |> schema.fieldsAsCols()`;

    const rows = await getFlightRows(fluxQuery);

    return rows.reverse().map((row, index) => {
        for (const key of flightKeys) {
            if (!row[key] && rows[index - 1]?.[key]) {
                // @ts-expect-error Restoring data from prev entry
                row[key] = rows[index - 1]?.[key];
            }
        }

        return row;
    }).reverse();
}

export type InfluxGeojson = FeatureCollection<Point>;

export async function getInfluxOnlineFlightTurnsGeojson(cid: string): Promise<InfluxGeojson | null> {
    const rows = await getInfluxOnlineFlightTurns(cid);
    if (!rows?.length) return null;

    return {
        type: 'FeatureCollection',
        features: rows.filter(x => x.latitude && x.longitude).map(row => ({
            type: 'Feature',
            properties: {
                type: 'turn',
                time: row.time,
                coordinates: [
                    row.longitude!,
                    row.latitude!,
                ],
            },
            geometry: {
                type: 'Point',
                coordinates: fromServerLonLat([
                    row.longitude!,
                    row.latitude!,
                ]),
            },
        })),
    };
}
