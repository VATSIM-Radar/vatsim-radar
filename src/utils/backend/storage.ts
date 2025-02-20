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
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson';
import type { cycles } from '~/utils/backend/navigraph-db';
import type { PatreonInfo } from '~/server/plugins/patreon';

export type SimAwareData = FeatureCollection<MultiPolygon | Polygon>;
export interface SimAwareAPIData {
    version: string;
    data: SimAwareData;
}

export interface VatglassesSector {
    min?: number;
    max?: number;
    runways?: {
        icao: string;
        runway: string | string[];
    }[];
    points: string[][];
}
export interface VatglassesAirspace {
    id: string;
    group: string;
    docs?: string[];
    fua?: Record<string, any>[];
    owner: string[];
    sectors: VatglassesSector[];
}
export interface VatglassesData {
    [key: string]: {
        airports: {
            [key: string]: {
                pre?: string[];
                callsign: string;
                coord?: number[];
                runways?: string[];
                default?: boolean;
                topdown?: string[];
                major?: string;
                end?: {
                    [key: string]: { [key: string]: string };
                };
            };
        };
        airspace: VatglassesAirspace[];
        callsigns: {
            [key: string]: {
                [key: string]: string;
            };
        };
        groups: {
            [key: string]: {
                name: string;
            };
        };
        positions: {
            [key: string]: {
                colours?: {
                    online?: string[];
                    hex: string;
                }[];
                pre: string[];
                type: string;
                frequency?: string;
                callsign: string;
            };
        };
    };
}
export interface VatglassesAPIData {
    version: string;
    data: VatglassesData;
}

interface KafkaExtension {
    date: number;
    deleted: boolean;
}

export interface AustraliaSector {
    name: string;
    fullName: string;
    frequency: string;
    callsign: string;
}

export interface RadarDataAirline {
    icao: string;
    name: string;
    callsign: string;
    virtual: boolean;
    website?: string | null;
    virtualParsed?: boolean;
}

export type RadarDataAirlineAll = {
    airlines: RadarDataAirline[];
    virtual: RadarDataAirline[];
};

export type RadarDataAirlinesList = Record<string, RadarDataAirline>;
export type RadarDataAirlinesAllList = {
    airlines: RadarDataAirlinesList;
    virtual: RadarDataAirlinesList;
    all: RadarDataAirlinesList;
};

export interface SigmetCombined {
    id?: string | null;
    region?: string | null;
    regionName?: string | null;
    type?: string | null;
    dataType: 'sigmet' | 'airsigmet' | 'airmet' | 'gairmet';
    alphaChar?: string | null;
    hazard?: string | null;
    qualifier?: string | number | null;
    timeFrom?: string | null;
    timeTo?: string | null;
    base?: number | string | null;
    top?: number | string | null;
    dir?: string | null;
    spd?: number | null;
    change?: string | null;
    raw?: string | null;
}

export type Sigmet = Feature<Geometry, SigmetCombined>;

export type Sigmets<T = Sigmet['properties']> = FeatureCollection<Geometry, T> & { validUntil?: number };

export interface VatsimStorage {
    data: VatsimData | null;
    regularData: VatsimShortenedData | null;
    mandatoryData: VatsimMandatoryData | null;
    extendedPilots: VatsimExtendedPilot[];
    firs: VatSpyDataFeature[];
    locals: VatSpyDataLocalATC[];
    airports: MapAirport[];
    divisions: VatsimDivision[];
    subDivisions: VatsimSubDivision[];
    events: VatsimEvent[];
    transceivers: VatsimTransceiver[];
    australia: AustraliaSector[];
    kafka: {
        pilots: Array<Partial<VatsimData['pilots'][0]> & KafkaExtension>;
        atc: Array<Partial<VatsimData['controllers'][0]> & KafkaExtension>;
        prefiles: Array<Partial<VatsimData['prefiles'][0]> & KafkaExtension>;
    };
}

export interface RadarStorage {
    vatspy: {
        version: string;
        data: VatSpyData | null;
    };
    simaware: {
        version: string;
        data: SimAwareData | null;
    };
    vatglasses: {
        data: {
            version: string;
            data: VatglassesData | null;
        };
        activeData: string | null;
    };
    vatsimStatic: {
        divisions: VatsimDivision[];
        subDivisions: VatsimSubDivision[];
        events: VatsimEvent[];
    };
    vatsim: VatsimStorage;
    navigraph: typeof cycles | null;
    patreonInfo: PatreonInfo | null;
    airlines: RadarDataAirlinesAllList;
    extendedPilotsMap: { [key: string]: VatsimExtendedPilot };
}

export const radarStorage: RadarStorage = {
    vatspy: {
        version: '',
        data: null,
    },
    simaware: {
        version: '',
        data: null,
    },
    vatglasses: {
        data: {
            version: '',
            data: null,
        },
        activeData: null,
    },
    vatsimStatic: {
        divisions: [],
        subDivisions: [],
        events: [],
    },
    vatsim: {
        data: null,
        regularData: null,
        mandatoryData: null,
        extendedPilots: [],
        firs: [],
        locals: [],
        airports: [],
        divisions: [],
        subDivisions: [],
        events: [],
        transceivers: [],
        australia: [],
        kafka: {
            pilots: [],
            atc: [],
            prefiles: [],
        },
    },
    navigraph: null,
    patreonInfo: null,
    airlines: {
        airlines: {},
        virtual: {},
        all: {},
    },
    extendedPilotsMap: {},
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
        vatglasses: getRadarStorage().vatglasses.data.version,
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
