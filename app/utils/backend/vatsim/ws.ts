import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import { createGzip } from 'node:zlib';

// @ts-expect-error Late-init
export let wss: WebSocketServer = undefined;

declare module 'ws' {
    interface WebSocket {
        failCheck?: number;
        callsign?: string;
        registerDate?: number;
    }
}

export const wssPilots: Record<string, [date: number, socket: WebSocket][]> = {};

setInterval(() => {
    if (typeof wss === 'undefined') return;
    const foundCallsigns = new Set<string>();

    wss.clients.forEach(client => {
        if (client.callsign) foundCallsigns.add(client.callsign.toString());
    });

    for (const pilot in wssPilots) {
        if (!foundCallsigns.has(pilot)) delete wssPilots[pilot];
    }
}, 1000 * 60 * 5);

export function sendWSEncodedData(data: string, ws: WebSocket) {
    return new Promise<void>(async (resolve, reject) => {
        const gzip = createGzip();
        gzip.write(data);
        gzip.end();

        const chunks: Buffer[] = [];
        gzip.on('data', chunk => {
            chunks.push(chunk);
        });

        gzip.on('end', () => {
            const compressedData = Buffer.concat(chunks);
            ws.send(compressedData);
            resolve();
        });

        gzip.on('error', reject);
    });
}

export function initWebsocket() {
    wss = new WebSocketServer({
        port: 8880,
        perMessageDeflate: false,
    });

    wss.on('connection', function connection(ws) {
        ws.on('error', console.error);
        ws.on('message', async msg => {
            const data = (msg as Buffer).toString('utf-8');

            if (data === 'alive') {
                ws.failCheck = 0;
                return;
            }

            if (!data.includes('"type"')) return;
            const json = JSON.parse(data) as { type: 'register'; callsign: string };

            if (ws.callsign) {
                if (wssPilots[ws.callsign].length === 1) delete wssPilots[ws.callsign];
                else wssPilots[ws.callsign] = wssPilots[ws.callsign].filter(x => x[0] === ws.registerDate!);
            }

            ws.callsign = json.callsign;
            wssPilots[ws.callsign] ||= [];

            ws.registerDate = Date.now();

            wssPilots[ws.callsign].push([ws.registerDate, ws]);
        });
        ws.on('close', () => {
            if (ws.callsign) {
                if (wssPilots[ws.callsign].length === 1) delete wssPilots[ws.callsign];
                else wssPilots[ws.callsign] = wssPilots[ws.callsign].filter(x => x[0] === ws.registerDate!);
            }
        });
    });
}
