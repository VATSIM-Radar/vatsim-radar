import type { GenericFeature } from '@yandex/ymaps3-types/common/types/geojson';
import type { LngLat } from '@yandex/ymaps3-types/common/types';

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
        country: string
        code: string
        callsign?: string
    }[];
    airports: {
        icao: string
        name: string
        lat: number
        lon: number
        iata?: string
        fir?: string
        isPseudo: boolean
    }[];
    firs: {
        icao: string
        name: string
        callsign?: string
        boundary?: string
        isOceanic: boolean
        lon: number
        lat: number
        region: string
        division: string
        feature: GenericFeature<LngLat>
    }[];
    uirs: {
        icao: string
        name: string
        firs: string
    }[];
}

export interface VatSpyDataFeature {
    icao?: string;
    name?: string;
    firs: VatSpyData['firs'];
}
