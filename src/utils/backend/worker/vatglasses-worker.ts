import { defineCronJob } from '~/utils/backend';
import { getRedis } from '~/utils/backend/redis';
import { initVatglasses, updateVatglassesStateServer } from '~/utils/data/vatglasses';
import type { VatglassesActiveAirspaces, VatglassesActivePositions, VatglassesActiveRunways } from '~/utils/data/vatglasses';
import { readFileSync } from 'fs';
import { existsSync } from 'node:fs';
import { join } from 'path';
import type { VatglassesAPIData, VatsimStorage } from '../storage';
import { setupRedisDataFetch } from '~/utils/backend/tasks';

const DATA_DIR = join(process.cwd(), 'src/data');
const JSON_FILE = join(DATA_DIR, 'vatglasses.json');

export interface WorkerDataStore {
    vatsim: null | VatsimStorage;
    vatglasses: null | VatglassesAPIData;
    vatglassesActiveRunways: VatglassesActiveRunways;
    vatglassesActivePositions: VatglassesActivePositions;
    vatglassesActiveAirspaces: VatglassesActiveAirspaces;
}

const workerDataStore: WorkerDataStore = {
    vatsim: null,
    vatglasses: null,
    vatglassesActiveRunways: {},
    vatglassesActivePositions: {},
    vatglassesActiveAirspaces: {},
};

async function loadSectors() {
    if (existsSync(JSON_FILE)) {
        workerDataStore.vatglasses = JSON.parse(readFileSync(JSON_FILE, 'utf-8'));
    }
}

const redisSubscriber = getRedis();
redisSubscriber.subscribe('data');
redisSubscriber.subscribe('vatglassesData');

redisSubscriber.on('message', (channel, message) => {
    if (channel === 'data') {
        workerDataStore.vatsim = JSON.parse(message);
    }
    else if (channel === 'vatglassesData') {
        loadSectors();
    }
});

const redisPublisher = getRedis();

setupRedisDataFetch();
initVatglasses('server', workerDataStore);
await loadSectors();

let firstUpdate = true;
console.log('Worker has been set up');

async function updateVatglassesActive() {
    await updateVatglassesStateServer();

    // Loop through copiedDataStore.vatglassesActivePositions and set sectors to null. We will set the sectors in the client to avoid sending a lot of data
    const outputVatglassesActivePositions: VatglassesActivePositions = {};
    for (const countryGroupId in workerDataStore.vatglassesActivePositions) {
        const positions = workerDataStore.vatglassesActivePositions[countryGroupId];
        for (const positionId in positions) {
            if (!outputVatglassesActivePositions[countryGroupId]) outputVatglassesActivePositions[countryGroupId] = {};
            const shallowCopy = { ...positions[positionId] };
            shallowCopy.sectors = null;
            outputVatglassesActivePositions[countryGroupId][positionId] = shallowCopy;
        }
    }

    if (workerDataStore.vatglasses) {
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject('VG Failed by timeout'), 15000);
            redisPublisher.publish('vatglassesActive', JSON.stringify({
                vatglassesActiveRunways: workerDataStore.vatglassesActiveRunways,
                vatglassesActivePositions: outputVatglassesActivePositions,
                version: workerDataStore.vatglasses?.version,
            }), err => {
                clearTimeout(timeout);
                if (err) {
                    console.error(err);
                    return reject(err);
                }

                if (firstUpdate) {
                    console.log('Worker data has been updated');
                    firstUpdate = false;
                }
                resolve();
            });
        });
    }
}

// We are generating the combined data every 30 seconds. We could also call it in the redisSubscriber above every time we get new VATSIM data, but then the combine function would be way more often.
defineCronJob('*/30 * * * * *', async () => {
    await updateVatglassesActive();
});

