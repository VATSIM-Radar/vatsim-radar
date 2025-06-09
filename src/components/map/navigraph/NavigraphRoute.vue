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
import { debounce } from '~/utils/shared';

defineSlots<{ default: () => any }>();

const source = inject<ShallowRef<VectorSource>>('navigraph-source');

const dataStore = useDataStore();

let features: Feature[] = [];

function update() {
    const newFeatures: Feature[] = [];

    try {
        for (let { waypoints, bearing, coordinate, speed, arrival, full } of Object.values(dataStore.navigraphWaypoints.value)) {
            if (!waypoints.length) continue;

            if (dataStore.vatspy.value?.data.keyAirports.realIcao[arrival] && !Object.keys(dataStore.navigraphProcedures[arrival]?.stars ?? {}).length && !Object.keys(dataStore.navigraphProcedures[arrival]?.approaches ?? {}).length) {
                waypoints = [
                    ...waypoints,
                    {
                        identifier: arrival,
                        coordinate: [dataStore.vatspy.value?.data.keyAirports.realIcao[arrival]?.lon, dataStore.vatspy.value?.data.keyAirports.realIcao[arrival]?.lat],
                        kind: 'enroute',
                    },
                ];
            }
            let rawWaypoints: [string, Coordinate, number][] = [];
            waypoints.forEach(x => x.coordinate
                ? rawWaypoints.push([x.identifier, x.coordinate, turfBearing(coordinate, x.coordinate, { final: true })])
                : x.airway!.value[2].forEach(x => rawWaypoints.push([x[0], [x[3], x[4]], turfBearing(coordinate, [x[3], x[4]], { final: true })])));

            rawWaypoints = rawWaypoints.filter((x, xIndex) => {
                if (rawWaypoints.some((y, yIndex) => x[0] === y[0] && xIndex < yIndex)) return false;

                let diff = Math.abs(x[2] - bearing);
                if (diff > 180) diff = 360 - diff;

                return diff <= 90;
            });

            rawWaypoints.sort((a, b) => {
                return waypointDiff(coordinate, a[1]) - waypointDiff(coordinate, b[1]);
            });

            rawWaypoints = rawWaypoints.slice(0, 1);

            let foundWaypoint = speed < 50;

            let firstWaypoint = false;

            const onFirstWaypoint = (newCoordinate: Coordinate, kind: string) => {
                if (firstWaypoint) return;

                newFeatures.push(new Feature({
                    geometry: turfGeometryToOl(greatCircle(coordinate, newCoordinate, { npoints: 8 })),
                    key: '',
                    identifier: '',
                    type: 'airways',
                    dataType: 'navdata',
                    self: true,
                    kind,
                }));

                firstWaypoint = true;
            };

            for (let i = 0; i < waypoints.length; i++) {
                const waypoint = waypoints[i];
                const nextWaypoint = waypoints[i + 1];
                const nextCoordinate = nextWaypoint?.coordinate ?? [nextWaypoint?.airway?.value?.[2][0]?.[3], nextWaypoint?.airway?.value?.[2][0]?.[4]];

                if (waypoint.kind !== 'airway') {
                    if (waypoint.identifier === rawWaypoints[0]?.[0] || waypoint.identifier === rawWaypoints[1]?.[0]) foundWaypoint = true;

                    if (!foundWaypoint && !full) continue;

                    newFeatures.push(new Feature({
                        geometry: new Point(waypoint.coordinate!),
                        usage: waypoint.usage,
                        identifier: waypoint.identifier,
                        waypoint: waypoint.identifier,
                        kind: waypoint.kind,
                        type: 'enroute-waypoint',
                        dataType: 'navdata',
                    }));

                    if (foundWaypoint) {
                        onFirstWaypoint(waypoint.coordinate!, waypoint.kind);
                    }

                    if (typeof nextCoordinate[0] !== 'number') continue;

                    newFeatures.push(new Feature({
                        geometry: turfGeometryToOl(greatCircle(waypoint.coordinate!, nextCoordinate as any, { npoints: 8 })),
                        key: '',
                        identifier: waypoint.title ?? '',
                        type: 'airways',
                        dataType: 'navdata',
                        kind: waypoint.kind,
                    }));
                }
                else {
                    for (let k = 0; k < waypoint.airway!.value[2].length; k++) {
                        const currWaypoint = waypoint.airway!.value[2][k];
                        const nextWaypoint = waypoint.airway!.value[2][k + 1];

                        if (currWaypoint[0] === rawWaypoints[0]?.[0] || waypoint.identifier === rawWaypoints[1]?.[0]) foundWaypoint = true;

                        if (!foundWaypoint && !full) continue;

                        if (foundWaypoint) {
                            onFirstWaypoint([currWaypoint[3], currWaypoint[4]], waypoint.kind);
                        }

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
                                    kind: waypoint.kind,
                                }));
                            }
                            continue;
                        }

                        newFeatures.push(new Feature({
                            geometry: turfGeometryToOl(greatCircle([currWaypoint[3], currWaypoint[4]], [nextWaypoint[3], nextWaypoint[4]], { npoints: 8 })),
                            key: waypoint.airway!.key,
                            identifier: waypoint.airway!.value[0],
                            inbound: currWaypoint[1],
                            outbound: currWaypoint[2],
                            waypoint: currWaypoint[0],
                            flightLevel: currWaypoint[5],
                            type: 'airways',
                            dataType: 'navdata',
                            kind: waypoint.kind,
                        }));
                    }
                }
            }
        }

        source?.value.removeFeatures(features);
        features = newFeatures;
        source?.value.addFeatures(features);
    }
    catch (e) {
        console.error(e);
    }
}

const debouncedUpdate = debounce(update, 500);

watch(dataStore.navigraphWaypoints, () => {
    debouncedUpdate();
}, {
    immediate: true,
    deep: true,
});

onBeforeUnmount(() => {
    source?.value.removeFeatures(features);
});
</script>
