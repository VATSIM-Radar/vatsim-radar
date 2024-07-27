import { WebSocketServer } from 'ws';
import { createGzip } from 'node:zlib';
import { getInfluxOnlineFlightTurnsGeojson } from '~/utils/backend/influx/converters';

if (typeof process?.send === 'undefined') throw new Error('Websocket should only be imported in our child process');

export const wss = new WebSocketServer({
    port: 8880,
    perMessageDeflate: false,
});

wss.on('connection', function connection(ws) {
    ws.on('error', console.error);
    ws.on('message', async msg => {
        const data = (msg as Buffer).toString('utf-8');

        if (data === 'alive') {
            // @ts-expect-error non-standard type
            ws.failCheck = 0;
            return;
        }

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
