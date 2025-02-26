import { defineCronJob } from '~/utils/backend';
import { getRedis } from '~/utils/backend/redis';
import { initVatglasses, updateVatglassesStateServer } from '~/utils/data/vatglasses';
import type { VatglassesActiveAirspaces, VatglassesActivePositions, VatglassesActiveRunways } from '~/utils/data/vatglasses';
import { setupRedisDataFetch } from '~/utils/backend/tasks';
import { radarStorage } from '~/utils/backend/storage';

export interface WorkerDataStore {
    vatglassesActiveRunways: VatglassesActiveRunways;
    vatglassesActivePositions: VatglassesActivePositions;
    vatglassesActiveAirspaces: VatglassesActiveAirspaces;
}

const workerDataStore: WorkerDataStore = {
    vatglassesActiveRunways: {},
    vatglassesActivePositions: {},
    vatglassesActiveAirspaces: {},
};

const redisSubscriber = getRedis();
redisSubscriber.subscribe('data');

redisSubscriber.on('message', (channel, message) => {
    if (channel === 'data') {
        radarStorage.vatsim = JSON.parse(message);
    }
});

const redisPublisher = getRedis();

await setupRedisDataFetch();
await initVatglasses('server', workerDataStore, radarStorage);

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

    if (radarStorage.vatglasses) {
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject('VG Failed by timeout'), 15000);
            redisPublisher.publish('vatglassesActive', JSON.stringify({
                vatglassesActiveRunways: workerDataStore.vatglassesActiveRunways,
                vatglassesActivePositions: outputVatglassesActivePositions,
                version: radarStorage.vatglasses?.data.version,
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

