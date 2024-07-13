import { WebSocketServer } from 'ws';

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
