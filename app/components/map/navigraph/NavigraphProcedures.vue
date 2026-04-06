<script setup lang="ts">
import type { Feature } from 'ol';
import type { ShallowRef } from 'vue';
import type VectorSource from 'ol/source/Vector.js';
import { LineString, Point } from 'ol/geom.js';
import type { Coordinate } from 'ol/coordinate.js';
import greatCircle from '@turf/great-circle';
import type { NavigraphNavDataAirportWaypoint } from '~/utils/server/navigraph/navdata/types';
import type { DataStoreNavigraphProcedure, DataStoreNavigraphProceduresAirport } from '~/composables/render/storage';
import { createMapFeature } from '~/utils/map/entities';

defineOptions({
    render: () => null,
});

const source = inject<ShallowRef<VectorSource>>('navigraph-source');

const dataStore = useDataStore();

let features: Feature[] = [];

function addWaypoints(newFeatures: Feature[], waypoints: NavigraphNavDataAirportWaypoint[], constraints: boolean, procedure: string, name?: string) {
    for (let i = 0; i < waypoints.length; i++) {
        const waypoint = waypoints[i];
        const nextWaypoint = waypoints[i + 1];
        if (!nextWaypoint) continue;

        let coords: Coordinate[];

        const circle = greatCircle(waypoint.coordinate, nextWaypoint.coordinate, { npoints: 2 });
        if (circle.geometry.type === 'LineString') coords = circle.geometry.coordinates;
        else coords = circle.geometry.coordinates.flatMap(x => x);

        newFeatures.push(createMapFeature('navigraph', {
            geometry: new LineString(coords),
            procedure,
            name,
            type: 'navigraph',
            featureType: 'procedure',
            id: `enroute-${ procedure }-${ name }`,
            dbType: null,
        }));

        if (constraints) {
            newFeatures.push(...waypoints.map(x => createMapFeature('navigraph', {
                geometry: new Point(x.coordinate),
                key: x.identifier,
                waypoint: x.identifier,
                description: x.description,
                usage: x.type,
                featureType: 'procedure-waypoint',
                type: 'navigraph',
                id: `procedure-waypoint-${ x.identifier }`,

                altitude: x.altitude,
                altitude1: x.altitude1,
                altitude2: x.altitude2,
                speed: x.speed,
                speedLimit: x.speedLimit,

                dbType: null,
            })));
        }
    }
}

function processSidOrStar(newFeatures: Feature[], { procedure: { waypoints, transitions: { enroute, runway }, procedure: { identifier } }, constraints, transitions }: DataStoreNavigraphProcedure, type: 'sid' | 'star', runways: string[]) {
    addWaypoints(newFeatures, waypoints, constraints, type, identifier);

    if (type === 'sid') {
        const runwayTransitions = runway.filter(x => !runways.length || runways.some(y => y === x.name));

        if (runwayTransitions.length) {
            addWaypoints(newFeatures, runwayTransitions.flatMap(x => x.waypoints), constraints, type);
        }
    }

    const enrouteTransitions = enroute.filter(x => !transitions.length || transitions.some(y => y === x.name));
    enrouteTransitions.forEach(x => addWaypoints(newFeatures, x.waypoints, constraints, type));
}

watch(() => dataStore.navigraphProcedures, () => {
    const newFeatures: Feature[] = [];

    for (const { sids, stars, approaches, runways } of Object.values(dataStore.navigraphProcedures.value as Record<string, DataStoreNavigraphProceduresAirport>)) {
        for (const item of Object.values(sids)) {
            processSidOrStar(newFeatures, item, 'sid', runways);
        }

        for (const item of Object.values(stars)) {
            processSidOrStar(newFeatures, item, 'star', runways);
        }

        for (const item of Object.values(approaches)) {
            const { procedure: { waypoints, transitions: approachTransitions, procedure: { missedApproach } }, constraints, transitions } = item;
            addWaypoints(newFeatures, waypoints, constraints, 'approaches');

            const enrouteTransitions = approachTransitions.filter(x => !transitions.length || transitions.some(y => y === x.name));
            addWaypoints(newFeatures, enrouteTransitions.flatMap(x => x.waypoints), constraints, 'approaches');

            if (missedApproach.length) addWaypoints(newFeatures, missedApproach, constraints, 'missedApproach');
        }
    }

    source?.value.removeFeatures(features);
    features = newFeatures;
    source?.value.addFeatures(features);
}, {
    immediate: true,
    deep: 4,
});

onBeforeUnmount(() => {
    source?.value.removeFeatures(features);
});
</script>
