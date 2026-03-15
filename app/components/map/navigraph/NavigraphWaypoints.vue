<script setup lang="ts">
import { useStore } from '~/store';
import { Point } from 'ol/geom.js';
import type { ShallowRef } from 'vue';
import type VectorSource from 'ol/source/Vector.js';
import { useMapStore } from '~/store/map';
import { createMapFeature, getMapFeature } from '~/utils/map/entities';
import type { NavigraphNavDataShort } from '~/utils/server/navigraph/navdata/types';

defineOptions({
    render: () => null,
});

const source = inject<ShallowRef<VectorSource>>('navigraph-source');

const store = useStore();
const mapStore = useMapStore();
const dataStore = useDataStore();

const isEnabled = computed(() => store.mapSettings.navigraphData?.waypoints !== false);

const extent = computed(() => mapStore.extent);
const terminal = computed(() => store.mapSettings.navigraphData?.terminalWaypoints);

function cleanup() {
    const features = source?.value.getFeatures() ?? [];

    for (const feature of features) {
        const type = feature.getProperties().featureType;
        if (type === 'waypoint') {
            source?.value.removeFeature(feature);
            feature.dispose();
        }
    }
}

let waypointsList: NavigraphNavDataShort['waypoints'] | null = null;

watch([isEnabled, extent, terminal], async ([enabled, extent, terminal]) => {
    if (!enabled) {
        cleanup();
        waypointsList = null;
        return;
    }

    waypointsList ??= await dataStore.navigraph.data('waypoints') ?? {};

    const entries = Object.entries(waypointsList);

    entries.forEach(([key, waypoint]) => {
        const coordinate = [waypoint[1], waypoint[2]];
        const existingWaypoint = getMapFeature('navigraph', source!.value, `waypoint-${ key }`);

        if (!isPointInExtent(coordinate, extent)) {
            if (existingWaypoint) {
                source?.value.removeFeature(existingWaypoint);
                existingWaypoint.dispose();
            }
            return;
        }

        if ((waypoint[4] && !terminal) || existingWaypoint) return;

        source?.value.addFeature(createMapFeature('navigraph', {
            geometry: new Point([waypoint[1], waypoint[2]]),
            key,
            id: `waypoint-${ key }`,
            identifier: waypoint[0],
            usage: waypoint[3],
            waypoint: waypoint[0],
            type: 'navigraph',
            featureType: 'waypoint',
            dbType: null,
        }));
    });
}, {
    immediate: true,
});

onBeforeUnmount(cleanup);
</script>
