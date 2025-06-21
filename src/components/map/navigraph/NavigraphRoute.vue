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
import type { VatsimExtendedPilot } from '~/types/data/vatsim';
import type { StoreOverlayPilot } from '~/store/map';
import { calculateDistanceInNauticalMiles } from '~/utils/shared/flight';
import type { ObjectWithGeometry } from 'ol/Feature';

defineSlots<{ default: () => any }>();

const source = inject<ShallowRef<VectorSource>>('navigraph-source');

const dataStore = useDataStore();
const mapStore = useMapStore();

let features: Feature[] = [];

let skipUpdate = false;

function update() {
    let newFeatures: ObjectWithGeometry[] = [];

    try {
        for (let { waypoints, pilot, full } of Object.values(dataStore.navigraphWaypoints.value)) {
            const { heading: bearing, groundspeed: speed, cid, arrival: _arrival, callsign } = pilot;
            const extendedPilot = (mapStore.overlays.find(x => x.type === 'pilot' && x.key === cid.toString()) as StoreOverlayPilot | undefined)?.data.pilot;

            const calculatedArrival = {
                toGoPercent: 0,
                toGoTime: 0,
                toGoDist: 0,
                depDist: 0,
                stepclimbs: extendedPilot?.stepclimbs ?? [],
            } satisfies Pick<VatsimExtendedPilot, 'toGoTime' | 'toGoDist' | 'toGoPercent' | 'stepclimbs' | 'depDist'>;

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

            const backupWaypoints = rawWaypoints.slice(0);

            rawWaypoints = rawWaypoints.slice(0, 5);

            rawWaypoints = rawWaypoints.filter((x, xIndex) => {
                if (rawWaypoints.some((y, yIndex) => x[0] === y[0] && xIndex < yIndex)) return false;

                let diff = Math.abs(x[2] - bearing);
                if (diff > 180) diff = 360 - diff;

                return diff <= 90;
            });

            if (!rawWaypoints.length) {
                // Closest correct waypoint
                rawWaypoints = backupWaypoints.filter((x, xIndex) => {
                    if (rawWaypoints.some((y, yIndex) => x[0] === y[0] && xIndex < yIndex)) return false;

                    let diff = Math.abs(x[2] - bearing);
                    if (diff > 180) diff = 360 - diff;

                    return diff <= 90;
                }).slice(0, 1);
            }

            rawWaypoints = rawWaypoints.slice(0, 1);

            let foundWaypoint = false;

            let firstWaypoint = false;

            function checkAircraftStepclimb(waypoint: string) {
                if (!foundWaypoint && calculatedArrival.stepclimbs.length) calculatedArrival.stepclimbs = calculatedArrival.stepclimbs.filter(x => x.waypoint !== waypoint);
            }

            function applyAircraftDistance(coord1: Coordinate, coord2: Coordinate) {
                const distance = calculateDistanceInNauticalMiles(coord1, coord2);

                if (foundWaypoint) {
                    calculatedArrival.toGoDist += distance;
                    calculatedArrival.toGoTime += (distance / pilot.groundspeed) * 60 * 60 * 1000;
                }
                else {
                    calculatedArrival.depDist += distance;
                }
            }

            const waypointForCid = dataStore.navigraphWaypoints.value[cid.toString()];

            const onFirstWaypoint = (newCoordinate: Coordinate, kind: string) => {
                if (firstWaypoint) return;

                applyAircraftDistance(coordinate, newCoordinate);
                newFeatures.push({
                    geometry: turfGeometryToOl(greatCircle(coordinate, newCoordinate, { npoints: 8 })),
                    key: '',
                    identifier: '',
                    type: 'airways',
                    dataType: 'navdata',
                    self: true,
                    kind,
                    id: callsign,
                });

                firstWaypoint = true;
            };

            for (let i = 0; i < waypoints.length; i++) {
                const waypoint = waypoints[i];
                const nextWaypoint = waypoints[i + 1];
                const nextCoordinate = nextWaypoint?.coordinate ?? [nextWaypoint?.airway?.value?.[2][0]?.[3], nextWaypoint?.airway?.value?.[2][0]?.[4]];

                if (waypoint.kind !== 'airway') {
                    checkAircraftStepclimb(waypoint.identifier);
                    if (waypoint.identifier === rawWaypoints[0]?.[0] || waypoint.identifier === rawWaypoints[1]?.[0]) foundWaypoint = true;

                    if (waypointForCid && waypointForCid.waypoints[i] && waypoint.kind !== 'missedApproach') {
                        waypointForCid.waypoints[i].canShowHold = foundWaypoint;
                    }

                    if (!foundWaypoint && speed >= 50 && !full) {
                        if (typeof nextCoordinate[0] === 'number') applyAircraftDistance(waypoint.coordinate!, nextCoordinate as any);

                        continue;
                    }

                    newFeatures.push({
                        geometry: new Point(waypoint.coordinate!),
                        identifier: waypoint.identifier,
                        id: waypoint.identifier,
                        waypoint: waypoint.identifier,
                        kind: waypoint.kind,
                        key: waypoint.key,
                        type: (waypoint.kind === 'ndb' || waypoint.kind === 'vhf') ? `enroute-${ waypoint.kind }` : 'enroute-waypoint',
                        usage: waypoint.type,
                        description: waypoint.description,
                        dataType: 'navdata',

                        altitude: waypoint.altitude,
                        altitude1: waypoint.altitude1,
                        altitude2: waypoint.altitude2,
                        speed: waypoint.speed,
                        speedLimit: waypoint.speedLimit,
                    });

                    if (foundWaypoint) {
                        onFirstWaypoint(waypoint.coordinate!, waypoint.kind);
                    }

                    if (typeof nextCoordinate[0] !== 'number') continue;

                    if (waypoint.kind !== 'missedApproach') {
                        applyAircraftDistance(waypoint.coordinate!, nextCoordinate as any);
                    }

                    newFeatures.push({
                        geometry: turfGeometryToOl(greatCircle(waypoint.coordinate!, nextCoordinate as any, { npoints: 8 })),
                        key: '',
                        id: `${ waypoint.identifier }-${ nextWaypoint.identifier }-connector`,
                        identifier: waypoint.title ?? '',
                        type: 'airways',
                        dataType: 'navdata',
                        kind: waypoint.kind,
                    });
                }
                else {
                    for (let k = 0; k < waypoint.airway!.value[2].length; k++) {
                        const currWaypoint = waypoint.airway!.value[2][k];
                        const nextWaypoint = waypoint.airway!.value[2][k + 1];

                        checkAircraftStepclimb(currWaypoint[0]);

                        if (currWaypoint[0] === rawWaypoints[0]?.[0] || waypoint.identifier === rawWaypoints[1]?.[0]) foundWaypoint = true;

                        if (waypointForCid && waypointForCid.waypoints[i]) {
                            waypointForCid.waypoints[i].canShowHold = foundWaypoint;
                        }

                        if (!foundWaypoint && speed >= 50 && !full) {
                            if (!nextWaypoint && nextCoordinate?.[0]) {
                                applyAircraftDistance([currWaypoint[3], currWaypoint[4]], nextCoordinate as any);
                            }
                            else if (nextWaypoint) {
                                applyAircraftDistance([currWaypoint[3], currWaypoint[4]], [nextWaypoint[3], nextWaypoint[4]]);
                            }

                            continue;
                        }

                        if (foundWaypoint) {
                            onFirstWaypoint([currWaypoint[3], currWaypoint[4]], waypoint.kind);
                        }

                        newFeatures.push({
                            geometry: new Point([currWaypoint[3], currWaypoint[4]]),
                            identifier: currWaypoint[0],
                            flightLevel: currWaypoint[5],
                            waypoint: currWaypoint[0],
                            id: currWaypoint[0],
                            type: 'airway-waypoint',
                            dataType: 'navdata',
                            usage: currWaypoint[6],

                            altitude: waypoint.altitude,
                            altitude1: waypoint.altitude1,
                            altitude2: waypoint.altitude2,
                            speed: waypoint.speed,
                            speedLimit: waypoint.speedLimit,
                        });

                        if (!nextWaypoint) {
                            // Last one
                            if (nextCoordinate?.[0]) {
                                applyAircraftDistance([currWaypoint[3], currWaypoint[4]], nextCoordinate as any);

                                newFeatures.push({
                                    geometry: turfGeometryToOl(greatCircle([currWaypoint[3], currWaypoint[4]], nextCoordinate as any, { npoints: 8 })),
                                    key: '',
                                    id: `${ waypoint.airway!.value[0] }-${ currWaypoint[0] }-last`,
                                    identifier: '',
                                    type: 'airways',
                                    dataType: 'navdata',
                                    kind: waypoint.kind,
                                });
                            }
                            continue;
                        }

                        applyAircraftDistance([currWaypoint[3], currWaypoint[4]], [nextWaypoint[3], nextWaypoint[4]]);

                        newFeatures.push({
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
                        });
                    }
                }
            }

            if (calculatedArrival.toGoDist > 0) {
                dataStore.navigraphWaypoints.value[cid.toString()]!.calculatedArrival = {
                    depDist: calculatedArrival.depDist,
                    toGoDist: calculatedArrival.toGoDist,
                    toGoTime: Date.now() + calculatedArrival.toGoTime,
                    toGoPercent: (calculatedArrival.depDist / (calculatedArrival.depDist + calculatedArrival.toGoDist)) * 100,
                    stepclimbs: calculatedArrival.stepclimbs,
                };
            }
        }

        source?.value.removeFeatures(features);
        features.forEach(x => x.dispose());
        newFeatures = newFeatures.filter((x, xIndex) => !newFeatures.some((y, yIndex) => x.id === y.id && yIndex > xIndex));

        features = newFeatures.map(x => new Feature(x));
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
