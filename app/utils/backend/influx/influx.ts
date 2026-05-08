import type { QueryApi, WriteApi, WriteOptions } from '@influxdata/influxdb-client';
import { InfluxDB } from '@influxdata/influxdb-client';

export let influxDB: InfluxDB;
export let influxDBQuery: QueryApi;
export let influxDBWritePlans: WriteApi;
export let influxDBWriteMain: WriteApi;

const writeOptions: Partial<WriteOptions> = {
    batchSize: 5000,
    flushInterval: 1000,
    gzipThreshold: 1024 * 10,
    maxRetries: 3,
    maxRetryTime: 1000 * 30,
    maxBufferLines: 100_000,
    writeFailed(error, lines, attempt) {
        if (attempt === 1) {
            console.error(`Influx write failed for ${ lines.length } lines`, error);
        }
    },
    writeRetrySkipped({ lines }) {
        console.error(`Influx write retry skipped ${ lines.length } lines`);
    },
};

export function initInfluxDB() {
    try {
        influxDB = new InfluxDB({
            url: process.env.INFLUX_URL!,
            token: process.env.INFLUX_TOKEN!,
        });

        influxDBQuery = influxDB.getQueryApi(process.env.INFLUX_ORG!);
        influxDBWritePlans = influxDB.getWriteApi(process.env.INFLUX_ORG!, process.env.INFLUX_BUCKET_PLANS!, 'ms', writeOptions);
        influxDBWriteMain = influxDB.getWriteApi(process.env.INFLUX_ORG!, process.env.INFLUX_BUCKET_MAIN!, 'ms', writeOptions);
    }
    catch (e) {
        console.error(e);
    }
}
