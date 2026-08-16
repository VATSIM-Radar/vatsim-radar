<script setup lang="ts">
import type { ShallowRef } from 'vue';
import type VectorSource from 'ol/source/Vector.js';
import { intersects } from 'ol/extent.js';
import { useMapStore } from '~/store/map';
import { checkFlightLevel } from '~/composables/render/storage';
import { createMapFeature } from '~/utils/map/entities';
import type { FeatureNavigraph } from '~/utils/map/entities';
import type { NavigraphNavDataShort, ShortAirspace } from '~/utils/server/navigraph/navdata/types';
import { createSpatialGridIndex } from '~/utils/map/spatial-index';
import {
    restrictiveAirspaceFeatureToGeoJSON,
} from '~/utils/shared/airspace';
import type { AirspaceGeometryOptions } from '~/utils/shared/airspace';
import { turfGeometryToOl } from '~/utils';

defineOptions({
    render: () => null,
});

const source = inject<ShallowRef<VectorSource>>('navigraph-source');

const dataStore = useDataStore();
const mapStore = useMapStore();

const restrictiveEnabled = useSettingValueFromFunc('map.navigraph.layers.airspace.restricted');
const controlledEnabled = useSettingValueFromFunc('map.navigraph.layers.airspace.controlled');

const extent = computed(() => mapStore.extent);
const level = computed(() => getKeyedValueFromSettings('map.navigraph.layers.ifrMode'));

type AirspaceDataKey = 'restrictedAirspace' | 'controlledAirspace';
type AirspaceFeatureType = 'restrictive-airspace' | 'controlled-airspace';

let inProgress = false;
let pendingRender = false;
let disposed = false;
let previousRestrictedEnabled = false;
let previousControlledEnabled = false;
let dataVersion: string | null = null;
type AirspaceEntry = {
    key: string;
    item: ShortAirspace;
};

const airspaces: Partial<Record<AirspaceDataKey, NavigraphNavDataShort[AirspaceDataKey]>> = {};
const airspaceIndexes: Partial<Record<AirspaceDataKey, ReturnType<typeof createSpatialGridIndex<AirspaceEntry>>>> = {};
const featuresCache = new Map<string, FeatureNavigraph>();
const activeFeatures = new Map<string, FeatureNavigraph>();
const extentCache = new WeakMap<ShortAirspace, number[] | null>();
const MAX_FEATURE_CACHE = 2000;
const clientGeometryOptions: AirspaceGeometryOptions = {
    // Viewport rendering does not need the cache-generation resolution used by the worker.
    linePoints: 8,
    arcPoints: 24,
    circlePoints: 48,
};

function getAirspaceExtent(item: ShortAirspace) {
    let itemExtent = extentCache.get(item);

    if (itemExtent === undefined) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        const extend = (longitude: number | null, latitude: number | null) => {
            if (longitude == null || latitude == null || !Number.isFinite(longitude) || !Number.isFinite(latitude)) return;

            minX = Math.min(minX, longitude);
            minY = Math.min(minY, latitude);
            maxX = Math.max(maxX, longitude);
            maxY = Math.max(maxY, latitude);
        };

        for (const point of item[6]) {
            extend(point[0], point[1]);
            extend(point[3], point[4]);
        }

        itemExtent = minX === Infinity ? null : [minX, minY, maxX, maxY];
        extentCache.set(item, itemExtent);
    }

    return itemExtent;
}

function isAirspaceInExtent(item: ShortAirspace, extent: number[]) {
    const itemExtent = getAirspaceExtent(item);
    return itemExtent ? intersects(itemExtent, extent) : false;
}

function touchFeature(id: string, feature: FeatureNavigraph) {
    featuresCache.delete(id);
    featuresCache.set(id, feature);
}

function cacheFeature(id: string, feature: FeatureNavigraph) {
    touchFeature(id, feature);

    for (const [cachedId, cachedFeature] of featuresCache) {
        if (featuresCache.size <= MAX_FEATURE_CACHE) break;
        if (cachedId === id) continue;
        if (activeFeatures.has(cachedId)) continue;

        featuresCache.delete(cachedId);
        cachedFeature.dispose();
    }
}

