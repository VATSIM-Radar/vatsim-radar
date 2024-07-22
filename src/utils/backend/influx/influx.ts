import type { QueryApi, WriteApi } from '@influxdata/influxdb-client';
import { InfluxDB } from '@influxdata/influxdb-client';

export let influxDB: QueryApi;
export let influxDBWrite: WriteApi;

export function initInfluxDB() {
    const config = useRuntimeConfig();

    const client = new InfluxDB({
        url: config.INFLUX_URL,
        token: config.INFLUX_TOKEN,
    });

    influxDB = client.getQueryApi(config.INFLUX_ORG);
    influxDBWrite = client.getWriteApi(config.INFLUX_ORG, config.INFLUX_BUCKET_PLANS);
}

