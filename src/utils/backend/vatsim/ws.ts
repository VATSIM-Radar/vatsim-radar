import { WebSocketServer } from 'ws';
import { createGzip } from 'node:zlib';
import { getServerVatsimLiveShortData } from '~/utils/backend/storage';
import {
    getInfluxFlightsForCid,
    getInfluxOnlineFlightTurns,
    getInfluxOnlineFlightTurnsGeojson,
} from '~/utils/backend/influx';

export const wss = new WebSocketServer({
    port: 8880,
    perMessageDeflate: {
        zlibDeflateOptions: {
            // See zlib defaults.
            chunkSize: 1024,
            memLevel: 7,
            level: 3,
        },
        zlibInflateOptions: {
            chunkSize: 10 * 1024,
        },
        threshold: 1024,
    },
});

function heartbeat(this: any) {
    this.isAlive = true;
}

wss.on('connection', function connection(ws) {
    // @ts-expect-error From doc but not in types
    ws.isAlive = true;
    ws.on('error', console.error);
    ws.on('pong', heartbeat);
    ws.on('message', async msg => {
        const data = (msg as Buffer).toString('utf-8');
        if (!data.includes('"type"')) return;
        const json = JSON.parse(data) as { type: 'turns'; cid: number };

        const gzip = createGzip();
        gzip.write(JSON.stringify({
            type: 'turns',
            cid: json.cid,
            data: await getInfluxOnlineFlightTurnsGeojson(json.cid.toString()),
        }));
        gzip.end();

        const chunks: Buffer[] = [];
        gzip.on('data', chunk => {
            chunks.push(chunk);
        });

        gzip.on('end', () => {
            const compressedData = Buffer.concat(chunks);
            ws.send(compressedData);
        });
    });
});

const interval = setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
        // @ts-expect-error From doc but not in types
        if (ws.isAlive === false) return ws.terminate();

        // @ts-expect-error From doc but not in types
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', function close() {
    clearInterval(interval);
});
