<template>
    <slot/>
</template>

<script setup lang="ts">
import type { ShallowRef } from 'vue';
import type VectorSource from 'ol/source/Vector';
import { Feature } from 'ol';
import { buildNATWaypoints } from '~/composables/navigraph';
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

    for (const track of dataStore.vatsim.tracks.value) {
        if (!store.localSettings.natTrak?.showConcorde && track.concorde) continue;
        if (store.localSettings.natTrak?.showConcorde && !track.concorde) continue;
        const waypoints = await buildNATWaypoints(track);

        for (let i = 0; i < waypoints.length; i++) {
            const waypoint = waypoints[i];
            const nextWaypoint = waypoints[i + 1];
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
