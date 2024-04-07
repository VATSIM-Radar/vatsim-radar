<template>
    <slot/>
</template>

<script setup lang="ts">
import { onMounted   } from 'vue';
import type { PropType, ShallowRef } from 'vue';
import type { Feature as GeoJsonFeature, MultiPolygon } from 'geojson';
import { useDataStore } from '~/store/data';
import type VectorSource from 'ol/source/Vector';
import type { Feature, Map } from 'ol';
import { GeoJSON } from 'ol/format';
import { fromLonLat } from 'ol/proj';

const props = defineProps({
    feature: {
        type: Object as PropType<GeoJsonFeature<MultiPolygon>>,
        required: true,
    },
});

const dataStore = useDataStore();

const vectorSource = inject<ShallowRef<VectorSource | null>>('vector-source')!;
const map = inject<ShallowRef<Map | null>>('map')!;
let localFeature: Feature | undefined;
let rootFeature: Feature | undefined;

const atc = computed(() => dataStore.vatsim.data?.firs.filter(x => x.firs.some(x => x.boundaryId === props.feature.id)) ?? []);

const init = () => {
    if (!vectorSource.value) return;

    const rootControllers = atc.value.filter(x => x.controller).map(x => x.controller!);
    const locals = atc.value.flatMap(x => x.firs.filter(x => x.controller && x.boundaryId === props.feature.id));

    const localFeatureType = (locals.length && !rootControllers.length) ? 'local' : 'default';

    const geoJson = new GeoJSON();

    const featureWithXY = {
        ...props.feature,
        geometry: {
            ...props.feature.geometry,
            coordinates: props.feature?.geometry.coordinates.map(x => x.map(x => x.map(x => fromLonLat(x)))),
        },
    };

    if (!localFeature) {
        localFeature = geoJson.readFeature({
            ...featureWithXY,
            properties: {
                ...(featureWithXY.properties ?? {}),
                type: localFeatureType,
            },
        });

        vectorSource.value.addFeature(localFeature);
    }
    else if (localFeature && localFeature.getProperties().type !== localFeatureType) {
        localFeature.setProperties({
            type: localFeatureType,
        });
    }

    if (!rootFeature && rootControllers.length) {
        rootFeature = geoJson.readFeature({
            ...featureWithXY,
            id: `${ featureWithXY.id }-root`,
            properties: {
                ...(featureWithXY.properties ?? {}),
                type: 'root',
            },
        });

        vectorSource.value.addFeature(rootFeature);
    }
    else if (rootFeature && !rootControllers.length) {
        vectorSource.value?.removeFeature(rootFeature);
        rootFeature = undefined;
    }
};

onMounted(init);

watch(() => props.feature, init);
watch(atc, init);

onBeforeUnmount(() => {
    if (localFeature) {
        vectorSource.value?.removeFeature(localFeature);
    }
    if (rootFeature) {
        vectorSource.value?.removeFeature(rootFeature);
    }
});
</script>
