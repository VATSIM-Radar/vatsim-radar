import type { VatSpyAPIData } from '~/types/data/vatspy';
import type { Table } from 'dexie';
import Dexie from 'dexie';
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
