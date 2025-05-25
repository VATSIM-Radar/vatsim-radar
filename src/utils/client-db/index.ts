import type { DBSchema, IDBPDatabase } from 'idb';
import { openDB } from 'idb';
import type { VatSpyAPIData } from '~/types/data/vatspy';
import type {
    RadarDataAirlinesAllList,
    SimAwareAPIData,
    VatglassesAPIData,
} from '~/utils/backend/storage';

import type {
    NavDataProcedure, NavigraphNavDataApproach, NavigraphNavDataApproachShort,
    NavigraphNavDataShort, NavigraphNavDataStar,
    NavigraphNavDataStarShort,
} from '~/utils/backend/navigraph/navdata/types';
import type { PartialRecord } from '~/types';
import type { NavigraphDataAirportKeys } from '~/composables/navigraph';

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

export type ClientNavigraphData = Omit<Required<NavigraphNavDataShort>, 'stars' | 'sids' | 'approaches'>;

export interface IDBNavigraphData {
    key: 'navigraph';
    value: {
        version: string;
        data: ClientNavigraphData;
    };
}

export type IDBNavigraphProcedures = {
    sids: Array<(NavigraphNavDataStarShort & { procedure?: NavDataProcedure<NavigraphNavDataStar> })>;
    stars: Array<(NavigraphNavDataStarShort & { procedure?: NavDataProcedure<NavigraphNavDataStar> })>;
    approaches: Array<(NavigraphNavDataApproachShort & { procedure?: NavDataProcedure<NavigraphNavDataApproach> })>;
};

interface ClientDB extends DBSchema {
    data: VatSpyData | SimAwareData | VatglassesData | IDBAirlinesData | IDBNavigraphData;
    navigraphAirports: {
        key: string;
        value: IDBNavigraphProcedures;
    };
}

export let clientDB: IDBPDatabase<ClientDB> = undefined as any;

export async function initClientDB() {
    if (clientDB) return;
    clientDB = await openDB<ClientDB>('vatsim-radar', 3, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('data')) {
                db.createObjectStore('data');
            }

            if (!db.objectStoreNames.contains('navigraphAirports')) {
                db.createObjectStore('navigraphAirports');
            }

            // @ts-expect-error Legacy db version
            if (db.objectStoreNames.contains('vatspy')) {
                // @ts-expect-error Legacy db version
                db.deleteObjectStore('vatspy');
            }
        },
    });
}
