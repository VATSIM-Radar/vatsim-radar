import type { WriteOptions } from '@influxdata/influxdb3-client';
import { InfluxDBClient } from '@influxdata/influxdb3-client';

export let influxDB: InfluxDBClient;
export let influxDBQuery: InfluxDBClient;
export let influxDBWritePlans: InfluxWriteApi;
export let influxDBWriteMain: InfluxWriteApi;

const batchSize = 5000;
const writeOptions: Partial<WriteOptions> = {
    precision: 'ms',
    gzipThreshold: 1024 * 10,
    useV2Api: false,
};

export class InfluxWriteApi {
    private buffer: string[] = [];

    private flushTimer: ReturnType<typeof setTimeout> | undefined;

    private flushPromise: Promise<void> = Promise.resolve();

    constructor(private readonly client: InfluxDBClient, private readonly database: string) {}

    writeRecords(lines: string[]) {
        if (!lines.length) return;

        this.buffer.push(...lines);

        if (this.buffer.length > 100000) {
            const skipped = this.buffer.length - 100000;
            this.buffer.splice(0, skipped);
            console.error(`Influx write retry skipped ${ skipped } lines`);
        }

        if (this.buffer.length >= batchSize) {
            this.flush();
        }
        else this.scheduleFlush();
    }

    private scheduleFlush() {
        if (this.flushTimer) return;

        this.flushTimer = setTimeout(() => {
            this.flushTimer = undefined;
            this.flush();
        }, 1000);
    }

    private flush() {
        const lines = this.buffer.splice(0, batchSize);
        if (!lines.length) return;

        this.flushPromise = this.flushPromise
            .then(() => this.writeWithRetry(lines))
            .catch(error => console.error(`Influx write failed for ${ lines.length } lines`, error));
    }

    private async writeWithRetry(lines: string[], attempt = 1): Promise<void> {
        try {
            await this.client.write(lines, this.database, undefined, writeOptions);
        }
        catch (error) {
            if (attempt >= 3) throw error;

            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            return this.writeWithRetry(lines, attempt + 1);
        }
    }
}

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

        if (process.env.INFLUX_BUCKET_PLANS) {
            influxDBWritePlans = new InfluxWriteApi(influxDB, process.env.INFLUX_BUCKET_PLANS);
        }

        if (process.env.INFLUX_BUCKET_MAIN) {
            influxDBWriteMain = new InfluxWriteApi(influxDB, process.env.INFLUX_BUCKET_MAIN);
        }
    }
    catch (e) {
        console.error(e);
    }
}
