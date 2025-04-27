<template>
    <slot/>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import { Feature } from 'ol';
import type { ShallowRef } from 'vue';
import type VectorSource from 'ol/source/Vector';
import Polygon from 'ol/geom/Polygon';
import type { AirspaceCoordinate } from '~/utils/backend/navigraph/navdata';
import type SimpleGeometry from 'ol/geom/SimpleGeometry';
import circle from '@turf/circle';
import union from '@turf/union';
import { featureCollection } from '@turf/helpers';
import { turfGeometryToOl } from '~/utils';
import difference from '@turf/difference';

defineSlots<{ default: () => any }>();

const source = inject<ShallowRef<VectorSource>>('navigraph-source');

const store = useStore();
const dataStore = useDataStore();

const controlledAirspace = computed(() => store.mapSettings.navigraphData?.airspaces?.controlled !== false);
const restrictedAirspace = computed(() => store.mapSettings.navigraphData?.airspaces?.restricted === false);
let controlled: Feature[] = [];
let restricted: Feature[] = [];

function getAirspacePolygon(coordinates: AirspaceCoordinate[]): SimpleGeometry {
    if (!coordinates[0][1] || !coordinates[0][2]) {
        return new Polygon([
            [
                ...coordinates.map(x => x[0]),
                coordinates[0][0],
            ],
        ]);
    }

    const circles = coordinates.filter(x => x[1]).map(([coordinate, _, distance]) => {
        return circle(
            coordinate,
            distance,
            { units: 'nauticalmiles', properties: { distance } },
        );
    });

    if (circles.length === 1) {
        return turfGeometryToOl(circles[0]);
    }

    const highestDistance = circles.reduce((sum, x) => x.properties.distance > sum ? x.properties.distance : sum, 0);
    const smallCircle = circles.filter(c => c.properties.distance < highestDistance);
    const bigCircles = circles.filter(c => c.properties.distance === highestDistance);


    const mergedBig = bigCircles.length === 1 ? bigCircles[0] : union(featureCollection(bigCircles));
    if (!smallCircle.length) return turfGeometryToOl(mergedBig);
    const mergedSmall = smallCircle.length === 1 ? smallCircle[0] : union(featureCollection(smallCircle));

    // TODO: other geometries, see EYKA
    const withHole = difference(featureCollection([
        mergedBig,
        mergedSmall,
    ]));

    return turfGeometryToOl(withHole);
}

watch([controlledAirspace, restrictedAirspace], () => {
    if (!controlledAirspace.value) {
        source?.value.removeFeatures(controlled);
        controlled = [];
    }
    else if (!controlled.length) {
        controlled = Object.entries(dataStore.navigraph.data.value!.controlledAirspace).map(([key, [classification, low, up, coords, flightLevel]]) => new Feature({
            geometry: getAirspacePolygon(coords),
            key,
            classification,
            low,
            up,
            flightLevel,
            type: 'controlledAirspace',
        }));
        source?.value.addFeatures(controlled);
    }

    if (!restrictedAirspace.value) {
        source?.value.removeFeatures(restricted);
        restricted = [];
    }
    else if (!restricted.length) {
        restricted = Object.entries(dataStore.navigraph.data.value!.restrictedAirspace).map(([key, [type, designation, low, up, coords, flightLevel]]) => new Feature({
            geometry: getAirspacePolygon(coords),
            key,
            airspaceType: type,
            designation,
            low,
            up,
            flightLevel,
            type: 'restrictedAirspace',
        }));
        source?.value.addFeatures(restricted);
    }
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    source?.value.removeFeatures(restricted);
    source?.value.removeFeatures(controlled);
});
</script>
