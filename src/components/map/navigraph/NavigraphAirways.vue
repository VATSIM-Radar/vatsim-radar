<template>
    <slot/>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import type { ShallowRef } from 'vue';
import type VectorSource from 'ol/source/Vector';
import greatCircle from '@turf/great-circle';

defineSlots<{ default: () => any }>();

const source = inject<ShallowRef<VectorSource>>('navigraph-source');

const store = useStore();
const dataStore = useDataStore();

const isEnabled = computed(() => store.mapSettings.navigraphData?.airways?.enabled !== false);
let features: Feature[] = [];

watch(isEnabled, async val => {
    if (!val) {
        source?.value.removeFeatures(features);
        features = [];
    }
    else {
        const entries = Object.entries(dataStore.navigraph.data.value!.airways);
        const len = entries.length;

        for (let i = 0; i < len; i += 100) {
            for (let k = i; k < i + 100; k++) {
                const entry = entries[k];
                if (!entry) continue;
                const [key, [identifier, type, waypoints]] = entry;

                if (type === 'C') continue;
                waypoints.forEach((waypoint, index) => {
                    const nextWaypoint = waypoints[index + 1];

                    features.push(new Feature({
                        geometry: new Point([waypoint[3], waypoint[4]]),
                        key,
                        identifier,
                        waypoint: waypoint[0],
                        type: 'airway-waypoint',
                    }));

                    if (!nextWaypoint) return;

                    features.push(new Feature({
                        geometry: greatCircleGeometryToOL(greatCircle([waypoint[3], waypoint[4]], [nextWaypoint[3], nextWaypoint[4]])),
                        key,
                        identifier,
                        inbound: waypoint[1],
                        outbound: waypoint[2],
                        waypoint: waypoint[0],
                        flightLevel: waypoint[5],
                        type: 'airways',
                    }));
                });
            }

            await sleep(0);
        }

        source?.value.addFeatures(features);
    }
}, {
    immediate: true,
});

onBeforeUnmount(() => source?.value.removeFeatures(features));
</script>
