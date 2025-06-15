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

let skipUpdate = false;

function update() {
    let newFeatures: Feature[] = [];

    try {
        for (let { waypoints, pilot, full } of Object.values(dataStore.navigraphWaypoints.value)) {
            const { heading: bearing, groundspeed: speed, cid, arrival: _arrival, callsign } = pilot;

            const arrival = _arrival!;

            const arrived = pilot.status === 'arrTaxi' || pilot.status === 'arrGate';

            const coordinate = [pilot.longitude, pilot.latitude];

            waypoints = waypoints.slice(0);

            if (!waypoints.length || arrived) continue;

            if (dataStore.vatspy.value?.data.keyAirports.realIcao[arrival] && !Object.keys(dataStore.navigraphProcedures[arrival]?.approaches ?? {}).length) {
                const lastIndex = waypoints.findIndex(x => x.kind === 'missedApproach');
                const index = lastIndex === -1 ? waypoints.length - 1 : lastIndex;

                waypoints.splice(index + 1, 0, {
                    identifier: arrival,
                    coordinate: [dataStore.vatspy.value?.data.keyAirports.realIcao[arrival]?.lon, dataStore.vatspy.value?.data.keyAirports.realIcao[arrival]?.lat],
                    kind: 'enroute',
                });
            }

            let rawWaypoints: [string, Coordinate, number][] = [];
            waypoints.forEach(x => x.coordinate
                ? rawWaypoints.push([x.identifier, x.coordinate, turfBearing(coordinate, x.coordinate, { final: true })])
                : x.airway!.value[2].forEach(x => rawWaypoints.push([x[0], [x[3], x[4]], turfBearing(coordinate, [x[3], x[4]], { final: true })])));

            rawWaypoints.sort((a, b) => {
                return waypointDiff(coordinate, a[1]) - waypointDiff(coordinate, b[1]);
            });

            rawWaypoints = rawWaypoints.slice(0, 5);

            const backupWaypoints = rawWaypoints.slice(0);

            rawWaypoints = rawWaypoints.filter((x, xIndex) => {
                if (rawWaypoints.some((y, yIndex) => x[0] === y[0] && xIndex < yIndex)) return false;

                let diff = Math.abs(x[2] - bearing);
                if (diff > 180) diff = 360 - diff;

                return diff <= 90;
            });

            if (!rawWaypoints.length) rawWaypoints = backupWaypoints;

            rawWaypoints = rawWaypoints.slice(0, 1);

            let foundWaypoint = false;

            let firstWaypoint = false;

            const waypointForCid = dataStore.navigraphWaypoints.value[cid.toString()];

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
                    id: callsign,
                }));

                firstWaypoint = true;
            };

            for (let i = 0; i < waypoints.length; i++) {
                const waypoint = waypoints[i];
                const nextWaypoint = waypoints[i + 1];
                const nextCoordinate = nextWaypoint?.coordinate ?? [nextWaypoint?.airway?.value?.[2][0]?.[3], nextWaypoint?.airway?.value?.[2][0]?.[4]];

                if (waypoint.kind !== 'airway') {
                    if (waypoint.identifier === rawWaypoints[0]?.[0] || waypoint.identifier === rawWaypoints[1]?.[0]) foundWaypoint = true;

                    if (waypointForCid && waypointForCid.waypoints[i]) {
                        waypointForCid.waypoints[i].canShowHold = foundWaypoint;
                    }

                    if (!foundWaypoint && speed >= 50 && !full) continue;

                    newFeatures.push(new Feature({
                        geometry: new Point(waypoint.coordinate!),
                        usage: waypoint.usage,
                        identifier: waypoint.identifier,
                        id: waypoint.identifier,
                        waypoint: waypoint.identifier,
                        kind: waypoint.kind,
                        key: waypoint.key,
                        type: (waypoint.kind === 'ndb' || waypoint.kind === 'vhf') ? waypoint.kind : 'enroute-waypoint',
                        dataType: 'navdata',

                        altitude: waypoint.altitude,
                        altitude1: waypoint.altitude1,
                        altitude2: waypoint.altitude2,
                        speed: waypoint.speed,
                        speedLimit: waypoint.speedLimit,
                    }));

                    if (foundWaypoint) {
                        onFirstWaypoint(waypoint.coordinate!, waypoint.kind);
                    }

                    if (typeof nextCoordinate[0] !== 'number') continue;

                    newFeatures.push(new Feature({
                        geometry: turfGeometryToOl(greatCircle(waypoint.coordinate!, nextCoordinate as any, { npoints: 8 })),
                        key: '',
                        id: `${ waypoint.identifier }-${ nextWaypoint.identifier }-connector`,
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

                        if (waypointForCid && waypointForCid.waypoints[i]) {
                            waypointForCid.waypoints[i].canShowHold = foundWaypoint;
                        }

                        if (!foundWaypoint && speed >= 50 && !full) continue;

                        if (foundWaypoint) {
                            onFirstWaypoint([currWaypoint[3], currWaypoint[4]], waypoint.kind);
                        }

                        newFeatures.push(new Feature({
                            geometry: new Point([currWaypoint[3], currWaypoint[4]]),
                            identifier: currWaypoint[0],
                            flightLevel: currWaypoint[5],
                            waypoint: currWaypoint[0],
                            id: currWaypoint[0],
                            type: 'airway-waypoint',
                            dataType: 'navdata',

                            altitude: waypoint.altitude,
                            altitude1: waypoint.altitude1,
                            altitude2: waypoint.altitude2,
                            speed: waypoint.speed,
                            speedLimit: waypoint.speedLimit,
                        }));

                        if (!nextWaypoint) {
                            // Last one
                            if (nextCoordinate?.[0]) {
                                newFeatures.push(new Feature({
                                    geometry: turfGeometryToOl(greatCircle([currWaypoint[3], currWaypoint[4]], nextCoordinate as any, { npoints: 8 })),
                                    key: '',
                                    id: `${ waypoint.airway!.value[0] }-${ currWaypoint[0] }-last`,
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
                            id: `${ waypoint.airway!.value[0] }-${ currWaypoint[0] }-${ nextWaypoint[0] }`,
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
        newFeatures = newFeatures.filter((x, xIndex) => !newFeatures.some((y, yIndex) => x.getProperties().id === y.getProperties().id && yIndex > xIndex));

        features = newFeatures;
        source?.value.addFeatures(features);

        skipUpdate = true;
        triggerRef(dataStore.navigraphWaypoints);
    }
    catch (e) {
        console.error(e);
    }
}

const debouncedUpdate = debounce(update, 500);

watch(dataStore.navigraphWaypoints, () => {
    if (skipUpdate) {
        skipUpdate = false;
        return;
    }
    debouncedUpdate();
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    source?.value.removeFeatures(features);
});
</script>
