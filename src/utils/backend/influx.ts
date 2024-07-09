import type { QueryApi } from '@influxdata/influxdb-client';
import { InfluxDB } from '@influxdata/influxdb-client';
import type { VatsimPilot, VatsimPilotFlightPlan } from '~/types/data/vatsim';
import type { FeatureCollection, Point } from 'geojson';
import { fromServerLonLat } from '~/utils/backend/vatsim';
import { colorsList } from './styles';

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

export async function getInfluxFlightsForCid({ cid, limit, offset, onlineOnly, startDate, endDate }: {
    cid: string;
    limit: number;
    startDate: number;
    endDate?: number;
    offset?: number;
    onlineOnly?: boolean;
}) {
    const fluxQuery =
        `import "influxdata/influxdb/schema" import "strings" from(bucket: "${ process.env.INFLUX_BUCKET_MAIN }")
  |> range(start: ${ Math.round(startDate / 1000) }, stop: ${ endDate ? Math.round(endDate / 1000) : 'now()' })
  |> filter(fn: (r) => r["_measurement"] == "pilot")
  |> filter(fn: (r) => r["id"] == "${ cid }")
  |> schema.fieldsAsCols()
  |> filter(fn: (r) => (r["fpl_departure"] != "" and r["fpl_arrival"] != "") or (r["name"] != "" and not exists r["fpl_departure"] and not exists r["fpl_arrival"]))
  |> group(columns: ["_time"])`;

    const rows = await getFlightRows(fluxQuery);

    return {
        rows: rows.filter((row, index) => {
            const nextRow = rows[index + 1];
            if (!row?.heading || !row.name || !row.qnh_mb || !row.transponder || !row.fpl_arrival || (!row.groundspeed && row.fpl_arrival && (!row.altitude || row.altitude < 3000))) return true;

            const similarRow = (
                row.fpl_arrival && nextRow?.fpl_arrival === row.fpl_arrival && nextRow?.fpl_departure === row.fpl_departure && row.fpl_enroute_time === nextRow.fpl_enroute_time && row.callsign === nextRow.callsign
            ) || (!nextRow?.fpl_arrival && nextRow?.name === row.name && nextRow?.callsign === row.callsign)
                ? rows[index + 1]
                : null;
            return !similarRow;
        }).slice(0, limit),
    };
}

export async function getInfluxOnlineFlightTurns(cid: string) {
    const { rows: [row] } = await getInfluxFlightsForCid({
        cid,
        limit: 1,
        onlineOnly: true,
        startDate: new Date().getTime() - (1000 * 60 * 60 * 24),
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

    function getRowColor(row: InfluxFlight) {
        let rowColor = colorsList.warning500;

        if (row?.altitude) {
            if (row.altitude < 5000) {
                rowColor = colorsList.success400;
            }
            else if (row.altitude < 10000) {
                rowColor = colorsList.success600;
            }
            else if (row.altitude < 15000) {
                rowColor = colorsList.primary500;
            }
            else if (row.altitude < 20000) {
                rowColor = colorsList.primary700;
            }
            else if (row.altitude < 25000) {
                rowColor = colorsList.info400;
            }
            else if (row.altitude < 30000) {
                rowColor = colorsList.info500;
            }
            else if (row.altitude > 40500) {
                rowColor = colorsList.error300;
            }
            else if (row.altitude > 50000) {
                rowColor = colorsList.error700;
            }
            else {
                rowColor = colorsList.info700;
            }
        }
        else rowColor = colorsList.success500;

        return rowColor;
    }

    return {
        type: 'FeatureCollection',
        features: rows.filter(x => x.latitude && x.longitude).map(row => ({
            type: 'Feature',
            properties: {
                type: 'turn',
                standing: row.groundspeed && row.groundspeed < 50,
                coordinates: [
                    row.longitude!,
                    row.latitude!,
                ],
                color: getRowColor(row),
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
