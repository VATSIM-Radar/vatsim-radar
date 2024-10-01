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

    if (sectorFeatures) {
        for (const feature of sectorFeatures) {
            vectorSource.value?.removeFeature(feature);
        }
        sectorFeatures = [];
    }

    if (store.localSettings.traffic?.vatglassesLevel === true) {
        if (props.position.sectorsCombined) {
            for (const sectorFeature of convertToOpenLayersFeatures(props.position.sectorsCombined ?? [])) {
                sectorFeatures.push(sectorFeature);
                vectorSource.value.addFeature(sectorFeature);
            }
        }
    }

    else if (typeof store.localSettings.traffic?.vatglassesLevel === 'number') {
        const sectorsAtLevel = [];
        for (const sector of props.position.sectors ?? []) {
            if (sector.properties?.min <= store.localSettings.traffic?.vatglassesLevel && sector.properties?.max >= store.localSettings.traffic?.vatglassesLevel) {
                sectorsAtLevel.push(sector);
            }
        }

        convertToOpenLayersFeatures(sectorsAtLevel).forEach(sectorFeature => {
            sectorFeatures.push(sectorFeature);
            vectorSource.value?.addFeature(sectorFeature);
        });
    }
};


const positionLastUpdated = computed(() => props.position.lastUpdated.value);

watch(positionLastUpdated, () => {
    init();
});

watch(() => store.localSettings.traffic?.vatglassesLevel, () => {
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
