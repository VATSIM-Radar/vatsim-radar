<template>
    <slot/>
</template>

<script setup lang="ts">
import { Feature } from 'ol';
import type { ShallowRef } from 'vue';
import type VectorSource from 'ol/source/Vector';
import { Point } from 'ol/geom';
import greatCircle from '@turf/great-circle';
import { waypointDiff } from '~/composables/navigraph';
import type { Coordinate } from 'ol/coordinate';
import turfBearing from '@turf/bearing';

defineSlots<{ default: () => any }>();

const source = inject<ShallowRef<VectorSource>>('navigraph-source');

const dataStore = useDataStore();

let features: Feature[] = [];

watch(dataStore.navigraphWaypoints, val => {
    const newFeatures: Feature[] = [];

    try {
        for (const { waypoints, bearing, coordinate } of Object.values(val)) {
            if (!waypoints.length) continue;
            let rawWaypoints: [string, Coordinate][] = [];
            waypoints.forEach(x => x.coordinate ? rawWaypoints.push([x.identifier, x.coordinate]) : x.airway!.value[2].forEach(x => rawWaypoints.push([x[0], [x[3], x[4]]])));

            rawWaypoints = rawWaypoints.filter((x, xIndex) => !rawWaypoints.some((y, yIndex) => x[0] === y[0] && xIndex < yIndex));

            rawWaypoints.sort((a, b) => {
                return waypointDiff(coordinate, a[1]) - waypointDiff(coordinate, b[1]);
            });
            rawWaypoints = rawWaypoints.slice(0, 4);

            rawWaypoints.sort((a, b) => {
                const aBearing = turfBearing(coordinate, a[1], { final: true });
                const bBearing = turfBearing(coordinate, b[1], { final: true });

                const diffA = Math.min(
                    Math.abs(aBearing - bearing),
                    360 - Math.abs(aBearing - bearing),
                );

                const diffB = Math.min(
                    Math.abs(bBearing - bearing),
                    360 - Math.abs(bBearing - bearing),
                );

                console.log(a[0], b[0], bearing, diffA, diffB, diffA - diffB);

                return diffA - diffB;
            });

            console.log(rawWaypoints.map(x => `${ x[0] } ${ bearing } ${ turfBearing(coordinate, x[1], { final: true }) }`));

            rawWaypoints = rawWaypoints.slice(0, 1);

            let foundWaypoint = false;

            for (let i = 0; i < waypoints.length; i++) {
                const waypoint = waypoints[i];
                const nextWaypoint = waypoints[i + 1];
                const nextCoordinate = nextWaypoint?.coordinate ?? [nextWaypoint?.airway?.value?.[2][0]?.[3], nextWaypoint?.airway?.value?.[2][0]?.[4]];

                if (waypoint.kind !== 'airway') {
                    if (waypoint.identifier === rawWaypoints[0]?.[0] || waypoint.identifier === rawWaypoints[1]?.[0]) foundWaypoint = true;

                    if (!foundWaypoint) continue;

                    newFeatures.push(new Feature({
                        geometry: new Point(waypoint.coordinate!),
                        usage: waypoint.usage,
                        identifier: waypoint.identifier,
                        waypoint: waypoint.identifier,
                        kind: waypoint.kind,
                        type: 'enroute-waypoint',
                        dataType: 'navdata',
                    }));

                    if (typeof nextCoordinate[0] !== 'number') continue;

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

                        if (currWaypoint[0] === rawWaypoints[0]?.[0] || waypoint.identifier === rawWaypoints[1]?.[0]) foundWaypoint = true;

                        if (!foundWaypoint) continue;

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
                            if (nextCoordinate?.[0]) {
                                newFeatures.push(new Feature({
                                    geometry: turfGeometryToOl(greatCircle([currWaypoint[3], currWaypoint[4]], nextCoordinate as any, { npoints: 8 })),
                                    key: '',
                                    identifier: '',
                                    type: 'airways',
                                    dataType: 'navdata',
                                }));
                            }
                            continue;
                        }

                        newFeatures.push(new Feature({
                            geometry: turfGeometryToOl(greatCircle([currWaypoint[3], currWaypoint[4]], [nextWaypoint[3], nextWaypoint[4]], { npoints: 8 })),
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
