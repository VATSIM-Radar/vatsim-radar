<script setup lang="ts">
import { useStore } from '~/store';
import { Feature } from 'ol';
import { Point } from 'ol/geom.js';
import type { ShallowRef } from 'vue';
import type VectorSource from 'ol/source/Vector.js';
import { useMapStore } from '~/store/map';

defineOptions({
    render: () => null,
});

const source = inject<ShallowRef<VectorSource>>('navigraph-source');

const store = useStore();
const mapStore = useMapStore();
const dataStore = useDataStore();

const isEnabled = computed(() => store.mapSettings.navigraphData?.waypoints !== false);
let features: Feature[] = [];

const extent = computed(() => mapStore.extent);
const terminal = computed(() => store.mapSettings.navigraphData?.terminalWaypoints);

watch([isEnabled, extent, terminal], async ([enabled, extent, terminal]) => {
    if (!enabled) {
        source?.value.removeFeatures(features);
        features = [];
        return;
    }

    const newFeatures: Feature[] = [];
    const entries = Object.entries(await dataStore.navigraph.data('waypoints') ?? {});

    entries.forEach(([key, waypoint]) => {
        const coordinate = [waypoint[1], waypoint[2]];
        if (!isPointInExtent(coordinate, extent)) return;
        if (waypoint[4] && !terminal) return;

        newFeatures.push(new Feature({
            geometry: new Point([waypoint[1], waypoint[2]]),
            key,
            identifier: waypoint[0],
            usage: waypoint[3],
            waypoint: waypoint[0],
            dataType: 'navdata',
            type: 'waypoint',
        }));
    });

    source?.value.removeFeatures(features);
    features.forEach(feature => feature.dispose());
    features = newFeatures;
    source?.value.addFeatures(features);
}, {
    immediate: true,
});

onBeforeUnmount(() => source?.value.removeFeatures(features));
</script>
