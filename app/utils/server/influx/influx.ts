import type { WriteOptions } from '@influxdata/influxdb3-client';
import { InfluxDBClient } from '@influxdata/influxdb3-client';

export let influxDB: InfluxDBClient;
export let influxDBQuery: InfluxDBClient;

export const influxDBWriteOptions: Partial<WriteOptions> = {
    precision: 'ms',
    gzipThreshold: 1024 * 10,
    useV2Api: false,
};

export function initInfluxDB() {
    try {
        if (!process.env.INFLUX_URL || !process.env.INFLUX_TOKEN) return;

        influxDB = new InfluxDBClient({
            host: process.env.INFLUX_URL,
            token: process.env.INFLUX_TOKEN!,
            authScheme: 'Bearer',
            writeTimeout: 1000 * 30,
            queryTimeout: 1000 * 60,
        });

        influxDBQuery = influxDB;
    }
    catch (e) {
        console.error(e);
    }
}
