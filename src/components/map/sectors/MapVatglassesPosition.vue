<script setup lang="ts">
import type { PropType, ShallowRef } from 'vue';
import { onMounted } from 'vue';
import type VectorSource from 'ol/source/Vector';
import { convertToOpenLayersFeatures } from '~/utils/data/vatglasses';
import type { ActiveVatglassesPosition } from '~/utils/data/vatglasses';
import type { Feature } from 'ol';
import { useStore } from '~/store';

const props = defineProps({
    position: {
        type: Object as PropType<ActiveVatglassesPosition>,
        required: true,
    },
});

const store = useStore();

const vectorSource = inject<ShallowRef<VectorSource | null>>('vector-source')!;
let sectorFeatures: Feature[] = [];


const init = () => {
    if (!vectorSource.value) return;
    if (!store.mapSettings.vatglasses?.active) return;

    if (sectorFeatures) {
        for (const feature of sectorFeatures) {
            vectorSource.value?.removeFeature(feature);
        }
        sectorFeatures = [];
    }

    if (store.mapSettings.vatglasses.combined) {
        if (props.position.sectorsCombined) {
            for (const sectorFeature of convertToOpenLayersFeatures(props.position.sectorsCombined ?? [])) {
                sectorFeatures.push(sectorFeature);
                vectorSource.value.addFeature(sectorFeature);
            }
        }
    }
    else {
        const sectorsAtLevel = [];
        for (const sector of props.position.sectors ?? []) {
            if (sector.properties?.min <= (store.localSettings.vatglassesLevel ?? 240) && sector.properties?.max >= (store.localSettings.vatglassesLevel ?? 240)) {
                sectorsAtLevel.push(sector);
            }
        }

        convertToOpenLayersFeatures(sectorsAtLevel).forEach(sectorFeature => {
            sectorFeatures.push(sectorFeature);
            vectorSource.value?.addFeature(sectorFeature);
        });
    }
};


const positionLastUpdated = computed(() => props.position.lastUpdated?.value);

watch(positionLastUpdated, () => {
    init();
});

const vatglassesLevel = computed(() => store.localSettings.vatglassesLevel);
const vatglassesActive = computed(() => store.mapSettings.vatglasses?.active);
const vatglassesCombined = computed(() => store.mapSettings.vatglasses?.combined);
watch([vatglassesLevel, vatglassesActive, vatglassesCombined], () => {
    init();
});


onMounted(() => {
    init();
});


onBeforeUnmount(() => {
    if (sectorFeatures) {
        for (const feature of sectorFeatures) {
            vectorSource.value?.removeFeature(feature);
        }
    }
});
</script>
