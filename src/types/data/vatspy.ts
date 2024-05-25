import type { VatsimShortenedController } from '~/types/data/vatsim';
import type { Feature, MultiPolygon } from 'geojson';

export interface VatSpyResponse {
    current_commit_hash: string;
    fir_boundaries_dat_url: string;
    fir_boundaries_geojson_url: string;
    vatspy_dat_url: string;
}

export interface VatSpyAPIData {
    version: string;
    data: VatSpyData;
}

export interface VatSpyData {
    id: string;
    countries: {
        country: string;
        code: string;
        callsign?: string;
    }[];
    airports: {
        icao: string;
        name: string;
        lat: number;
        lon: number;
        iata?: string;
        fir?: string;
        isPseudo: boolean;
        isIata?: boolean;
        isSimAware?: boolean;
    }[];
    firs: {
        icao: string;
        name: string;
        callsign?: string;
        boundary?: string;
        isOceanic: boolean;
        lon: number;
        lat: number;
        region: string;
        division: string;
        feature: Feature<MultiPolygon>;
    }[];
    uirs: {
        icao: string;
        name: string;
        firs: string;
    }[];
}

export interface VatSpyDataFeature {
    icao?: string;
    name?: string;
    controller: VatsimShortenedController;
    firs: {
        icao: string;
        callsign?: string;
        boundaryId: string;
    }[];
}

export interface VatSpyDataLocalATC {
    atc: VatsimShortenedController;
    isATIS: boolean;
    airport: {
        icao: string;
        iata?: string;
        isPseudo: boolean;
        isSimAware: boolean;
    };
}
