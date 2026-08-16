<script setup lang="ts">
import type { ShallowRef } from 'vue';
import type { Feature } from 'ol';
import type VectorSource from 'ol/source/Vector.js';
import { Point } from 'ol/geom.js';
import { getNavigraphParsedDataBulk, waypointDiff } from '~/composables/navigraph';
import type { Coordinate } from 'ol/coordinate.js';
import turfBearing from '@turf/bearing';
import type { VatsimExtendedPilot } from '~/types/data/vatsim';
import type { StoreOverlayPilot } from '~/store/map';
import { calculateDistanceInNauticalMiles } from '~/utils/shared/flight';
import { ownFlight } from '~/composables/vatsim/pilots';
import {
    createMapFeature,
    getMapFeature,
} from '~/utils/map/entities';
import { greatCircleToOl } from '~/utils';
import type { FeatureNavigraphItemProperties } from '~/utils/map/entities';
import type { ObjectWithGeometry } from 'ol/Feature.js';
import type {
    NavigraphNavDataEnrouteWaypointPartial,
    NavigraphNavDataShort,
} from '~/utils/server/navigraph/navdata/types';
import type { PilotNavigraphWaypoints } from '~/composables/render/storage';
import { logBench } from '~/composables';
import { setSmoothNavigraphRouteSource } from '~/composables/render/aircraft/smooth';

defineOptions({
    render: () => null,
});

const source = inject<ShallowRef<VectorSource>>('navigraph-source');

const dataStore = useDataStore();
const mapStore = useMapStore();

let triggeringNavigraphWaypointOutputs = false;

if (source) {
    watch(source, value => setSmoothNavigraphRouteSource(value), { immediate: true });
    onBeforeUnmount(() => setSmoothNavigraphRouteSource(null));
}

interface RouteRenderCache extends Omit<PilotNavigraphWaypoints, 'pilot' | 'coordinates'> {
    departure: string | null | undefined;
    arrival: string;
    hasApproach: boolean;
    hideLineIfNoProcedure: boolean;
    callsign: string;
    isLowSpeed: boolean;
    staticKeys: Set<string>;
    nextWaypoint?: {
        identifier: string;
        coordinate: Coordinate;
        kind: NavigraphNavDataEnrouteWaypointPartial['kind'];
    };
}

const routeRenderCache = new Map<number, RouteRenderCache>();

type RouteWaypointCandidate = [identifier: string, coordinate: Coordinate, bearing: number, altitude: number | null];

function hasSameRoute(cache: RouteRenderCache, route: Omit<RouteRenderCache, 'staticKeys' | 'nextWaypoint'>) {
    return cache.waypoints === route.waypoints &&
        cache.full === route.full &&
        cache.disableLabels === route.disableLabels &&
        cache.disableWaypoints === route.disableWaypoints &&
        cache.departure === route.departure &&
        cache.arrival === route.arrival &&
        cache.hasApproach === route.hasApproach &&
        cache.hideLineIfNoProcedure === route.hideLineIfNoProcedure &&
        cache.callsign === route.callsign &&
        cache.isLowSpeed === route.isLowSpeed;
}

function hasSameNextWaypoint(cache: RouteRenderCache, waypoint: RouteWaypointCandidate | undefined) {
    return !!waypoint && !!cache.nextWaypoint &&
        cache.nextWaypoint.identifier === waypoint[0] &&
        cache.nextWaypoint.coordinate[0] === waypoint[1][0] &&
        cache.nextWaypoint.coordinate[1] === waypoint[1][1];
}

function cleanup() {
    const features = source?.value.getFeatures() ?? [];

    for (const feature of features) {
        const type = feature.getProperties().featureType;
        if (type.startsWith('enroute')) {
            source?.value.removeFeature(feature);
            feature.dispose();
        }
    }

    routeRenderCache.clear();
}

