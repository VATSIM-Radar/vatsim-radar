import type { Feature as TurfFeature, Polygon as TurfPolygon } from 'geojson';
import type {
    VatglassesAirspace,
} from '~/utils/server/storage.js';
import type { VatsimShortenedController } from '~/types/data/vatsim';
import { computed } from 'vue';

export interface VatglassesActivePosition {
    atc: VatsimShortenedController[];
    sectors: TurfFeature<TurfPolygon, VatglassesSectorProperties>[] | null;
    sectorsCombined: TurfFeature<TurfPolygon, VatglassesSectorProperties>[] | null;
    activeRunway: string | null;
    airspaceKeys: string | null;
    lastUpdated: string | null;
}
export interface VatglassesActivePositions {
    [countryGroupId: string]: {
        [vatglassesPositionId: string]: VatglassesActivePosition;
    };
}

export interface VatglassesAirportRunways {
    active: string; potential: string[];
}

export interface VatglassesActiveRunways {
    [icao: string]: VatglassesAirportRunways;
}

export interface VatglassesActiveAirspaces {
    [countryGroupId: string]: { [vatglassesPositionId: string]: { [index: string]: VatglassesAirspace } };
}

export interface VatglassesSectorProperties {
    min: number;
    max: number;
    countryGroupId: string;
    altrange?: number[][];
    vatglassesPositionId: string;
    atc: VatsimShortenedController[];
    colour: string;
    type: 'vatglasses';
}

const _isVatGlassesActive = () => computed(() => {
    if (typeof window === 'undefined') return false;

    const store = useNuxtApp().$pinia.state.value.index;
    if (store.bookingOverride) return false;
    const dataStore = useDataStore();
    const mapStore = useMapStore();

    const isAuto = store.mapSettings.vatglasses?.autoEnable !== false;

    if (store.mapSettings.vatglasses?.active) return true;

    if (isAuto) {
        if (store.user) {
            return dataStore.vatsim.data.pilots.value.some(x => x.cid === +store.user!.cid || x.cid === mapStore.selectedCid);
        }
    }

    return false;
});

export const isVatGlassesActive = _isVatGlassesActive();
