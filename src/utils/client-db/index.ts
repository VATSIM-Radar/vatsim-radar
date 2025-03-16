import type { DBSchema, IDBPDatabase } from 'idb';
import { openDB } from 'idb';
import type { VatSpyAPIData } from '~/types/data/vatspy';
import type {
    RadarDataAirlinesAllList,
    SimAwareAPIData,
    VatglassesAPIData,
} from '~/utils/backend/storage';
import type { NavigraphNavDataShort } from '~/utils/backend/navigraph/navdata';

interface VatSpyData {
    key: 'vatspy';
    value: VatSpyAPIData;
}

interface SimAwareData {
    key: 'simaware';
    value: SimAwareAPIData;
}

interface VatglassesData {
    key: 'vatglasses';
    value: VatglassesAPIData;
}

export interface IDBAirlinesData {
    key: 'airlines';
    value: {
        expireDate: number;
        airlines: RadarDataAirlinesAllList;
    };
}

export interface IDBNavigraphData {
    key: 'navigraph';
    value: {
        version: string;
        data: NavigraphNavDataShort;
    };
}

interface ClientDB extends DBSchema {
    data: VatSpyData | SimAwareData | VatglassesData | IDBAirlinesData | IDBNavigraphData;
}

export let clientDB: IDBPDatabase<ClientDB> = undefined as any;

export async function initClientDB() {
    if (clientDB) return;
    clientDB = await openDB<ClientDB>('vatsim-radar', 2, {
        upgrade(db) {
            db.createObjectStore('data');

            // @ts-expect-error Legacy db version
            if (db.objectStoreNames.contains('vatspy')) {
                // @ts-expect-error Legacy db version
                db.deleteObjectStore('vatspy');
            }
        },
    });
}
