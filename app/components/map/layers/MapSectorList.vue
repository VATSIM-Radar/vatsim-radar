<script setup lang="ts">
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { FEATURES_Z_INDEX } from '~/composables/render';
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import { useStore } from '~/store';
import type { VatsimBooking } from '~/types/data/vatsim';
import type { VatSpyData, VatSpyDataFeature } from '~/types/data/vatspy';
import { setMapSectors } from '~/composables/render/sectors';
import { globalMapEntities } from '~/utils/map/entities';
import { logBench } from '~/composables';
import VectorImageLayer from 'ol/layer/VectorImage';

defineOptions({
    render: () => null,
});

let vectorLayer: VectorLayer<any>;
let vectorImageLayer: VectorImageLayer<any>;
let vectorSource: VectorSource;
let vectorImageSource: VectorSource;

let labelsLayer: VectorLayer<any>;

const map = inject<ShallowRef<Map | null>>('map')!;
const dataStore = useDataStore();
const store = useStore();

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

    vectorImageSource = new VectorSource<any>({
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

    vectorImageLayer = new VectorImageLayer<any>({
        source: vectorImageSource,
        zIndex: FEATURES_Z_INDEX.SECTORS_EMPTY,
        declutter: false,
        properties: {
            type: 'sectors-empty',
        },
    });

    labelsLayer = new VectorLayer<any>({
        source: vectorSource,
        zIndex: FEATURES_Z_INDEX.SECTORS_LABEL,
        declutter: 'airports',
        properties: {
            type: 'sectors-labels',
        },
    });

    map.value.addLayer(vectorLayer);
    map.value.addLayer(vectorImageLayer);
    map.value.addLayer(labelsLayer);

    const mapSettings = computed(() => store.mapSettings);
    const mapLevel = computed(() => store.localSettings.vatglassesLevel);

    const debouncedUpdate = useThrottleFn(async () => {
        if (hideAtc.value) {
            vectorSource.clear();
        }
        else {
            const log = logBench('sectorsRender');
            setMapSectors({
                source: vectorSource,
                layer: vectorLayer,

                emptyLayer: vectorImageLayer,
                emptySource: vectorImageSource,

                labelsLayer,

                firs: dataStore.sectorsList.value,
            });
            log();
        }
    }, 500, true);

    watch([dataStore.sectorsList, mapSettings, dataStore.vatglassesActivePositions, mapLevel], debouncedUpdate, {
        immediate: true,
    });
});

onBeforeUnmount(() => {
    vectorLayer?.dispose();
    vectorSource?.clear();
    vectorImageSource?.clear();
    globalMapEntities.sectors = null;

    labelsLayer?.dispose();
    vectorImageLayer?.dispose();

    map.value?.removeLayer(vectorLayer);
    map.value?.removeLayer(labelsLayer);
    map.value?.removeLayer(vectorImageLayer);
});
</script>
