import { computed, shallowRef, toValue, watch } from 'vue';
import type { MaybeRef } from 'vue';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import { useDataStore } from '~/composables/render/storage';
import type { VatsimShortenedAircraft } from '~/types/data/vatsim';
import { getTraconPrefixes, getTraconSuffix } from '~/utils/shared/vatsim';
import { isPilotOnGround } from '~/composables/vatsim/pilots';

type BoundaryFeature = Feature<Polygon | MultiPolygon>;

async function resolveFirPolygons(callsign: string): Promise<BoundaryFeature[]> {
    const data = useDataStore().vatspy.value?.data;
    if (!data) return [];

    const isFss = callsign.endsWith('_FSS');
    let bestLength = 0;
    let out: BoundaryFeature[] = [];

    for (const fir of data.firs) {
        const prefix = [fir.callsign, fir.icao].filter((value): value is string => !!value).find(value => callsign.startsWith(value));
        if (!prefix) continue;

        const features = await useDataStore().vatspyBoundary(fir.boundary);
        if (!features?.length) continue;

        if (prefix.length < bestLength) continue;
        if (prefix.length > bestLength) {
            bestLength = prefix.length;
            out = [];
        }

        const feature = features.length === 1
            ? features[0]
            : features.find(item => item.properties.oceanic === isFss) ?? features[0];
        out.push(feature as BoundaryFeature);
    }

    return out;
}

async function resolveTraconPolygons(callsign: string): Promise<BoundaryFeature[]> {
    const prefix = callsign.split('_')[0];
    const features = await useDataStore().simaware(prefix);
    if (!features?.length) return [];

    return features.filter(feature => {
        const suffix = getTraconSuffix(feature);
        if (suffix && !callsign.endsWith(suffix)) return false;
        return getTraconPrefixes(feature).some(value => callsign.startsWith(value));
    }) as BoundaryFeature[];
}

export interface UseEnrouteAircraftOptions {
    callsign: MaybeRef<string | null | undefined>;
    flFrom?: MaybeRef<number | null | undefined>;
    flTo?: MaybeRef<number | null | undefined>;
}

export function useEnrouteAircraft(options: UseEnrouteAircraftOptions) {
    const dataStore = useDataStore();

    const callsign = computed(() => toValue(options.callsign)?.toUpperCase().trim() || null);
    const firPolygons = shallowRef<BoundaryFeature[]>([]);
    const traconPolygons = shallowRef<BoundaryFeature[]>([]);
    watch(callsign, async value => {
        firPolygons.value = [];
        traconPolygons.value = [];
        if (value && (value.endsWith('_CTR') || value.endsWith('_FSS'))) {
            firPolygons.value = await resolveFirPolygons(value).catch(() => []);
        }
        if (value && (value.endsWith('_APP') || value.endsWith('_DEP'))) {
            traconPolygons.value = await resolveTraconPolygons(value).catch(() => []);
        }
    }, { immediate: true });

    const polygons = computed<BoundaryFeature[]>(() => {
        const value = callsign.value;
        if (!value) return [];
        if (value.endsWith('_CTR') || value.endsWith('_FSS')) return firPolygons.value;
        if (value.endsWith('_APP') || value.endsWith('_DEP')) return traconPolygons.value;
        return [];
    });

    const enrouteAircraft = computed<VatsimShortenedAircraft[]>(() => {
        const polys = polygons.value;
        if (!polys.length) return [];

        const from = toValue(options.flFrom);
        const to = toValue(options.flTo);
        const hasBand = typeof from === 'number' && typeof to === 'number';

        return dataStore.vatsim.data.pilots.value.filter(pilot => {
            if (isPilotOnGround(pilot)) return false;
            if (hasBand && (pilot.altitude < from! * 100 || pilot.altitude > to! * 100)) return false;
            const point: [number, number] = [pilot.longitude, pilot.latitude];
            return polys.some(polygon => booleanPointInPolygon(point, polygon));
        });
    });

    return { enrouteAircraft, polygons, callsign };
}
