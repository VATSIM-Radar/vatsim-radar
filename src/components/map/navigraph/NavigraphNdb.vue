<template>
    <slot/>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import type { ShallowRef } from 'vue';
import type VectorSource from 'ol/source/Vector';

defineSlots<{ default: () => any }>();

const source = inject<ShallowRef<VectorSource>>('navigraph-source');

const store = useStore();
const dataStore = useDataStore();

const isNDBEnabled = computed(() => store.mapSettings.navigraphData?.ndb !== false);
const isVorEnabled = computed(() => store.mapSettings.navigraphData?.vordme !== false);
let ndb: Feature[] = [];
let vordme: Feature[] = [];

watch([isNDBEnabled, isVorEnabled], () => {
    if (!isNDBEnabled.value) {
        source?.value.removeFeatures(ndb);
        ndb = [];
    }
    else if (!ndb.length) {
        ndb = Object.entries(dataStore.navigraph.data.value!.ndb).map(([key, [name, code, frequency, longitude, latitude]]) => new Feature({
            geometry: new Point([longitude, latitude]),
            key,
            name,
            code,
            frequency,
            type: 'ndb',
        }));
        source?.value.addFeatures(ndb);
    }

    if (!isVorEnabled.value) {
        source?.value.removeFeatures(vordme);
        vordme = [];
    }
    else if (!vordme.length) {
        vordme = Object.entries(dataStore.navigraph.data.value!.vhf).map(([key, [name, code, frequency, longitude, latitude]]) => new Feature({
            geometry: new Point([longitude, latitude]),
            key,
            name,
            code,
            frequency,
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
