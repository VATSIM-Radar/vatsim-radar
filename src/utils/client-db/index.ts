import type { DBSchema, IDBPDatabase } from 'idb';
import { openDB } from 'idb';
import type { VatSpyAPIData } from '~/types/data/vatspy';
import type {
    RadarDataAirlinesList,
    SimAwareAPIData,
    VatglassesAPIData,
} from '~/utils/backend/storage';

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
        expiresAt: number;
        airlines: RadarDataAirlinesList;
    };
}

interface ClientDB extends DBSchema {
    data: VatSpyData | SimAwareData | VatglassesData | IDBAirlinesData;
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
