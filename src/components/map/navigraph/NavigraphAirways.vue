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
import { useMapStore } from '~/store/map';
import type { ObjectWithGeometry } from 'ol/Feature';
import type { Coordinate } from 'ol/coordinate';
import { checkFlightLevel } from '~/composables/data';

defineSlots<{ default: () => any }>();

const source = inject<ShallowRef<VectorSource>>('navigraph-source');

const store = useStore();
const dataStore = useDataStore();
const mapStore = useMapStore();

const isEnabled = computed(() => store.mapSettings.navigraphData?.airways?.enabled !== false);
let geometries: ObjectWithGeometry[] = [];
let waypointGeometries: ObjectWithGeometry[] = [];
let features: Feature[] = [];

const extent = computed(() => mapStore.extent);
const level = computed(() => store.mapSettings.navigraphData?.mode);

watch([isEnabled, extent, level], async ([enabled, extent]) => {
    if (!enabled) {
        source?.value.removeFeatures(features);
        features = [];
        geometries = [];
        waypointGeometries = [];
        return;
    }

    const entries = Object.entries(dataStore.navigraph.data.value!.airways);
    const len = entries.length;

    if (!geometries.length) {
        for (let i = 0; i < len; i += 100) {
            for (let k = i; k < i + 100; k++) {
                const entry = entries[k];
                if (!entry) continue;
                const [key, [identifier, type, waypoints]] = entry;

                if (type === 'C') continue;

                waypoints.forEach((waypoint, index) => {
                    const nextWaypoint = waypoints[index + 1];

                    waypointGeometries.push({
                        rawCoords: [waypoint[3], waypoint[4]],
                        key,
                        identifier,
                        flightLevel: waypoint[5],
                        waypoint: waypoint[0],
                        type: 'airway-waypoint',
                        dataType: 'navdata',
                    });

                    if (!nextWaypoint) return;

                    geometries.push({
                        rawCoords: [[waypoint[3], waypoint[4]], [nextWaypoint[3], nextWaypoint[4]]],
                        key,
                        identifier,
                        inbound: waypoint[1],
                        outbound: waypoint[2],
                        waypoint: waypoint[0],
                        flightLevel: waypoint[5],
                        type: 'airways',
                        dataType: 'navdata',
                    });
                });
            }

            await sleep(0);
        }
    }

    const newFeatures = [
        ...geometries.filter(x => checkFlightLevel(x.flightLevel) && x.rawCoords.some((x: Coordinate) => isPointInExtent(x, extent))).map(x => new Feature({
            ...x,
            geometry: turfGeometryToOl(greatCircle(x.rawCoords[0], x.rawCoords[1], { npoints: 3 })),
        })),
        ...waypointGeometries.filter(x => checkFlightLevel(x.flightLevel) && isPointInExtent(x.rawCoords, extent)).map(x => new Feature({
            ...x,
            geometry: new Point(x.rawCoords),
        })),
    ];

    source?.value.removeFeatures(features);
    features = newFeatures;
    source?.value.addFeatures(features);
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    source?.value.removeFeatures(features);
    geometries = [];
    waypointGeometries = [];
    features = [];
});
</script>
