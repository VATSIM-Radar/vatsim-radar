<template>
    <slot/>
</template>

<script setup lang="ts">
import type { ShallowRef } from 'vue';
import type VectorSource from 'ol/source/Vector';
import { Feature } from 'ol';
import type { Coordinate } from 'ol/coordinate';
import { waypointDiff } from '~/composables/navigraph';
import greatCircle from '@turf/great-circle';
import { Point } from 'ol/geom';

defineSlots<{ default: () => any }>();
const source = inject<ShallowRef<VectorSource>>('navigraph-source');
const store = useStore();
const dataStore = useDataStore();
let features: Feature[] = [];

watch(dataStore.vatsim.tracks, async () => {
    source?.value.removeFeatures(features);
    features = [];

    const keyWaypoints = await dataStore.navigraph.data('parsedWaypoints');

    for (const track of dataStore.vatsim.tracks.value) {
        if (!store.localSettings.natTrak?.showConcorde && track.concorde) continue;
        const waypoints = track.last_routeing.split(' ');

        const parsedWaypoints: {
            identifier: string;
            coordinate: Coordinate | null;
        }[] = waypoints.map(x => ({ identifier: x, coordinate: getPreciseCoord(x)?.[0] ?? null }));

        for (let i = 0; i < parsedWaypoints.length; i++) {
            const waypoint = parsedWaypoints[i];
            if (waypoint.coordinate) continue;

            const refCoordinate = parsedWaypoints.find((x, xIndex) => (xIndex === i + 1 || xIndex === i - 1) && x.coordinate)?.coordinate;
            if (!refCoordinate) continue;

            const foundWaypoint = Object.entries(keyWaypoints?.[waypoint.identifier] ?? {}).sort((a, b) => {
                const aCoord = [a[1][1], a[1][2]];
                const bCoord = [b[1][1], b[1][2]];

                return waypointDiff(refCoordinate, aCoord) - waypointDiff(refCoordinate, bCoord);
            })[0];

            if (foundWaypoint) waypoint.coordinate = [foundWaypoint[1][1], foundWaypoint[1][2]];
        }

        for (let i = 0; i < parsedWaypoints.length; i++) {
            const waypoint = parsedWaypoints[i];
            const nextWaypoint = parsedWaypoints[i + 1];
            if (!waypoint.coordinate) continue;

            features.push(new Feature({
                geometry: new Point(waypoint.coordinate!),
                identifier: waypoint.identifier,
                id: waypoint.identifier,
                waypoint: waypoint.identifier,
                key: waypoint.identifier,
                type: 'nat-waypoint',
                dataType: 'navdata',
            }));

            if (nextWaypoint?.coordinate) {
                features.push(new Feature({
                    geometry: turfGeometryToOl(greatCircle(waypoint.coordinate!, nextWaypoint.coordinate as any, { npoints: 8 })),
                    key: '',
                    id: `${ waypoint.identifier }-${ nextWaypoint.identifier }-connector`,
                    identifier: `Track ${ track.identifier }`,
                    validFrom: track.valid_from,
                    validTo: track.valid_to,
                    flightLevels: track.flight_levels,
                    concorde: track.concorde,
                    route: track.last_routeing,
                    type: 'airways',
                    dataType: 'navdata',
                    kind: 'nat',
                }));
            }
        }
    }

    source?.value.addFeatures(features);
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    source?.value.removeFeatures(features);
});
</script>
