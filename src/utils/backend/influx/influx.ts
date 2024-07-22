import type { QueryApi, WriteApi } from '@influxdata/influxdb-client';
import { InfluxDB } from '@influxdata/influxdb-client';

export let influxDB: InfluxDB;
export let influxDBQuery: QueryApi;
export let influxDBWrite: WriteApi;

export function initInfluxDB() {
    const config = useRuntimeConfig();

    influxDB = new InfluxDB({
        url: config.INFLUX_URL,
        token: config.INFLUX_TOKEN,
    });

    influxDBQuery = influxDB.getQueryApi(config.INFLUX_ORG);
    influxDBWrite = influxDB.getWriteApi(config.INFLUX_ORG, config.INFLUX_BUCKET_PLANS);
}

