import type { VatSpyData, VatSpyDataFeature, VatSpyDataLocalATC } from '~/types/data/vatspy';
import type {
    VatsimData,
    VatsimDivision,
    VatsimEvent, VatsimLiveData,
    VatsimShortenedData,
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
        regularData: null as null | VatsimShortenedData,
        firs: [] as VatSpyDataFeature[],
        locals: [] as VatSpyDataLocalATC[],
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

export function getServerVatsimLiveData(): VatsimLiveData {
    return {
        general: radarStorage.vatsim.regularData!.general,
        pilots: radarStorage.vatsim.regularData!.pilots,
        firs: radarStorage.vatsim.firs,
        locals: radarStorage.vatsim.locals,
        prefiles: radarStorage.vatsim.regularData!.prefiles,
        facilities: radarStorage.vatsim.regularData!.facilities,
        ratings: radarStorage.vatsim.regularData!.ratings,
        pilot_ratings: radarStorage.vatsim.regularData!.pilot_ratings,
        military_ratings: radarStorage.vatsim.regularData!.military_ratings,
    };
}
