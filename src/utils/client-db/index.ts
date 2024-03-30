import type { DBSchema, IDBPDatabase } from 'idb';
import { openDB } from 'idb';
import type { VatSpyAPIData } from '~/types/data/vatspy';

interface ClientDB extends DBSchema {
    vatspy: {
        key: string,
        value: VatSpyAPIData
    };
}

// eslint-disable-next-line import/no-mutable-exports
export let clientDB: IDBPDatabase<ClientDB> = undefined as any;

export async function initClientDB() {
    clientDB = await openDB<ClientDB>('vatsim-radar', 1, {
        upgrade(db) {
            db.createObjectStore('vatspy');
        },
    });
}
