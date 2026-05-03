<script setup lang="ts">
import type { ShallowRef } from 'vue';
import type VectorSource from 'ol/source/Vector.js';
import type { Feature } from 'ol';
import { buildNATWaypoints } from '~/composables/navigraph';
import greatCircle from '@turf/great-circle';
import { Point } from 'ol/geom.js';
import { createMapFeature } from '~/utils/map/entities';

defineOptions({
    render: () => null,
});

const source = inject<ShallowRef<VectorSource>>('navigraph-source');
const store = useStore();
const dataStore = useDataStore();
let features: Feature[] = [];

watch(dataStore.vatsim.tracks, async () => {
    source?.value.removeFeatures(features);
    features = [];

    for (const track of dataStore.vatsim.tracks.value.filter(x => x.active || (store.localSettings.natTrak?.showConcorde && x.concorde))) {
        if (!store.localSettings.natTrak?.showConcorde && track.concorde) continue;
        if (store.localSettings.natTrak?.showConcorde && !track.concorde) continue;
        if (store.localSettings.natTrak?.direction) {
            if (store.localSettings.natTrak?.direction === 'west' && track.direction !== 'west') continue;
            if (store.localSettings.natTrak?.direction === 'east' && track.direction !== 'east') continue;
            if (store.localSettings.natTrak?.direction === 'both' && track.direction !== null) continue;
        }
        const waypoints = await buildNATWaypoints(track);

        for (let i = 0; i < waypoints.length; i++) {
            const waypoint = waypoints[i];
            const nextWaypoint = waypoints[i + 1];
            if (!waypoint.coordinate) continue;

            features.push(createMapFeature('navigraph', {
                geometry: new Point(waypoint.coordinate!),
                identifier: waypoint.identifier,
                id: `nat-${ waypoint.identifier }`,
                waypoint: waypoint.identifier,
                key: waypoint.identifier,
                featureType: 'nat-waypoint',
                type: 'navigraph',
                dbType: null,
                direction: track.direction,
            }));

            if (nextWaypoint?.coordinate) {
                features.push(createMapFeature('navigraph', {
                    ...track,
                    geometry: turfGeometryToOl(greatCircle(waypoint.coordinate!, nextWaypoint.coordinate as any, { npoints: 8 })),
                    key: 'nat',
                    id: `nat-${ waypoint.identifier }-${ nextWaypoint.identifier }-connector`,
                    identifier: `Track ${ track.identifier }`,
                    featureType: 'airways',
                    type: 'navigraph',
                    kind: 'nat',
                    dbType: null,
                    direction: track.direction,
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
