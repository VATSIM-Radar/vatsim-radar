import type { DBSchema, IDBPDatabase } from 'idb';
import { openDB } from 'idb';
import type { VatSpyAPIData } from '~/types/data/vatspy';
import type { SimAwareAPIData, VatglassesAPIData } from '~/utils/backend/storage';

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

interface ClientDB extends DBSchema {
    data: VatSpyData | SimAwareData | VatglassesData;
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
