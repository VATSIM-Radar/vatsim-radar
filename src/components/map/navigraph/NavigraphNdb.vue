<template>
    <slot/>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import type { ShallowRef } from 'vue';
import type VectorSource from 'ol/source/Vector';
import { useMapStore } from '~/store/map';

defineSlots<{ default: () => any }>();

const source = inject<ShallowRef<VectorSource>>('navigraph-source');

const store = useStore();
const mapStore = useMapStore();
const dataStore = useDataStore();

const isNDBEnabled = computed(() => store.mapSettings.navigraphData?.ndb !== false);
const isVorEnabled = computed(() => store.mapSettings.navigraphData?.vordme !== false);
let ndb: Feature[] = [];
let vordme: Feature[] = [];

const extent = computed(() => mapStore.extent);

watch([isNDBEnabled, isVorEnabled, extent, dataStore.navigraph.data], async () => {
    source?.value.removeFeatures(ndb);
    ndb = [];

    source?.value.removeFeatures(vordme);
    vordme = [];

    if (isNDBEnabled.value) {
        ndb = Object.entries(await dataStore.navigraph.data('ndb') ?? {}).filter(([, x]) => isPointInExtent([x[3], x[4]], extent.value)).map(([key, [name, ident, frequency, longitude, latitude]]) => new Feature({
            geometry: new Point([longitude, latitude]),
            key,
            ident,
            name,
            frequency,
            dataType: 'navdata',
            type: 'ndb',
        }));
        source?.value.addFeatures(ndb);
    }

    if (isVorEnabled.value) {
        vordme = Object.entries(await dataStore.navigraph.data('vhf') ?? {}).filter(([, x]) => isPointInExtent([x[3], x[4]], extent.value)).map(([key, [name, ident, frequency, longitude, latitude]]) => new Feature({
            geometry: new Point([longitude, latitude]),
            ident,
            key,
            name,
            frequency,
            dataType: 'navdata',
            type: 'vhf',
        }));
        source?.value.addFeatures(vordme);
    }
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    source?.value.removeFeatures(vordme);
    source?.value.removeFeatures(ndb);
});
</script>
