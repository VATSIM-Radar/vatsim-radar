<template>
    <slot/>
</template>

<script setup lang="ts">
import { Feature } from 'ol';
import type { ShallowRef } from 'vue';
import type VectorSource from 'ol/source/Vector';
import { Point } from 'ol/geom';
import greatCircle from '@turf/great-circle';

defineSlots<{ default: () => any }>();

const source = inject<ShallowRef<VectorSource>>('navigraph-source');

const dataStore = useDataStore();

let features: Feature[] = [];

watch(dataStore.navigraphWaypoints, val => {
    const newFeatures: Feature[] = [];

    try {
        for (const waypoints of Object.values(val)) {
            for (let i = 0; i < waypoints.length; i++) {
                const waypoint = waypoints[i];
                const nextWaypoint = waypoints[i + 1];
                const nextCoordinate = nextWaypoint?.coordinate ?? [nextWaypoint?.airway?.value?.[2][0]?.[3], nextWaypoint?.airway?.value?.[2][0]?.[4]];

                if (waypoint.kind !== 'airway') {
                    newFeatures.push(new Feature({
                        geometry: new Point(waypoint.coordinate!),
                        usage: waypoint.usage,
                        identifier: waypoint.identifier,
                        kind: waypoint.kind,
                        type: 'enroute-waypoint',
                        dataType: 'navdata',
                    }));

                    if (!nextCoordinate[0]) continue;

                    newFeatures.push(new Feature({
                        geometry: turfGeometryToOl(greatCircle(waypoint.coordinate!, nextCoordinate as any, { npoints: 2 })),
                        key: '',
                        identifier: '',
                        type: 'airways',
                        dataType: 'navdata',
                    }));
                }
                else {
                    for (let k = 0; k < waypoint.airway!.value[2].length; k++) {
                        const currWaypoint = waypoint.airway!.value[2][k];
                        const nextWaypoint = waypoint.airway!.value[2][k + 1];

                        newFeatures.push(new Feature({
                            geometry: new Point([currWaypoint[3], currWaypoint[4]]),
                            identifier: currWaypoint[0],
                            flightLevel: currWaypoint[5],
                            waypoint: currWaypoint[0],
                            type: 'airway-waypoint',
                            dataType: 'navdata',
                        }));

                        if (!nextWaypoint) {
                            // Last one
                            if (nextCoordinate) {
                                newFeatures.push(new Feature({
                                    geometry: turfGeometryToOl(greatCircle([currWaypoint[3], currWaypoint[4]], nextCoordinate as any, { npoints: 2 })),
                                    key: '',
                                    identifier: '',
                                    type: 'airways',
                                    dataType: 'navdata',
                                }));
                            }
                            continue;
                        }

                        newFeatures.push(new Feature({
                            geometry: turfGeometryToOl(greatCircle([currWaypoint[3], currWaypoint[4]], [nextWaypoint[3], nextWaypoint[4]], { npoints: 2 })),
                            key: waypoint.airway!.key,
                            identifier: waypoint.airway!.key,
                            inbound: currWaypoint[1],
                            outbound: currWaypoint[2],
                            waypoint: currWaypoint[0],
                            flightLevel: currWaypoint[5],
                            type: 'airways',
                            dataType: 'navdata',
                        }));
                    }
                }
            }
        }
    }
    catch (e) {
        console.error(e);
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
