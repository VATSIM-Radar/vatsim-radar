import type {VatSpyAPIData} from '~/types/data/vatspy';
import type {Table} from 'dexie';
import Dexie from 'dexie';
import type {RadarDataAirlinesAllList, SimAwareAPIData, VatglassesAPIData,} from '~/utils/server/storage';

import type {
    NavDataProcedure,
    NavigraphNavDataApproach,
    NavigraphNavDataApproachShort,
    NavigraphNavDataShort,
    NavigraphNavDataStar,
    NavigraphNavDataStarShort,
} from '~/utils/server/navigraph/navdata/types';

export interface IDBAirlinesData {
    expireDate: number;
    airlines: RadarDataAirlinesAllList;
}

export type ClientNavigraphData = Omit<Required<NavigraphNavDataShort>, 'stars' | 'sids' | 'approaches'>;

export type IDBNavigraphProcedures = {
    sids: Array<(NavigraphNavDataStarShort & { procedure?: NavDataProcedure<NavigraphNavDataStar> })>;
    stars: Array<(NavigraphNavDataStarShort & { procedure?: NavDataProcedure<NavigraphNavDataStar> })>;
    approaches: Array<(NavigraphNavDataApproachShort & { procedure?: NavDataProcedure<NavigraphNavDataApproach> })>;
};

class VatsimRadarDB extends Dexie {
    data!: Table<VatSpyAPIData | SimAwareAPIData | VatglassesAPIData | IDBAirlinesData, string>;

    navigraphAirports!: Table<IDBNavigraphProcedures, string>;

    navigraphData!: Table<ClientNavigraphData[keyof ClientNavigraphData] | string, keyof ClientNavigraphData | 'version' | 'inserted'>;

    navigraphDB!: Table<NavigraphNavDataShort['vhf'] | NavigraphNavDataShort['ndb'] | NavigraphNavDataShort['airways'] | NavigraphNavDataShort['waypoints'], string>;
}

export let clientDB: VatsimRadarDB = undefined as any;

export async function initClientDB() {
    if (clientDB) return clientDB;
    indexedDB.deleteDatabase('vatsim-radar');
    const db = new VatsimRadarDB('vatsim-radar-db');

    db.version(1)
        .stores({
            data: '',
            navigraphAirports: '',
            navigraphData: '',
            navigraphDB: '',
        });

    await db.open();
    clientDB = db;
    return db;
}

export function initIDBData<T>(getFunction: () => Promise<T>): () => Promise<T> {
    let previousRequest = 0;
    let interval: NodeJS.Timeout | null = null;
    let data: T | null = null;
    let gettingData = false;

    return async function () {
        if (typeof window === 'undefined') throw new Error('Server interval set');

        if (gettingData) {
            return new Promise<T>((resolve, reject) => {
                const interval = setInterval(() => {
                    if (gettingData) return;
                    resolve(data!);
                    clearInterval(interval);
                }, 1000);
            });
        }

        previousRequest = Date.now();

        if (!interval) {
            interval = setInterval(() => {
                // For GC
                if (data && Date.now() - previousRequest > 1000 * 15) {
                    data = null;
                }
            }, 1000);
        }

        if (data) return data;

        gettingData = true;

        try {
            data = await getFunction();

            gettingData = false;

            return data;
        } catch (e) {
            gettingData = false;

            throw e;
        }
    };
}