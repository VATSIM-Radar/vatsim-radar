import type { VatSpyData } from '~/types/data/vatspy';
import type {
    VatsimData,
    VatsimDivision,
    VatsimEvent,
    VatsimRegularData,
    VatsimSubDivision,
} from '~/types/data/vatsim';
import type { VatDataVersions } from '~/types/data';

export const radarStorage = {
    vatspy: {
        version: '',
        data: null as null | VatSpyData,
    },
    vatsim: {
        data: null as null | VatsimData,
        regularData: null as null | VatsimRegularData,
        divisions: [] as VatsimDivision[],
        subDivisions: [] as VatsimSubDivision[],
        events: [] as VatsimEvent[],
    },
};

export function isDataReady() {
    return !!radarStorage.vatspy && !!radarStorage.vatsim.data;
}

export function getDataVersions(): VatDataVersions {
    return {
        vatspy: radarStorage.vatspy!.version,
        vatsim: {
            data: radarStorage.vatsim.data!.general.update_timestamp,
        },
    };
}
