<script setup lang="ts">
import { Feature } from 'ol';
import type { ShallowRef } from 'vue';
import type VectorSource from 'ol/source/Vector.js';
import { Point } from 'ol/geom.js';
import greatCircle from '@turf/great-circle';
import { getNavigraphParsedData, waypointDiff } from '~/composables/navigraph';
import type { Coordinate } from 'ol/coordinate.js';
import turfBearing from '@turf/bearing';
import { debounce } from '~/utils/shared';
import type { VatsimExtendedPilot } from '~/types/data/vatsim';
import type { StoreOverlayPilot } from '~/store/map';
import { calculateDistanceInNauticalMiles } from '~/utils/shared/flight';
import type { ObjectWithGeometry } from 'ol/Feature.js';
import { ownFlight } from '~/composables/vatsim/pilots';

const source = inject<ShallowRef<VectorSource>>('navigraph-source');

const dataStore = useDataStore();
const mapStore = useMapStore();

let features: Feature[] = [];

let skipUpdate = false;

async function update() {
    const newFeatures: Record<string, Feature> = {};
    let currentFlight = false;

    function addFeature(id: string, feature: () => ObjectWithGeometry) {
        if (newFeatures[id]) {
            if (currentFlight) {
                newFeatures[id].setProperties({
                    ...newFeatures[id].getProperties(),
                    currentFlight,
                });
            }
            return;
        }
        newFeatures[id] = new Feature(Object.assign(feature(), { id, currentFlight }));
    }

    try {
        const pilots = Object.values(dataStore.navigraphWaypoints.value);

        for (let { waypoints, pilot, full, disableLabels, disableWaypoints, coordinates: coordinate } of pilots) {
            const { heading: bearing, groundspeed: speed, cid, arrival: _arrival, callsign } = pilot;
            currentFlight = cid === ownFlight.value?.cid;
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

            waypoints = waypoints.slice(0);

            if (!waypoints.length || arrived) continue;

            if (dataStore.vatspy.value?.data.keyAirports.realIcao[arrival] && !Object.keys(dataStore.navigraphProcedures[arrival]?.approaches ?? {}).length) {
                const lastIndex = waypoints.findIndex(x => x.kind === 'missedApproach');
                const index = lastIndex === -1 ? waypoints.length - 1 : lastIndex;

                waypoints.splice(index + 1, 0, {
                    identifier: '',
                    description: ' Y  ',
                    coordinate: [dataStore.vatspy.value?.data.keyAirports.realIcao[arrival]?.lon, dataStore.vatspy.value?.data.keyAirports.realIcao[arrival]?.lat],
                    kind: 'enroute',
                });
            }

            let rawWaypoints: [string, Coordinate, number, number | null][] = [];
            waypoints.forEach(x => x.coordinate
                ? rawWaypoints.push([x.identifier, x.coordinate, turfBearing(coordinate, x.coordinate, { final: true }), x.altitude1 ?? null])
                : x.airway!.value[2].forEach(x => rawWaypoints.push([x[0], [x[3], x[4]], turfBearing(coordinate, [x[3], x[4]], { final: true }), null])));

            rawWaypoints.sort((a, b) => {
                const diff = waypointDiff(coordinate, a[1]) - waypointDiff(coordinate, b[1]);

                if (Math.abs(diff) < 2) {
                    let aDiff = Math.abs(a[2] - bearing);
                    if (aDiff > 180) aDiff = 360 - aDiff;

                    let bDiff = Math.abs(b[2] - bearing);
                    if (bDiff > 180) bDiff = 360 - aDiff;

                    return aDiff - bDiff;
                }

                return diff;
            });

            const backupWaypoints = rawWaypoints.slice(0);

            rawWaypoints = rawWaypoints.slice(0, 10);

            rawWaypoints = rawWaypoints.filter((x, xIndex) => {
                if (rawWaypoints.some((y, yIndex) => x[0] === y[0] && xIndex < yIndex)) return false;

                let diff = Math.abs(x[2] - bearing);
                if (diff > 180) diff = 360 - diff;

                return diff <= 90;
            });

            if (rawWaypoints[0]?.[3] && rawWaypoints[1]?.[3]) {
                const aDiff = Math.abs(rawWaypoints[0]?.[3] - pilot.altitude);
                const bDiff = Math.abs(rawWaypoints[1]?.[3] - pilot.altitude);

                if (aDiff > bDiff) rawWaypoints = [rawWaypoints[1]];
                else rawWaypoints = [rawWaypoints[0]];
            }

            if (!rawWaypoints.length) rawWaypoints = backupWaypoints;

            rawWaypoints = rawWaypoints.slice(0, 1);

            let foundWaypoint = speed < 50;

            let firstWaypoint = false;

            function checkAircraftStepclimb(waypoint: string) {
                if (!foundWaypoint && calculatedArrival.stepclimbs.length) calculatedArrival.stepclimbs = calculatedArrival.stepclimbs.filter(x => x.waypoint !== waypoint);
            }

            let lastAppliedDepDistance = 0;

            function applyAircraftDistance(coord1: Coordinate, coord2: Coordinate) {
                const distance = calculateDistanceInNauticalMiles(coord1, coord2);

                if (foundWaypoint) {
                    calculatedArrival.toGoDist += distance;
                    calculatedArrival.toGoTime += (distance / pilot.groundspeed) * 60 * 60 * 1000;
                }
                else {
                    calculatedArrival.depDist += distance;
                    lastAppliedDepDistance = distance;
                }

                return distance;
            }

            const waypointForCid = dataStore.navigraphWaypoints.value[cid.toString()];

            const onFirstWaypoint = (newCoordinate: Coordinate, kind: string) => {
                if (firstWaypoint) return;

                const appliedDistance = applyAircraftDistance(coordinate, newCoordinate);

                if (lastAppliedDepDistance) {
                    calculatedArrival.depDist -= appliedDistance;
                }

                if (pilot.groundspeed >= 50) {
                    addFeature(callsign, () => ({
                        geometry: turfGeometryToOl(greatCircle(coordinate, newCoordinate, { npoints: 8 })),
                        key: '',
                        identifier: '',
                        type: 'airways',
                        dataType: 'navdata',
                        self: true,
                        kind,
                    }));
                }

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

                    if (!disableWaypoints) {
                        addFeature(waypoint.identifier, () => ({
                            geometry: new Point(waypoint.coordinate!),
                            identifier: disableLabels ? '' : waypoint.identifier,
                            waypoint: disableLabels ? '' : waypoint.identifier,
                            kind: waypoint.kind,
                            key: waypoint.key,
                            type: (waypoint.kind === 'ndb' || waypoint.kind === 'vhf') ? `enroute-${ waypoint.kind }` : 'enroute-waypoint',
                            usage: waypoint.type,
                            description: waypoint.description,
                            dataType: 'navdata',

                            altitude: disableLabels ? undefined : waypoint.altitude,
                            altitude1: disableLabels ? undefined : waypoint.altitude1,
                            altitude2: disableLabels ? undefined : waypoint.altitude2,
                            speed: disableLabels ? undefined : waypoint.speed,
                            speedLimit: disableLabels ? undefined : waypoint.speedLimit,
                        }));
                    }

                    if (foundWaypoint) {
                        onFirstWaypoint(waypoint.coordinate!, waypoint.kind);
                    }

                    if (typeof nextCoordinate[0] !== 'number') continue;

                    if (waypoint.kind !== 'missedApproach') {
                        applyAircraftDistance(waypoint.coordinate!, nextCoordinate as any);
                    }

                    addFeature(`${ waypoint.identifier }-${ nextWaypoint.identifier }-connector`, () => ({
                        geometry: turfGeometryToOl(greatCircle(waypoint.coordinate!, nextCoordinate as any, { npoints: 8 })),
                        key: '',
                        identifier: disableLabels ? '' : waypoint.title ?? '',
                        type: 'airways',
                        dataType: 'navdata',
                        kind: nextWaypoint.kind,
                    }));
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

                        if (!disableWaypoints) {
                            let type = 'airway-waypoint';

                            const ndb = Object.entries(await getNavigraphParsedData('ndb', currWaypoint[0]) ?? '').find(x => x[1][3] === currWaypoint[3] && x[1][4] === currWaypoint[4]);
                            const vhf = Object.entries(await getNavigraphParsedData('vhf', currWaypoint[0]) ?? '').find(x => x[1][4] === currWaypoint[3] && x[1][5] === currWaypoint[4]);

                            if (ndb) {
                                type = 'enroute-ndb';
                            }

                            if (vhf) {
                                type = 'enroute-vhf';
                            }

                            addFeature(currWaypoint[0], () => ({
                                geometry: new Point([currWaypoint[3], currWaypoint[4]]),
                                identifier: disableLabels ? '' : currWaypoint[0],
                                flightLevel: currWaypoint[5],
                                waypoint: disableLabels ? '' : currWaypoint[0],
                                type,
                                dataType: 'navdata',
                                usage: currWaypoint[6],

                                altitude: waypoint.altitude,
                                altitude1: waypoint.altitude1,
                                altitude2: waypoint.altitude2,
                                speed: waypoint.speed,
                                speedLimit: waypoint.speedLimit,

                                name: ndb?.[1][1] ?? vhf?.[1][1],
                                ident: ndb?.[1][0] ?? vhf?.[1][0],
                                dme: vhf?.[1][2],
                                frequency: ndb?.[1][2] ?? vhf?.[1][2],
                                key: ndb?.[0] ?? vhf?.[0],
                            }));
                        }

                        if (!nextWaypoint) {
                            // Last one
                            if (nextCoordinate?.[0]) {
                                applyAircraftDistance([currWaypoint[3], currWaypoint[4]], nextCoordinate as any);

                                addFeature(`${ waypoint.airway!.value[0] }-${ currWaypoint[0] }-last`, () => ({
                                    geometry: turfGeometryToOl(greatCircle([currWaypoint[3], currWaypoint[4]], nextCoordinate as any, { npoints: 8 })),
                                    key: '',
                                    id: `${ waypoint.airway!.value[0] }-${ currWaypoint[0] }-last`,
                                    identifier: '',
                                    type: 'airways',
                                    dataType: 'navdata',
                                    kind: waypoint.kind,
                                    altitude: waypoint.altitude,
                                    altitude1: waypoint.altitude1,
                                    altitude2: waypoint.altitude2,
                                    speed: waypoint.speed,
                                    speedLimit: waypoint.speedLimit,
                                }));
                            }
                            continue;
                        }

                        applyAircraftDistance([currWaypoint[3], currWaypoint[4]], [nextWaypoint[3], nextWaypoint[4]]);

                        addFeature(`${ waypoint.airway!.value[0] }-${ currWaypoint[0] }-${ nextWaypoint[0] }`, () => ({
                            geometry: turfGeometryToOl(greatCircle([currWaypoint[3], currWaypoint[4]], [nextWaypoint[3], nextWaypoint[4]], { npoints: 8 })),
                            key: waypoint.airway!.key,
                            id: `${ waypoint.airway!.value[0] }-${ currWaypoint[0] }-${ nextWaypoint[0] }`,
                            identifier: disableLabels ? '' : waypoint.airway!.value[0],
                            inbound: currWaypoint[1],
                            outbound: currWaypoint[2],
                            waypoint: disableLabels ? '' : currWaypoint[0],
                            flightLevel: currWaypoint[5],
                            type: 'airways',
                            dataType: 'navdata',
                            kind: waypoint.kind,
                        }));
                    }
                }
            }

            if (calculatedArrival.toGoDist > 0 && dataStore.navigraphWaypoints.value[cid.toString()]) {
                dataStore.navigraphWaypoints.value[cid.toString()].calculatedArrival = {
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

        features = Object.values(newFeatures);

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
