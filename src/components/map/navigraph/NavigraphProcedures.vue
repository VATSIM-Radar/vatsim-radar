<template>
    <slot/>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import { Feature } from 'ol';
import type { ShallowRef } from 'vue';
import type VectorSource from 'ol/source/Vector';
import { useMapStore } from '~/store/map';
import { LineString, Point } from 'ol/geom';
import type { Coordinate } from 'ol/coordinate';
import greatCircle from '@turf/great-circle';

defineSlots<{ default: () => any }>();

const source = inject<ShallowRef<VectorSource>>('navigraph-source');

const store = useStore();
const mapStore = useMapStore();
const dataStore = useDataStore();

let features: Feature[] = [];

function constructWaypointGeometries(coordinates: Coordinate[]): Coordinate[] {
    const result: Coordinate[] = [];

    for (let i = 0; i < coordinates.length; i++) {
        const coordinate = coordinates[i];
        const nextCoordinate = coordinates[i + 1];
        if (!nextCoordinate) continue;

        const circle = greatCircle(coordinate, nextCoordinate, { npoints: 2 });
        if (circle.geometry.type === 'LineString') result.push(...circle.geometry.coordinates);
        if (circle.geometry.type === 'MultiLineString') result.push(...circle.geometry.coordinates.flatMap(x => x));
    }

    return result;
}

watch([dataStore.navigraphProcedures.sids], () => {
    const newFeatures: Feature[] = [];

    for (const { procedure: { procedure, waypoints, transitions: { enroute, runway } }, constraints, transition } of Object.values({ ...dataStore.navigraphProcedures.sids.value, ...dataStore.navigraphProcedures.stars.value })) {
        newFeatures.push(new Feature({
            geometry: new LineString(constructWaypointGeometries(waypoints.map(x => x.coordinate))),
            dataType: 'navdata',
            procedure: 'sid',
            type: 'enroute',
        }));

        if (constraints) {
            newFeatures.push(...waypoints.map(x => new Feature({
                geometry: new Point(x.coordinate),
                dataType: 'navdata',
                key: x.identifier,
                waypoint: x.identifier,
                type: 'enroute-waypoint',
            })));
        }
    }

    source?.value.removeFeatures(features);
    features = newFeatures;
    source?.value.addFeatures(features);
}, {
    immediate: true,
    deep: true,
});

onBeforeUnmount(() => {
    source?.value.removeFeatures(features);
});
</script>
