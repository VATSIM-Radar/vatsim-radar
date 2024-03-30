import type { DBSchema, IDBPDatabase } from 'idb';
import { openDB } from 'idb';
import type { VatSpyAPIData, VatSpyData } from '~/types/data/vatspy';

interface ClientDB extends DBSchema {
    vatspy: {
        key: string,
        value: VatSpyAPIData
    };
}

export const clientDB = import.meta.server
    ? null as unknown as IDBPDatabase<ClientDB>
    : await openDB<ClientDB>('vatsim-radar', 1, {
        upgrade(db) {
            db.createObjectStore('vatspy');
        },
    });