function getFeature(dataKey: AirspaceDataKey, featureType: AirspaceFeatureType, key: string, item: ShortAirspace) {
    const id = `${ featureType }-${ key }`;
    const cached = featuresCache.get(id);
    if (cached) {
        touchFeature(id, cached);
        return cached;
    }

    const geojson = restrictiveAirspaceFeatureToGeoJSON({
        airspace: {
            areaCode: null,
            designation: item[1],
            flightLevel: item[5],
            icaoCode: null,
            lowerLimit: item[3],
            lowerLimitUnit: null,
            multipleCode: null,
            name: item[2],
            type: item[0],
            upperLimit: item[4],
            upperLimitUnit: null,
        },
        points: item[6].map(point => ({
            arcBearing: point[5],
            arcDistance: point[6],
            arcOrigin: point[3] == null || point[4] == null ? null : [point[3], point[4]],
            boundaryVia: point[2],
            coordinate: point[0] == null || point[1] == null ? null : [point[0], point[1]],
            seqno: point[7],
        })),
    }, clientGeometryOptions);
    if (!geojson) return null;

    const feature = createMapFeature('navigraph', {
        geometry: turfGeometryToOl(geojson),
        key,
        name: item[2] ?? item[1] ?? key,
        identifier: featureType === 'restrictive-airspace' ? ((item[0] || '') + (item[1] || '')) : item[0] ?? '',
        lowerLimit: item[3],
        upperLimit: item[4],
        flightLevel: item[5],
        type: 'navigraph',
        dbType: dataKey,
        featureType,
        id,
    });

    cacheFeature(id, feature);

    return feature;
}

async function renderAirspaces(dataKey: AirspaceDataKey, featureType: AirspaceFeatureType, extent: number[], displayed: Set<string>) {
    airspaces[dataKey] ??= await dataStore.navigraph.data(dataKey) ?? {};
    airspaceIndexes[dataKey] ??= createSpatialGridIndex<AirspaceEntry>({
        getExtent: ({ item }) => {
            const itemExtent = getAirspaceExtent(item);
            return itemExtent ? [itemExtent[0], itemExtent[1], itemExtent[2], itemExtent[3]] : [0, 0, 0, 0];
        },
    });

    if (!airspaceIndexes[dataKey]!.size()) {
        for (const [key, item] of Object.entries(airspaces[dataKey] ?? {})) airspaceIndexes[dataKey]!.add({ key, item });
    }

    let counter = 0;
    const featuresToAdd: FeatureNavigraph[] = [];

    for (const { key, item } of airspaceIndexes[dataKey]!.query(extent)) {
        const id = `${ featureType }-${ key }`;
        counter++;
        if (counter % 500 === 0) await sleep(0);
        if (disposed) return;

        if (!checkFlightLevel(item[5]) || !isAirspaceInExtent(item, extent)) {
            continue;
        }

        displayed.add(id);

        if (activeFeatures.has(id)) continue;

        const feature = getFeature(dataKey, featureType, key, item);
        if (feature) {
            activeFeatures.set(id, feature);
            featuresToAdd.push(feature);
        }
    }

    if (featuresToAdd.length) source?.value.addFeatures(featuresToAdd);
}

function cleanup() {
    for (const [id, feature] of activeFeatures) {
        source?.value.removeFeature(feature);
        activeFeatures.delete(id);
    }

    for (const feature of featuresCache.values()) feature.dispose();
    featuresCache.clear();
    airspaceIndexes.restrictedAirspace = undefined;
    airspaceIndexes.controlledAirspace = undefined;
    delete airspaces.restrictedAirspace;
    delete airspaces.controlledAirspace;
}

async function updateAirspaces() {
    if (inProgress) {
        pendingRender = true;
        return;
    }

    do {
        pendingRender = false;

        const restrictedLayerEnabled = restrictiveEnabled.value;
        const controlledLayerEnabled = controlledEnabled.value;
        const currentExtent = extent.value;
        const version = dataStore.navigraph.version.value;

        if (dataVersion !== version) {
            cleanup();
            dataVersion = version;
            previousRestrictedEnabled = false;
            previousControlledEnabled = false;
        }

        if (restrictedLayerEnabled !== previousRestrictedEnabled || controlledLayerEnabled !== previousControlledEnabled) {
            cleanup();
            previousRestrictedEnabled = restrictedLayerEnabled;
            previousControlledEnabled = controlledLayerEnabled;

            if (!restrictedLayerEnabled && !controlledLayerEnabled) continue;
        }

        try {
            inProgress = true;

            const displayed = new Set<string>();

            if (restrictedLayerEnabled) await renderAirspaces('restrictedAirspace', 'restrictive-airspace', currentExtent, displayed);
            if (controlledLayerEnabled) await renderAirspaces('controlledAirspace', 'controlled-airspace', currentExtent, displayed);
            if (disposed) return;

            for (const [id, feature] of activeFeatures) {
                if (displayed.has(id)) continue;
                source?.value.removeFeature(feature);
                activeFeatures.delete(id);
            }
        }
        finally {
            inProgress = false;
        }
    } while (pendingRender && !disposed);
}

const renderAirspacesThrottled = useThrottleFn(updateAirspaces, 1000, true);

watch([restrictiveEnabled, controlledEnabled, extent, level, dataStore.navigraph.version], () => {
    if (inProgress) pendingRender = true;
    renderAirspacesThrottled();
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    disposed = true;
    cleanup();
});
</script>
