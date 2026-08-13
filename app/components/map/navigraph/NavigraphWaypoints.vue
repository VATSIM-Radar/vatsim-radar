<script setup lang="ts">
import { Point } from 'ol/geom.js';
import type { ShallowRef } from 'vue';
import type VectorSource from 'ol/source/Vector.js';
import { useMapStore } from '~/store/map';
import { createMapFeature } from '~/utils/map/entities';
import type { FeatureNavigraph } from '~/utils/map/entities';
import { createSpatialGridIndex } from '~/utils/map/spatial-index';
import type { NavigraphNavDataShort } from '~/utils/server/navigraph/navdata/types';

defineOptions({
    render: () => null,
});

const source = inject<ShallowRef<VectorSource>>('navigraph-source');

const mapStore = useMapStore();
const dataStore = useDataStore();

const isEnabled = computed(() => getKeyedValueFromSettings('map.navigraph.layers.waypoints') !== false);
const extent = computed(() => mapStore.extent);
const terminal = computed(() => getKeyedValueFromSettings('map.navigraph.layers.terminalWaypoints'));

type WaypointEntry = {
    key: string;
    waypoint: NavigraphNavDataShort['waypoints'][string];
};

let waypointsList: NavigraphNavDataShort['waypoints'] | null = null;
let waypointsIndex: ReturnType<typeof createSpatialGridIndex<WaypointEntry>> | null = null;
let waypointsVersion: string | null = null;
const waypointFeatures = new Map<string, FeatureNavigraph>();
let disposed = false;

function removeFeature(key: string) {
    const feature = waypointFeatures.get(key);
    if (!feature) return;

    source?.value.removeFeature(feature);
    feature.dispose();
    waypointFeatures.delete(key);
}

function cleanup() {
    for (const key of waypointFeatures.keys()) removeFeature(key);
}

async function updateWaypoints() {
    if (disposed) return;

    if (!isEnabled.value) {
        cleanup();
        waypointsList = null;
        waypointsIndex = null;
        return;
    }

    const version = dataStore.navigraph.version.value;
    if (waypointsVersion !== version) {
        cleanup();
        waypointsList = null;
        waypointsIndex = null;
        waypointsVersion = version;
    }

    if (!waypointsList) {
        const loadedWaypoints = await dataStore.navigraph.data('waypoints') ?? {};
        if (disposed) return;
        waypointsList = loadedWaypoints;
    }

    waypointsIndex ??= createSpatialGridIndex<WaypointEntry>({
        getExtent: ({ waypoint }) => [waypoint[1], waypoint[2], waypoint[1], waypoint[2]],
    });

    if (!waypointsIndex.size()) {
        for (const [key, waypoint] of Object.entries(waypointsList)) waypointsIndex.add({ key, waypoint });
    }

    const currentExtent = extent.value;
    const currentTerminal = !!terminal.value;
    const visibleKeys = new Set<string>();
    const featuresToAdd: FeatureNavigraph[] = [];

    for (const { key, waypoint } of waypointsIndex.query(currentExtent)) {
        const coordinate = [waypoint[1], waypoint[2]];
        if (!isPointInExtent(coordinate, currentExtent) || (waypoint[4] && !currentTerminal)) continue;

        visibleKeys.add(key);
        if (waypointFeatures.has(key)) continue;

        const feature = createMapFeature('navigraph', {
            geometry: new Point(coordinate),
            key,
            id: `waypoint-${ key }`,
            identifier: waypoint[0],
            usage: waypoint[3],
            waypoint: waypoint[0],
            type: 'navigraph',
            featureType: 'waypoint',
            dbType: null,
        });
        waypointFeatures.set(key, feature);
        featuresToAdd.push(feature);
    }

    for (const key of waypointFeatures.keys()) {
        if (!visibleKeys.has(key)) removeFeature(key);
    }

    if (featuresToAdd.length) source?.value.addFeatures(featuresToAdd);
}

let updateInProgress = false;
let pendingUpdate = false;

const updateWaypointsThrottled = useThrottleFn(async () => {
    if (updateInProgress) {
        pendingUpdate = true;
        return;
    }

    updateInProgress = true;
    try {
        await updateWaypoints();
    }
    finally {
        updateInProgress = false;
        if (pendingUpdate && !disposed) {
            pendingUpdate = false;
            updateWaypointsThrottled();
        }
    }
}, 1000, true);

watch([isEnabled, extent, terminal, dataStore.navigraph.version], () => updateWaypointsThrottled(), {
    immediate: true,
});

onBeforeUnmount(() => {
    disposed = true;
    cleanup();
});
</script>
