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
import type { NavigraphNavDataAirportWaypoint } from '~/utils/backend/navigraph/navdata/types';

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

function addWaypoints(newFeatures: Feature[], waypoints: NavigraphNavDataAirportWaypoint[], constraints: boolean, procedure: string) {
    for (let i = 0; i < waypoints.length; i++) {
        const waypoint = waypoints[i];
        const nextWaypoint = waypoints[i + 1];
        if (!nextWaypoint) continue;

        let coords: Coordinate[];

        const circle = greatCircle(waypoint.coordinate, nextWaypoint.coordinate, { npoints: 2 });
        if (circle.geometry.type === 'LineString') coords = circle.geometry.coordinates;
        else coords = circle.geometry.coordinates.flatMap(x => x);

        newFeatures.push(new Feature({
            geometry: new LineString(coords),
            dataType: 'navdata',
            procedure,
            type: 'enroute',

            altitude: nextWaypoint.altitude,
            altitude1: nextWaypoint.altitude1,
            altitude2: nextWaypoint.altitude2,
            speed: nextWaypoint.speed,
            speedLimit: nextWaypoint.speedLimit,
        }));

        if (constraints) {
            newFeatures.push(...waypoints.map(x => new Feature({
                geometry: new Point(x.coordinate),
                dataType: 'navdata',
                key: x.identifier,
                waypoint: x.identifier,
                ref: x.ref,
                type: 'enroute-waypoint',
            })));
        }
    }
}

watch([dataStore.navigraphProcedures.sids], () => {
    const newFeatures: Feature[] = [];

    for (const { procedure: { waypoints, transitions: { enroute, runway } }, constraints, runway: activeRunway, transition } of Object.values({ ...dataStore.navigraphProcedures.sids.value, ...dataStore.navigraphProcedures.stars.value })) {
        addWaypoints(newFeatures, waypoints, constraints, 'sid');

        const runwayTransitions = !activeRunway ? runway : runway.filter(x => x.name === activeRunway);

        if (runwayTransitions.length) {
            addWaypoints(newFeatures, runwayTransitions.flatMap(x => x.waypoints), constraints, 'sid');
        }

        const enrouteTransition = transition && enroute.find(x => x.name === transition);
        if (enrouteTransition) addWaypoints(newFeatures, enrouteTransition.waypoints, constraints, 'sid');
        else if (enroute.length) addWaypoints(newFeatures, enroute.flatMap(x => x.waypoints), constraints, 'sid');
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
