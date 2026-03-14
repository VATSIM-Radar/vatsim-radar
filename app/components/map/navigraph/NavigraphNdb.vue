<script setup lang="ts">
import { useStore } from '~/store';
import { Feature } from 'ol';
import { Point } from 'ol/geom.js';
import type { ShallowRef } from 'vue';
import type VectorSource from 'ol/source/Vector.js';
import { useMapStore } from '~/store/map';
import type { NavigraphNavDataShort } from '~/utils/server/navigraph/navdata/types';
import { createMapFeature, getMapFeature } from '~/utils/map/entities';

defineOptions({
    render: () => null,
});

const source = inject<ShallowRef<VectorSource>>('navigraph-source');

const store = useStore();
const mapStore = useMapStore();
const dataStore = useDataStore();

const isNDBEnabled = computed(() => store.mapSettings.navigraphData?.ndb !== false);
const isVorEnabled = computed(() => store.mapSettings.navigraphData?.vordme !== false);

let ndbList: NavigraphNavDataShort['ndb'] | null = null;
let vordmeList: NavigraphNavDataShort['vhf'] | null = null;

const extent = computed(() => mapStore.extent);

function cleanup(types = ['vhf', 'ndb']) {
    const features = source?.value.getFeatures() ?? [];

    if (types.length === 1) {
        if (types[0] === 'vhf') {
            if (!vordmeList) return;
            else vordmeList = null;
        }
        else if (types[0] === 'ndb') {
            if (!ndbList) return;
            else ndbList = null;
        }
    }
    else if (types.length === 2) {
        vordmeList = null;
        ndbList = null;
    }

    for (const feature of features) {
        const type = feature.getProperties().featureType;
        if (types.includes(type)) {
            source?.value.removeFeature(feature);
            feature.dispose();
        }
    }
}

watch([isNDBEnabled, isVorEnabled, extent, dataStore.navigraph.version], async () => {
    if (isNDBEnabled.value) {
        ndbList ??= await dataStore.navigraph.data('ndb');

        for (const [key, [ident, name, frequency, longitude, latitude]] of Object.entries(ndbList!)) {
            const existingFeature = getMapFeature('navigraph', source!.value, `ndb-${ key }`);
            const isInExtent = isPointInExtent([longitude, latitude], extent.value);

            if (isInExtent) {
                if (existingFeature) continue;
                else {
                    source?.value.addFeature(createMapFeature('navigraph', {
                        geometry: new Point([longitude, latitude]),
                        key,
                        ident,
                        name,
                        frequency,
                        type: 'navigraph',
                        featureType: 'ndb',
                        id: `ndb-${ key }`,
                    }));
                }
            }
            else if (existingFeature) {
                source?.value?.removeFeature(existingFeature);
                existingFeature.dispose();
            }
        }
    }
    else cleanup(['ndb']);

    if (isVorEnabled.value) {
        vordmeList ??= await dataStore.navigraph.data('vhf');

        for (const [key, [ident, name, dme, frequency, longitude, latitude]] of Object.entries(vordmeList!)) {
            const existingFeature = getMapFeature('navigraph', source!.value, `vhf-${ key }`);
            const isInExtent = isPointInExtent([longitude, latitude], extent.value);

            if (isInExtent) {
                if (existingFeature) continue;
                else {
                    source?.value.addFeature(createMapFeature('navigraph', {
                        geometry: new Point([longitude, latitude]),
                        ident,
                        key,
                        name,
                        dme,
                        frequency,
                        type: 'navigraph',
                        featureType: 'vhf',
                        id: `vhf-${ key }`,
                    }));
                }
            }
            else if (existingFeature) {
                source?.value?.removeFeature(existingFeature);
                existingFeature.dispose();
            }
        }
    }
    else cleanup(['vhf']);
}, {
    immediate: true,
});

onBeforeUnmount(cleanup);
</script>
