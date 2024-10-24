import { CronJob } from 'cron';
// import { getServerVatsimLiveData, radarStorage } from '../storage';
import { getRedis } from '~/utils/backend/redis';
// import type { VatglassesAPIData } from '~/utils/backend/storage';
// import type { ActiveVatglassesPositions, ActiveVatglassesRunways } from '~/utils/data/vatglasses';
import { initVatglasses, updateVatglassesStateServer } from '~/utils/data/vatglasses';
import type { ActiveVatglassesAirspaces, ActiveVatglassesPositions, ActiveVatglassesRunways } from '~/utils/data/vatglasses';

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fromServerLonLat } from '~/utils/backend/vatsim/index';
import type { VatglassesAPIData, VatsimStorage } from '../storage';

export interface WorkerDataStore {
    vatsim: null | VatsimStorage;
    vatglasses: null | VatglassesAPIData;
    vatglassesActiveRunways: ActiveVatglassesRunways;
    vatglassesActivePositions: ActiveVatglassesPositions;
    vatglassesActiveAirspaces: ActiveVatglassesAirspaces;
}

const workerDataStore: WorkerDataStore = {
    vatsim: null,
    vatglasses: null,
    vatglassesActiveRunways: {},
    vatglassesActivePositions: {},
    vatglassesActiveAirspaces: {},
};
initVatglasses('server', workerDataStore);


let jsonData = {};
async function loadSectors() {
    try {
        // const response = await ofetch('./data.json');
        // jsonData = response;
        // console.log('Loaded JSON data:', jsonData);
        // const filename = fileURLToPath(import.meta.url);
        // const __dirname = dirname(__filename);

        const filePath = join('E:\\AeroNav\\vatsim-radarF\\.nuxt\\dev', 'data.json'); // Adjust the path as needed
        const fileContent = await fs.readFile(filePath, 'utf8');
        jsonData = JSON.parse(fileContent);
        const json = jsonData;

        // @ts-expect-error: only temporary code
        workerDataStore.vatglasses = json;

        // Loop through all keys in the data object and convert coordinates
        // @ts-expect-error: only temporary code
        Object.keys(json.data).forEach(key => {
            // @ts-expect-error: only temporary code
            const countryGroup = json.data[key];
            // @ts-expect-error: only temporary code
            countryGroup.airspace.forEach(airspace => {
                // @ts-expect-error: only temporary code
                airspace.sectors.forEach(sector => {
                    // @ts-expect-error: only temporary code
                    sector.points = sector.points.map(point => {
                        const [lat, lon] = point;
                        return fromServerLonLat([convertToDecimalDegrees(lon), convertToDecimalDegrees(lat)]);
                    });
                });
            });
        });
    }
    catch (error) {
        console.error('Error loading sectors:', error);
    }
}
await loadSectors();


function convertToDecimalDegrees(coordinate: string): number {
    const isNegative = coordinate.startsWith('-');
    const absCoordinate = isNegative ? coordinate.slice(1) : coordinate;

    const degrees = parseInt(absCoordinate.slice(0, -4), 10);
    const minutes = parseInt(absCoordinate.slice(-4, -2), 10);
    const seconds = parseInt(absCoordinate.slice(-2), 10);

    let decimalDegrees = degrees + (minutes / 60) + (seconds / 3600);
    if (isNegative) {
        decimalDegrees = -decimalDegrees;
    }

    return parseFloat(decimalDegrees.toFixed(7));
}


const redisSubscriber = getRedis();
redisSubscriber.subscribe('data');
redisSubscriber.on('message', (_, message) => {
    workerDataStore.vatsim = JSON.parse(message);
});

const redisPublisher = getRedis();

CronJob.from({
    cronTime: '*/5 * * * * *',
    runOnInit: true,
    start: true,
    onTick: async () => {
        await updateVatglassesStateServer();
        console.log('Updated VATGlasses state');

        // Loop through copiedDataStore.vatglassesActivePositions and set sectors to null. We will set the sectors in the client to avoid sending a lot of data
        const outputVatglassesActivePositions: ActiveVatglassesPositions = {};
        for (const countryGroupId in workerDataStore.vatglassesActivePositions) {
            const positions = workerDataStore.vatglassesActivePositions[countryGroupId];
            for (const positionId in positions) {
                if (!outputVatglassesActivePositions[countryGroupId]) outputVatglassesActivePositions[countryGroupId] = {};
                const shallowCopy = { ...positions[positionId] };
                shallowCopy.sectors = null;
                outputVatglassesActivePositions[countryGroupId][positionId] = shallowCopy;
            }
        }

        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject('Failed by timeout'), 5000);
            redisPublisher.publish('vatglassesActive', JSON.stringify({
                vatglassesActiveRunways: workerDataStore.vatglassesActiveRunways,
                vatglassesActivePositions: outputVatglassesActivePositions,
                // vatglassesActiveAirspaces: workerDataStore.vatglassesActiveAirspaces,
            }), err => {
                clearTimeout(timeout);
                if (err) return reject(err);
                resolve();
            });
        });
    },
});

/*
redis.publish('data', JSON.stringify(radarStorage.vatsim), err => {
    clearTimeout(timeout);
    if (err) return reject(err);
    resolve();
});
*/
