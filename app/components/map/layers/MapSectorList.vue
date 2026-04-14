<script setup lang="ts">
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { FEATURES_Z_INDEX } from '~/composables/render';
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import { useMapStore } from '~/store/map';
import { useStore } from '~/store';
import type { VatsimBooking } from '~/types/data/vatsim';
import type { VatSpyData, VatSpyDataFeature } from '~/types/data/vatspy';
import { setMapSectors } from '~/composables/render/sectors';
import { globalMapEntities } from '~/utils/map/entities';

defineOptions({
    render: () => null,
});

let vectorLayer: VectorLayer<any>;
let vectorSource: VectorSource;

let labelsLayer: VectorLayer<any>;
let labelsSource: VectorSource;

const map = inject<ShallowRef<Map | null>>('map')!;
const dataStore = useDataStore();
const mapStore = useMapStore();
const store = useStore();

const hideOnZoom = computed(() => {
    return mapStore.zoom > 13;
});

const hideAtc = computed(() => isHideAtcType('firs'));

export interface MapFir {
    booking?: VatsimBooking;
    fir: VatSpyData['firs'][number];
    atc: VatSpyDataFeature[];
}

onMounted(async () => {
    if (!map.value) throw new Error('Map is not initialized');

    vectorSource = new VectorSource<any>({
        features: [],
        wrapX: true,
    });

    globalMapEntities.sectors = vectorSource;

    vectorLayer = new VectorLayer<any>({
        source: vectorSource,
        zIndex: FEATURES_Z_INDEX.SECTORS,
        declutter: 'airports',
        properties: {
            type: 'sectors-list',
        },
    });

    labelsSource = new VectorSource<any>({
        features: [],
        wrapX: true,
    });

    labelsLayer = new VectorLayer<any>({
        source: labelsSource,
        zIndex: FEATURES_Z_INDEX.SECTORS_LABEL,
        declutter: 'airports',
        properties: {
            type: 'sectors-labels',
        },
    });

    map.value.addLayer(vectorLayer);
    map.value.addLayer(labelsLayer);

    const mapSettings = computed(() => store.mapSettings);
    const mapLevel = computed(() => store.localSettings.vatglassesLevel);

    const debouncedUpdate = useThrottleFn(async () => {
        if (hideAtc.value || hideOnZoom.value) {
            vectorSource.clear();
            globalMapEntities.sectors = null;
        }
        else {
            setMapSectors({
                source: vectorSource,
                layer: vectorLayer,

                labelsSource,
                labelsLayer,

                firs: dataStore.sectorsList.value,
            });
        }
    }, 500, true);

    watch([dataStore.sectorsList, mapSettings, dataStore.vatglassesActivePositions, mapLevel], debouncedUpdate, {
        immediate: true,
    });
});

onBeforeUnmount(() => {
    vectorLayer?.dispose();
    vectorSource?.clear();
    globalMapEntities.sectors = null;

    labelsLayer?.dispose();
    labelsSource?.clear();

    map.value?.removeLayer(vectorLayer);
    map.value?.removeLayer(labelsLayer);
});
</script>
