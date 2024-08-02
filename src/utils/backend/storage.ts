import type { VatSpyData, VatSpyDataFeature, VatSpyDataLocalATC } from '~/types/data/vatspy';
import type {
    VatsimData,
    VatsimDivision,
    VatsimEvent, VatsimExtendedPilot,
    VatsimLiveData, VatsimLiveDataShort, VatsimMandatoryData,
    VatsimShortenedData,
    VatsimSubDivision, VatsimTransceiver,
} from '~/types/data/vatsim';
import type { VatDataVersions } from '~/types/data';
import type { MapAirport } from '~/types/map';
import type { FeatureCollection, MultiPolygon } from 'geojson';
import type { cycles } from '~/utils/backend/navigraph-db';

export type SimAwareData = FeatureCollection<MultiPolygon>;
export interface SimAwareAPIData {
    version: string;
    data: SimAwareData;
}

interface KafkaExtension {
    date: number;
    deleted: boolean;
}

export const radarStorage = {
    vatspy: {
        version: '',
        data: null as null | VatSpyData,
    },
    simaware: {
        version: '',
        data: null as null | SimAwareData,
    },
    vatsim: {
        data: null as null | VatsimData,
        regularData: null as null | VatsimShortenedData,
        mandatoryData: null as null | VatsimMandatoryData,
        extendedPilots: [] as VatsimExtendedPilot[],
        firs: [] as VatSpyDataFeature[],
        locals: [] as VatSpyDataLocalATC[],
        airports: [] as MapAirport[],
        divisions: [] as VatsimDivision[],
        subDivisions: [] as VatsimSubDivision[],
        events: [] as VatsimEvent[],
        transceivers: [] as VatsimTransceiver[],

        kafka: {
            pilots: [] as Array<Partial<VatsimData['pilots'][0]> & KafkaExtension>,
            atc: [] as Array<Partial<VatsimData['controllers'][0]> & KafkaExtension>,
            prefiles: [] as Array<Partial<VatsimData['prefiles'][0]> & KafkaExtension>,
        },
    },
    navigraph: null as null | typeof cycles,
};

export function getRadarStorage() {
    return radarStorage;
}

export function isDataReady() {
    const event = typeof tryUseNuxtApp !== 'undefined' && tryUseNuxtApp() && useRequestEvent();
    if (event) return event.context.radarStorageReady;
    return !!getRadarStorage().vatspy && !!getRadarStorage().vatsim.data && !!getRadarStorage().simaware.version;
}

export function getDataVersions(): VatDataVersions {
    return {
        vatspy: getRadarStorage().vatspy!.version,
        vatsim: {
            data: getRadarStorage().vatsim.data!.general.update_timestamp,
        },
        navigraph: getRadarStorage().navigraph,
        simaware: getRadarStorage().simaware.version,
    };
}

export function getServerVatsimLiveData(): VatsimLiveData {
    const storage = getRadarStorage();

    return {
        general: storage.vatsim.regularData!.general,
        pilots: storage.vatsim.regularData!.pilots,
        firs: storage.vatsim.firs,
        locals: storage.vatsim.locals,
        airports: storage.vatsim.airports,
        prefiles: storage.vatsim.regularData!.prefiles,
        facilities: storage.vatsim.regularData!.facilities,
        ratings: storage.vatsim.regularData!.ratings,
        pilot_ratings: storage.vatsim.regularData!.pilot_ratings,
        military_ratings: storage.vatsim.regularData!.military_ratings,
    };
}

export function getServerVatsimLiveShortData() {
    return {
        general: radarStorage.vatsim.data!.general,
        pilots: radarStorage.vatsim.regularData!.pilots,
        firs: radarStorage.vatsim.firs,
        locals: radarStorage.vatsim.locals,
        prefiles: radarStorage.vatsim.regularData!.prefiles,
        airports: radarStorage.vatsim.airports,
    } satisfies VatsimLiveDataShort;
}