async function update() {
    let currentFlight = false;
    const featuresToAdd: Feature[] = [];
    const pendingFeatures = new Map<string, Feature>();

    const keys = new Set<string>();
    const currentFlightKeys = new Set<string>();
    const visibleRouteCids = new Set<number>();
    let routeKeys: Set<string> | null = null;

    function addFeature(id: string, feature: () => ObjectWithGeometry<any, Omit<FeatureNavigraphItemProperties, 'id'>>) {
        const existingFeature = getMapFeature('navigraph', source!.value, id) ?? pendingFeatures.get(id);
        keys.add(id);
        routeKeys?.add(id);

        if (currentFlight) {
            currentFlightKeys.add(id);
        }

        if (existingFeature) {
            const properties = existingFeature.getProperties();

            if (properties.self) {
                const properties = feature();
                existingFeature.setProperties(properties);
                existingFeature.setGeometry(properties.geometry);
            }

            if (currentFlight && !properties.currentFlight) {
                existingFeature.setProperties({
                    currentFlight,
                });
            }
            else if (!currentFlightKeys.has(id) && properties.currentFlight) {
                existingFeature.setProperties({
                    currentFlight,
                });
            }
            return;
        }

        const createdFeature = createMapFeature('navigraph', Object.assign(feature(), { id, currentFlight }));
        pendingFeatures.set(id, createdFeature);
        featuresToAdd.push(createdFeature);
    }

    try {
        const pilots = Object.values(dataStore.navigraphWaypoints.value);

        const log = logBench('updateRoute');

        for (let { waypoints, pilot, full, disableLabels, disableWaypoints, coordinates: coordinate } of pilots) {
            const { heading: bearing, groundspeed: speed, cid, arrival: _arrival, departure, callsign } = pilot;

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
            const hideLineIfNoProcedure = getKeyedValueFromSettings('map.navigraph.routeParsing.airportOverlay.hideLineIfNoProcedure');

            const arrived = pilot.status === 'arrTaxi' || pilot.status === 'arrGate';

            if (!waypoints.length || arrived) {
                routeRenderCache.delete(cid);
                continue;
            }

            visibleRouteCids.add(cid);

            const hasApproach = !!Object.keys(dataStore.navigraphProcedures.value[arrival]?.approaches ?? {}).length;
            const route = {
                waypoints,
                full,
                disableLabels,
                disableWaypoints,
                departure,
                arrival,
                hasApproach,
                hideLineIfNoProcedure,
                callsign,
                isLowSpeed: speed < 50,
            };
            const cachedRoute = routeRenderCache.get(cid);

            waypoints = waypoints.slice(0);

            if (departure && dataStore.vatspy.value?.data.keyAirports.realIcao[departure]) {
                waypoints.unshift({
                    identifier: '',
                    description: ' Y  ',
                    coordinate: [dataStore.vatspy.value?.data.keyAirports.realIcao[departure]?.lon, dataStore.vatspy.value?.data.keyAirports.realIcao[departure]?.lat],
                    kind: 'enroute',
                });
            }

            if (dataStore.vatspy.value?.data.keyAirports.realIcao[arrival] && !hasApproach && (!hideLineIfNoProcedure || extendedPilot)) {
                const lastIndex = waypoints.findIndex(x => x.kind === 'missedApproach');
                const index = lastIndex === -1 ? waypoints.length - 1 : lastIndex;

                waypoints.splice(index + 1, 0, {
                    identifier: ' ',
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
                    if (bDiff > 180) bDiff = 360 - bDiff;

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

            // The static route only changes when its parsed waypoints or display settings do.
            // Reuse it only if the unchanged full selector picked the same next waypoint.
            const hasCachedStaticFeatures = cachedRoute && Array.from(cachedRoute.staticKeys).every(id => !!getMapFeature('navigraph', source!.value, id));
            const staticCacheHit = !!cachedRoute && hasSameRoute(cachedRoute, route) && hasSameNextWaypoint(cachedRoute, rawWaypoints[0]) && hasCachedStaticFeatures;

            if (staticCacheHit) {
                for (const id of cachedRoute.staticKeys) {
                    keys.add(id);
                    if (currentFlight) currentFlightKeys.add(id);
                }

                routeKeys = new Set(cachedRoute.staticKeys);
            }
            else {
                routeKeys = new Set<string>();
            }

            let foundWaypoint = speed < 50;

            let firstWaypoint = false;
            let nextWaypoint: RouteRenderCache['nextWaypoint'];

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

            let airwayNdbByIdentifier = new Map<string, NavigraphNavDataShort['ndb'] | null>();
            let airwayVhfByIdentifier = new Map<string, NavigraphNavDataShort['vhf'] | null>();

            if (!staticCacheHit && !disableWaypoints) {
                const airwayWaypointIdentifiers = waypoints.flatMap(waypoint => waypoint.kind === 'airways'
                    ? waypoint.airway!.value[2].map(airwayWaypoint => airwayWaypoint[0])
                    : []);

                [airwayNdbByIdentifier, airwayVhfByIdentifier] = await Promise.all([
                    getNavigraphParsedDataBulk('ndb', airwayWaypointIdentifiers),
                    getNavigraphParsedDataBulk('vhf', airwayWaypointIdentifiers),
                ]);
            }

            let i = 0;

            const onFirstWaypoint = (identifier: string, newCoordinate: Coordinate, kind: NavigraphNavDataEnrouteWaypointPartial['kind']) => {
                if (firstWaypoint) return;

                nextWaypoint = {
                    identifier,
                    coordinate: newCoordinate,
                    kind,
                };

                const appliedDistance = applyAircraftDistance(coordinate, newCoordinate);

                if (lastAppliedDepDistance) {
                    calculatedArrival.depDist -= appliedDistance;
                }

                if (pilot.groundspeed >= 50 && (getKeyedValueFromSettings('map.navigraph.routeParsing.airportOverlay.dashedLine') || extendedPilot) && (
                    !hideLineIfNoProcedure || kind === 'sids' || kind === 'stars' || i > 1 || extendedPilot
                )) {
                    addFeature(`enroute-${ callsign }`, () => ({
                        geometry: greatCircleToOl(coordinate, newCoordinate, { npoints: 16 }),
                        key: '',
                        identifier: '',
                        type: 'navigraph',
                        featureType: 'enroute-airways',
                        dataType: 'navdata',
                        self: true,
                        kind,
                        dbType: kind,
                    }));
                }

                firstWaypoint = true;
            };

            for (i = 0; i < waypoints.length; i++) {
                const waypoint = waypoints[i];
                const nextWaypoint = waypoints[i + 1];
                const nextCoordinate = nextWaypoint?.coordinate ?? [nextWaypoint?.airway?.value?.[2][0]?.[3], nextWaypoint?.airway?.value?.[2][0]?.[4]];

                if (waypoint.kind !== 'airways') {
                    checkAircraftStepclimb(waypoint.identifier);
                    if (waypoint.identifier === rawWaypoints[0]?.[0] || waypoint.identifier === rawWaypoints[1]?.[0]) foundWaypoint = true;

                    if (waypointForCid && waypointForCid.waypoints[i] && waypoint.kind !== 'missedApproach') {
                        waypointForCid.waypoints[i].canShowHold = foundWaypoint;
                    }

                    if (!foundWaypoint && speed >= 50 && !full) {
                        if (typeof nextCoordinate[0] === 'number') applyAircraftDistance(waypoint.coordinate!, nextCoordinate as any);

                        continue;
                    }

                    if (!disableWaypoints && !staticCacheHit) {
                        addFeature(`enroute-${ waypoint.identifier }`, () => ({
                            geometry: new Point(waypoint.coordinate!),
                            identifier: disableLabels ? '' : waypoint.identifier,
                            waypoint: disableLabels ? '' : waypoint.identifier,
                            kind: waypoint.kind,
                            key: waypoint.key,
                            featureType: (waypoint.kind === 'ndb' || waypoint.kind === 'vhf') ? `enroute-${ waypoint.kind }` : 'enroute-waypoint',
                            usage: waypoint.type,
                            description: waypoint.description,
                            type: 'navigraph',

                            altitude: disableLabels ? undefined : waypoint.altitude,
                            altitude1: disableLabels ? undefined : waypoint.altitude1,
                            altitude2: disableLabels ? undefined : waypoint.altitude2,
                            speed: disableLabels ? undefined : waypoint.speed,
                            speedLimit: disableLabels ? undefined : waypoint.speedLimit,

                            dbType: waypoint.kind,
                        }));
                    }

                    if (foundWaypoint) {
                        onFirstWaypoint(waypoint.identifier, waypoint.coordinate!, waypoint.kind);
                    }

                    if (typeof nextCoordinate[0] !== 'number') continue;

                    if (waypoint.kind !== 'missedApproach') {
                        applyAircraftDistance(waypoint.coordinate!, nextCoordinate as any);
                    }

                    if (!staticCacheHit) {
                        addFeature(`enroute-${ waypoint.identifier }-${ nextWaypoint.identifier }-connector`, () => ({
                            geometry: greatCircleToOl(waypoint.coordinate!, nextCoordinate as any, { npoints: 8 }),
                            key: '',
                            identifier: disableLabels ? '' : waypoint.title ?? '',
                            featureType: 'enroute-airways',
                            type: 'navigraph',
                            kind: nextWaypoint.kind,
                            dbType: nextWaypoint.kind,
                        }));
                    }
                }
                else {
                    for (let k = 0; k < waypoint.airway!.value[2].length; k++) {
                        const currWaypoint = waypoint.airway!.value[2][k];
                        const nextAirwayWaypoint = waypoint.airway!.value[2][k + 1];

                        checkAircraftStepclimb(currWaypoint[0]);

                        if (currWaypoint[0] === rawWaypoints[0]?.[0] || waypoint.identifier === rawWaypoints[1]?.[0]) foundWaypoint = true;

                        if (waypointForCid && waypointForCid.waypoints[i]) {
                            waypointForCid.waypoints[i].canShowHold = foundWaypoint;
                        }

                        if (!foundWaypoint && speed >= 50 && !full) {
                            if (!nextAirwayWaypoint && nextCoordinate?.[0]) {
                                applyAircraftDistance([currWaypoint[3], currWaypoint[4]], nextCoordinate as any);
                            }
                            else if (nextAirwayWaypoint) {
                                applyAircraftDistance([currWaypoint[3], currWaypoint[4]], [nextAirwayWaypoint[3], nextAirwayWaypoint[4]]);
                            }

                            continue;
                        }

                        if (foundWaypoint) {
                            onFirstWaypoint(currWaypoint[0], [currWaypoint[3], currWaypoint[4]], waypoint.kind);
                        }

                        if (!disableWaypoints && !staticCacheHit) {
                            let type: FeatureNavigraphItemProperties['featureType'] = 'enroute-airways-waypoint';

                            const ndb = Object.entries(airwayNdbByIdentifier.get(currWaypoint[0]) ?? {}).find(x => x[1][3] === currWaypoint[3] && x[1][4] === currWaypoint[4]);
                            const vhf = Object.entries(airwayVhfByIdentifier.get(currWaypoint[0]) ?? {}).find(x => x[1][4] === currWaypoint[3] && x[1][5] === currWaypoint[4]);

                            if (ndb) {
                                type = 'enroute-ndb';
                            }

                            if (vhf) {
                                type = 'enroute-vhf';
                            }

                            addFeature(`enroute-${ currWaypoint[0] }`, () => ({
                                geometry: new Point([currWaypoint[3], currWaypoint[4]]),
                                identifier: disableLabels ? '' : currWaypoint[0],
                                flightLevel: currWaypoint[5],
                                waypoint: disableLabels ? '' : currWaypoint[0],
                                featureType: type,
                                dbType: ndb ? 'ndb' : vhf ? 'vhf' : null,
                                kind: ndb ? 'ndb' : vhf ? 'vhf' : undefined,
                                type: 'navigraph',
                                usage: currWaypoint[6],

                                altitude: waypoint.altitude,
                                altitude1: waypoint.altitude1,
                                altitude2: waypoint.altitude2,
                                speed: waypoint.speed,
                                speedLimit: waypoint.speedLimit,

                                name: ndb?.[1][1] ?? vhf?.[1][1],
                                ident: ndb?.[1][0] ?? vhf?.[1][0],
                                dme: vhf?.[1][2],
                                frequency: ndb?.[1][2] ?? vhf?.[1][3],
                                key: ndb?.[0] ?? vhf?.[0],
                            }));
                        }

                        if (!nextAirwayWaypoint) {
                            // Last one
                            if (nextCoordinate?.[0]) {
                                applyAircraftDistance([currWaypoint[3], currWaypoint[4]], nextCoordinate as any);

                                if (!staticCacheHit) {
                                    addFeature(`enroute-${ waypoint.airway!.value[0] }-${ currWaypoint[0] }-${ nextWaypoint?.identifier }-last`, () => ({
                                        geometry: greatCircleToOl([currWaypoint[3], currWaypoint[4]], nextCoordinate as any, { npoints: 8 }),
                                        key: '',
                                        id: `enroute-${ waypoint.airway!.value[0] }-${ currWaypoint[0] }-${ nextWaypoint?.identifier }-last`,
                                        identifier: '',
                                        featureType: 'enroute-airways',
                                        type: 'navigraph',
                                        kind: waypoint.kind,
                                        dbType: waypoint.kind,
                                        altitude: waypoint.altitude,
                                        altitude1: waypoint.altitude1,
                                        altitude2: waypoint.altitude2,
                                        speed: waypoint.speed,
                                        speedLimit: waypoint.speedLimit,
                                    }));
                                }
                            }
                            continue;
                        }

                        applyAircraftDistance([currWaypoint[3], currWaypoint[4]], [nextAirwayWaypoint[3], nextAirwayWaypoint[4]]);

                        if (!staticCacheHit) {
                            addFeature(`${ waypoint.airway!.value[0] }-${ currWaypoint[0] }-${ nextAirwayWaypoint[0] }`, () => ({
                                geometry: greatCircleToOl([currWaypoint[3], currWaypoint[4]], [nextAirwayWaypoint[3], nextAirwayWaypoint[4]], { npoints: 8 }),
                                key: waypoint.airway!.key,
                                id: `${ waypoint.airway!.value[0] }-${ currWaypoint[0] }-${ nextAirwayWaypoint[0] }`,
                                identifier: disableLabels ? '' : waypoint.airway!.value[0],
                                inbound: currWaypoint[1],
                                outbound: currWaypoint[2],
                                waypoint: disableLabels ? '' : currWaypoint[0],
                                flightLevel: currWaypoint[5],
                                featureType: 'enroute-airways',
                                type: 'navigraph',
                                kind: waypoint.kind,
                                dbType: waypoint.kind,
                            }));
                        }
                    }
                }
            }

            const navigraphWaypoint = dataStore.navigraphWaypoints.value[cid.toString()];

            if (calculatedArrival.toGoDist > 0 && navigraphWaypoint) {
                navigraphWaypoint.calculatedArrival = {
                    depDist: calculatedArrival.depDist,
                    toGoDist: calculatedArrival.toGoDist,
                    toGoTime: Date.now() + calculatedArrival.toGoTime,
                    toGoPercent: (calculatedArrival.depDist / (calculatedArrival.depDist + calculatedArrival.toGoDist)) * 100,
                    stepclimbs: toRaw(calculatedArrival.stepclimbs),
                };
            }
            else if (navigraphWaypoint?.calculatedArrival) {
                delete navigraphWaypoint.calculatedArrival;
            }

            const staticKeys = routeKeys!;
            staticKeys.delete(`enroute-${ callsign }`);
            routeRenderCache.set(cid, {
                ...route,
                staticKeys,
                nextWaypoint,
            });
            routeKeys = null;
        }

        for (const cid of routeRenderCache.keys()) {
            if (!visibleRouteCids.has(cid)) routeRenderCache.delete(cid);
        }

        const features = source?.value.getFeatures() ?? [];

        const waypoints: Record<string, PilotNavigraphWaypoints> = {};

        for (const pilot in dataStore.navigraphWaypoints.value) {
            const arrival = dataStore.navigraphWaypoints.value[pilot];
            waypoints[pilot] = {
                pilot: toRaw(arrival.pilot),
                coordinates: arrival.coordinates,
                calculatedArrival: {
                    ...arrival.calculatedArrival,
                    stepclimbs: arrival.calculatedArrival?.stepclimbs?.map(x => toRaw(x)),
                },
                full: arrival.full,
                waypoints: [],
            };
        }

        const targetOrigin = useRuntimeConfig().public.DOMAIN;
        window.parent.postMessage({
            type: 'navigraph-waypoints',
            waypoints,
        }, targetOrigin);

        for (const feature of features) {
            const type = feature.getProperties().featureType;
            if (type.startsWith('enroute') && !keys.has(feature.getId() as string)) {
                source?.value.removeFeature(feature);
                feature.dispose();
            }
            else if (type.startsWith('enroute') && feature.getProperties().currentFlight !== currentFlightKeys.has(feature.getId() as string)) {
                feature.setProperties({
                    currentFlight: currentFlightKeys.has(feature.getId() as string),
                });
            }
        }

        if (featuresToAdd.length) source?.value.addFeatures(featuresToAdd);

        triggeringNavigraphWaypointOutputs = true;
        try {
            triggerRef(dataStore.navigraphWaypoints);
        }
        finally {
            triggeringNavigraphWaypointOutputs = false;
        }
        log();
    }
    catch (e) {
        console.error(e);
    }
}

const debouncedUpdate = useThrottleFn(update, 1000, true);

watch(dataStore.navigraphWaypoints, () => {
    if (triggeringNavigraphWaypointOutputs) return;
    debouncedUpdate();
}, {
    immediate: true,
    flush: 'sync',
});

onBeforeUnmount(cleanup);
</script>
