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

const isEnabled = computed(() => store.mapSettings.navigraphData?.waypoints !== false);
let features: Feature[] = [];

watch(isEnabled, async val => {
    if (!val) {
        source?.value.removeFeatures(features);
        features = [];
    }
    else {
        const entries = Object.entries(dataStore.navigraph.data.value!.waypoints);

        entries.forEach(([key, waypoint]) => {
            features.push(new Feature({
                geometry: new Point([waypoint[1], waypoint[2]]),
                key,
                identifier: waypoint[0],
                waypoint: waypoint[0],
                type: 'waypoint',
            }));
        });

        source?.value.addFeatures(features);
    }
}, {
    immediate: true,
});

onBeforeUnmount(() => source?.value.removeFeatures(features));
</script>
