import type { QueryApi } from '@influxdata/influxdb-client';
import { InfluxDB } from '@influxdata/influxdb-client';

export let influxDB: InfluxDB;
export let influxDBQuery: QueryApi;

export function initInfluxDB() {
    const config = useRuntimeConfig();

    influxDB = new InfluxDB({
        url: config.INFLUX_URL,
        token: config.INFLUX_TOKEN,
    });

    influxDBQuery = influxDB.getQueryApi(config.INFLUX_ORG);
}

