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

const isEnabled = computed(() => store.mapSettings.navigraphData?.ndb !== false);
let features: Feature[] = [];

watch(isEnabled, val => {
    if (!val) {
        source?.value.removeFeatures(features);
        features = [];
    }
    else {
        features = [
            ...Object.values(dataStore.navigraph.data.value!.vhf).map(([name, code, frequency, longitude, latitude]) => new Feature({
                geometry: new Point([longitude, latitude]),
                name,
                code,
                frequency,
                type: 'vhf',
            })),
            ...Object.values(dataStore.navigraph.data.value!.ndb).map(([name, code, frequency, longitude, latitude]) => new Feature({
                geometry: new Point([longitude, latitude]),
                name,
                code,
                frequency,
                type: 'ndb',
            })),
        ];

        source?.value.addFeatures(features);
    }
}, {
    immediate: true,
});

onBeforeUnmount(() => source?.value.removeFeatures(features));
</script>
