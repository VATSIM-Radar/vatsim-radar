<script setup lang="ts">
import { Point } from 'ol/geom.js';
import type { ShallowRef } from 'vue';
import type VectorSource from 'ol/source/Vector.js';
import { useMapStore } from '~/store/map';
import type { FeatureNavigraph } from '~/utils/map/entities';
import { createMapFeature } from '~/utils/map/entities';
import { createSpatialGridIndex } from '~/utils/map/spatial-index';
import type { NavigraphNavDataShort } from '~/utils/server/navigraph/navdata/types';

defineOptions({
    render: () => null,
});

const source = inject<ShallowRef<VectorSource>>('navigraph-vector-source');

const mapStore = useMapStore();
const dataStore = useDataStore();

const isNDBEnabled = computed(() => getKeyedValueFromSettings('map.navigraph.layers.ndb') !== false);
const isVorEnabled = computed(() => getKeyedValueFromSettings('map.navigraph.layers.vordme') !== false);
const extent = computed(() => mapStore.extent);

type NdbEntry = { key: string; value: NavigraphNavDataShort['ndb'][string] };
type VhfEntry = { key: string; value: NavigraphNavDataShort['vhf'][string] };

let ndbList: NavigraphNavDataShort['ndb'] | null = null;
let vordmeList: NavigraphNavDataShort['vhf'] | null = null;
let ndbIndex: ReturnType<typeof createSpatialGridIndex<NdbEntry>> | null = null;
let vordmeIndex: ReturnType<typeof createSpatialGridIndex<VhfEntry>> | null = null;
const ndbFeatures = new Map<string, FeatureNavigraph>();
const vordmeFeatures = new Map<string, FeatureNavigraph>();
let dataVersion: string | null = null;
let updateInProgress = false;
let updatePending = false;
let updateGeneration = 0;
let disposed = false;

function removeFeatures(features: Map<string, FeatureNavigraph>) {
    for (const [key, feature] of features) {
        source?.value.removeFeature(feature);
        feature.dispose();
        features.delete(key);
    }
}

function cleanup(types: ('vhf' | 'ndb')[] = ['vhf', 'ndb']) {
    if (types.includes('vhf')) {
        removeFeatures(vordmeFeatures);
        vordmeList = null;
        vordmeIndex = null;
    }
    if (types.includes('ndb')) {
        removeFeatures(ndbFeatures);
        ndbList = null;
        ndbIndex = null;
    }
}

function removeMissing(features: Map<string, FeatureNavigraph>, visible: Set<string>) {
    for (const [key, feature] of features) {
        if (visible.has(key)) continue;
        source?.value.removeFeature(feature);
        feature.dispose();
        features.delete(key);
    }
}

async function updateNdb(generation: number) {
    const currentExtent = extent.value;
    const version = dataStore.navigraph.version.value;
    if (dataVersion !== version) {
        cleanup();
        dataVersion = version;
    }

    if (isNDBEnabled.value) {
        if (!ndbList) {
            const loadedNdb = await dataStore.navigraph.data('ndb') ?? {};
            if (disposed || generation !== updateGeneration) return;
            ndbList = loadedNdb;
        }

        ndbIndex ??= createSpatialGridIndex<NdbEntry>({
            getExtent: ({ value }) => [value[3], value[4], value[3], value[4]],
        });
        if (!ndbIndex.size()) {
            for (const [key, value] of Object.entries(ndbList)) ndbIndex.add({ key, value });
        }

        const visible = new Set<string>();
        const featuresToAdd: FeatureNavigraph[] = [];
        for (const { key, value: [ident, name, frequency, longitude, latitude] } of ndbIndex.query(currentExtent)) {
            if (!isPointInExtent([longitude, latitude], currentExtent)) continue;
            visible.add(key);
            if (ndbFeatures.has(key)) continue;

            const feature = createMapFeature('navigraph', {
                geometry: new Point([longitude, latitude]),
                key,
                ident,
                name,
                frequency,
                type: 'navigraph',
                dbType: 'ndb',
                featureType: 'ndb',
                id: `ndb-${ key }`,
            });
            ndbFeatures.set(key, feature);
            featuresToAdd.push(feature);
        }
        removeMissing(ndbFeatures, visible);
        if (featuresToAdd.length) source?.value.addFeatures(featuresToAdd);
    }
    else cleanup(['ndb']);

    if (isVorEnabled.value) {
        if (!vordmeList) {
            const loadedVhf = await dataStore.navigraph.data('vhf') ?? {};
            if (disposed || generation !== updateGeneration) return;
            vordmeList = loadedVhf;
        }

        vordmeIndex ??= createSpatialGridIndex<VhfEntry>({
            getExtent: ({ value }) => [value[4], value[5], value[4], value[5]],
        });
        if (!vordmeIndex.size()) {
            for (const [key, value] of Object.entries(vordmeList)) vordmeIndex.add({ key, value });
        }

        const visible = new Set<string>();
        const featuresToAdd: FeatureNavigraph[] = [];
        for (const { key, value: [ident, name, dme, frequency, longitude, latitude] } of vordmeIndex.query(currentExtent)) {
            if (!isPointInExtent([longitude, latitude], currentExtent)) continue;
            visible.add(key);
            if (vordmeFeatures.has(key)) continue;

            const feature = createMapFeature('navigraph', {
                geometry: new Point([longitude, latitude]),
                ident,
                key,
                name,
                dme,
                frequency,
                type: 'navigraph',
                dbType: 'vhf',
                featureType: 'vhf',
                id: `vhf-${ key }`,
            });
            vordmeFeatures.set(key, feature);
            featuresToAdd.push(feature);
        }
        removeMissing(vordmeFeatures, visible);
        if (featuresToAdd.length) source?.value.addFeatures(featuresToAdd);
    }
    else cleanup(['vhf']);
}

async function runNdbUpdate() {
    if (disposed) return;
    if (updateInProgress) {
        updatePending = true;
        return;
    }

    updateInProgress = true;
    try {
        do {
            updatePending = false;
            const generation = updateGeneration;
            await updateNdb(generation);
        } while (!disposed && updatePending);
    }
    finally {
        updateInProgress = false;
    }
}

const updateNdbThrottled = useThrottleFn(runNdbUpdate, 1000, true);

watch([isNDBEnabled, isVorEnabled, extent, dataStore.navigraph.version], () => {
    updateGeneration++;
    if (updateInProgress) updatePending = true;
    updateNdbThrottled();
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    disposed = true;
    updateGeneration++;
    cleanup();
});
</script>
