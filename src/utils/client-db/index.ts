import type { DBSchema, IDBPDatabase } from 'idb';
import { openDB } from 'idb';
import type { VatSpyAPIData } from '~/types/data/vatspy';

interface ClientDB extends DBSchema {
    vatspy: {
        key: string,
        value: VatSpyAPIData
    };
}

export let clientDB: IDBPDatabase<ClientDB> = undefined as any;

export async function initClientDB() {
    if (clientDB) return;
    clientDB = await openDB<ClientDB>('vatsim-radar', 1, {
        upgrade(db) {
            db.createObjectStore('vatspy');
        },
    });
}
