import type { QueryApi, WriteApi } from '@influxdata/influxdb-client';
import { InfluxDB } from '@influxdata/influxdb-client';

export let influxDB: InfluxDB;
export let influxDBQuery: QueryApi;
export let influxDBWritePlans: WriteApi;
export let influxDBWriteMain: WriteApi;

export function initInfluxDB() {
    try {
        influxDB = new InfluxDB({
            url: process.env.INFLUX_URL!,
            token: process.env.INFLUX_TOKEN!,
        });

        influxDBQuery = influxDB.getQueryApi(process.env.INFLUX_ORG!);
        influxDBWritePlans = influxDB.getWriteApi(process.env.INFLUX_ORG!, process.env.INFLUX_BUCKET_PLANS!);
        influxDBWriteMain = influxDB.getWriteApi(process.env.INFLUX_ORG!, process.env.INFLUX_BUCKET_MAIN!);
    }
    catch (e) {
        console.error(e);
    }
}

