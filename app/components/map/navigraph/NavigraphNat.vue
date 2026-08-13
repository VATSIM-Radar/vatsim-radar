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
const dataStore = useDataStore();
let features: Feature[] = [];

async function updateNatTracks() {
    source?.value.removeFeatures(features);
    features = [];

    const showConcorde = getKeyedValueFromSettings('map.layers.natTrak.concorde');
    const direction = getKeyedValueFromSettings('map.layers.natTrak.direction');
    for (const track of dataStore.vatsim.tracks.value.filter(x => x.active || (showConcorde && x.concorde))) {
        if (!showConcorde && track.concorde) continue;
        if (showConcorde && !track.concorde) continue;
        if (direction) {
            if (direction === 'west' && track.direction !== 'west') continue;
            if (direction === 'east' && track.direction !== 'east') continue;
            if (direction === 'both' && track.direction !== null) continue;
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
}

const updateNatTracksThrottled = useThrottleFn(updateNatTracks, 1000, true);

watch(dataStore.vatsim.tracks, () => updateNatTracksThrottled(), {
    immediate: true,
});

onBeforeUnmount(() => {
    source?.value.removeFeatures(features);
});
</script>
