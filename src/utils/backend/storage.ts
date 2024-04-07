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

export function getRadarStorage() {
    const event = typeof tryUseNuxtApp !== 'undefined' && tryUseNuxtApp() && useRequestEvent();
    if (event) return event.context.radarStorage;
    return radarStorage;
}

export function isDataReady() {
    return !!getRadarStorage().vatspy && !!getRadarStorage().vatsim.data;
}

export function getDataVersions(): VatDataVersions {
    return {
        vatspy: getRadarStorage().vatspy!.version,
        vatsim: {
            data: getRadarStorage().vatsim.data!.general.update_timestamp,
        },
    };
}

export function getServerVatsimLiveData(): VatsimLiveData {
    const storage = getRadarStorage();

    return {
        general: storage.vatsim.regularData!.general,
        pilots: storage.vatsim.regularData!.pilots,
        firs: storage.vatsim.firs,
        locals: storage.vatsim.locals,
        prefiles: storage.vatsim.regularData!.prefiles,
        facilities: storage.vatsim.regularData!.facilities,
        ratings: storage.vatsim.regularData!.ratings,
        pilot_ratings: storage.vatsim.regularData!.pilot_ratings,
        military_ratings: storage.vatsim.regularData!.military_ratings,
    };
}
