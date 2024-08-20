import { useStore } from '~/store';
import { setVatsimMandatoryData } from '~/composables/data';

async function decompressBlob(blob: Blob) {
    const ds = new DecompressionStream('gzip');
    const decompressedStream = blob.stream().pipeThrough(ds);
    return await new Response(decompressedStream).blob();
}

let interval: NodeJS.Timeout | undefined;

export function initDataWebsocket(): () => void {
    // const dataStore = useDataStore();
    clearInterval(interval);

    const url = import.meta.dev ? `ws://${ location.hostname }:8880` : `wss://${ location.hostname }/ws`;
    const websocket = new WebSocket(url);
    const localStorageItems = { ...localStorage };

    localStorage.removeItem('turns');

    for (const [key] of Object.entries(localStorageItems)) {
        if (key.startsWith('turns-')) localStorage.removeItem(key);
    }

    interval = setInterval(() => {
        const turns = localStorage.getItem('turns');
        if (!turns) return;
        const turnsData = new Set<number>(JSON.parse(turns) satisfies number[]);
        turnsData.forEach(cid => websocket.send(JSON.stringify({
            type: 'turns',
            cid,
        })));
    }, 2000);

    websocket.addEventListener('open', () => {
        console.info('WebSocket was opened');
    });

    websocket.addEventListener('close', () => {
        console.info('WebSocket was closed');
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

        const data = await (await decompressBlob(event.data as Blob)).text();

        // const date = new Date().toISOString();
        const json = JSON.parse(data);

        if ('type' in json) {
            if (json.type === 'turns') {
                localStorage.setItem(`turns-${ json.cid }`, JSON.stringify(json.data));
            }

            return;
        }
        else {
            websocket.send('alive');
        }

        /* localStorage.setItem('radar-socket-vat-data', data);
        localStorage.setItem('radar-socket-date', Date.now().toString());

        setVatsimMandatoryData(json);
        dataStore.vatsim.data.general.value!.update_timestamp = date;
        dataStore.vatsim.updateTimestamp.value = date;*/
    });

    return () => {
        websocket.close();
        clearInterval(interval);
    };
}

export function checkForWSData(isMounted: Ref<boolean>): () => void {
    const store = useStore();
    const dataStore = useDataStore();
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
            closeSocket = initDataWebsocket();
        }
    }

    checkForSocket();
    const interval = setInterval(checkForSocket, 5000);

    async function storageEvent() {
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
    });

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
