import { useStore } from '~/store';

async function decompressBlob(blob: Blob) {
    const ds = new DecompressionStream('gzip');
    const decompressedStream = blob.stream().pipeThrough(ds);
    return await new Response(decompressedStream).blob();
}

let interval: NodeJS.Timeout | undefined;
let wsRegistered: false | string = false;

export function isTabVisible() {
    const item = localStorage.getItem('radar-visibility-check');
    if (!item) return false;

    return (Date.now() - +item) < 1000 * 60 * 10;
}

export function initDataWebsocket(): () => void {
    const dataStore = useDataStore();
    clearInterval(interval);

    const url = useIsDebug() ? `ws://${ location.hostname }:8880` : `wss://${ location.hostname }/ws`;
    const websocket = new WebSocket(url);

    websocket.addEventListener('open', () => {
        console.info('WebSocket was opened', new Date().toISOString());
    });

    websocket.addEventListener('close', () => {
        console.info('WebSocket was closed', new Date().toISOString());
        wsRegistered = false;
        dataStore.vatsim.selfCoordinate.value = null;

        clearInterval(interval);
    });
    websocket.addEventListener('error', console.error);

    websocket.addEventListener('message', async event => {
        if (localStorage.getItem('radar-socket-closed')) {
            localStorage.removeItem('radar-socket-closed');
            localStorage.removeItem('radar-socket-date');
            websocket.close();
            return;
        }

        if (!isTabVisible()) {
            websocket.close();
            return;
        }

        if (event.data === 'check') {
            websocket.send('alive');
            localStorage.setItem('radar-socket-date', Date.now().toString());

            if (!wsRegistered && ownFlight.value) {
                websocket.send(JSON.stringify({
                    type: 'register',
                    callsign: ownFlight.value.callsign,
                }));
                wsRegistered = ownFlight.value.callsign;
            }

            return;
        }

        const data = await (await decompressBlob(event.data as Blob)).text();

        if (!data.includes('"type"')) return;

        // const date = new Date().toISOString();
        const json = JSON.parse(data);

        if ('type' in json) {
            if (json.type === 'update') {
                dataStore.vatsim.selfCoordinate.value = {
                    coordinate: json.coordinates,
                    heading: json.heading,
                    date: Date.now(),
                };
            }
            else if (json.type === 'updatePaused') dataStore.vatsim.selfCoordinate.value = null;

            return;
        }

        /* localStorage.setItem('radar-socket-vat-data', data);
        localStorage.setItem('radar-socket-date', Date.now().toString());

        setVatsimMandatoryData(json);
        dataStore.vatsim.data.general.value!.update_timestamp = date;
        dataStore.vatsim.updateTimestamp.value = date;*/
    });

    return () => {
        wsRegistered = false;
        dataStore.vatsim.selfCoordinate.value = null;
        websocket.close();
        clearInterval(interval);
    };
}

export function checkForWSData(isMounted: Ref<boolean>): () => void {
    const store = useStore();
    const config = useRuntimeConfig();

    let closeSocket: (() => void) | undefined;

    function checkForSocket() {
        if (store.localSettings.traffic?.disableFastUpdate || String(config.public.DISABLE_WEBSOCKETS) === 'true') return;
        const date = Date.now();
        const socketDate = localStorage.getItem('radar-socket-date');
        // 20 seconds gap for receiving data
        if (!socketDate || +socketDate + (1000 * 20) < date) {
            localStorage.setItem('radar-socket-date', Date.now().toString());
            closeSocket?.();
            if (!isTabVisible()) return;
            closeSocket = initDataWebsocket();
        }
    }

    checkForSocket();
    const interval = setInterval(checkForSocket, 5000);

    /* async function storageEvent() {
        const data = localStorage.getItem('radar-socket-vat-data');
        if (!data || !dataStore.vatsim.data.general.value) return;

        const json = JSON.parse(data);
        await setVatsimMandatoryData(json);
        dataStore.vatsim.data.general.value!.update_timestamp = new Date().toISOString();
        dataStore.vatsim.updateTimestamp.value = new Date().toISOString();
    }

    window.addEventListener('storage', storageEvent);
    onBeforeUnmount(() => {
        clearInterval(interval);
        window.removeEventListener('storage', storageEvent);
    });*/

    watch(isMounted, () => {
        closeSocket?.();
        localStorage.setItem('radar-socket-closed', '1');
        localStorage.removeItem('radar-socket-date');
        clearInterval(interval);
    });

    return () => {
        localStorage.setItem('radar-socket-closed', '1');
        localStorage.removeItem('radar-socket-date');
        clearInterval(interval);
    };
}
