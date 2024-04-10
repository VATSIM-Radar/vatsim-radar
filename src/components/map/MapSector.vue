<template>
    <slot v-if="!controllers.length"/>
    <map-overlay
        :model-value="!!controllers.length"
        :popup="isHovered"
        @update:overlay="!$event ? isHovered = false : undefined"
        persistent
        v-else
        :settings="{
            position: [fir.lon, fir.lat],
            positioning: 'center-center',
        }"
        :z-index="15"
        :active-z-index="20"
        @mouseleave="isHovered = false"
    >
        <!-- @todo click for touch -->
        <div class="sector-atc" @mouseover="$nextTick(() => isHovered = true)">
            <div class="sector-atc_name">
                <div class="sector-atc_name_main">
                    {{ !locals.length ? globals[0].icao : fir.icao }}
                </div>
                <div class="sector-atc_name_sub" v-if="globals.length">
                    {{ fir.icao }}
                </div>
            </div>
        </div>
        <template #popup v-if="isHovered">
            <common-controller-info :controllers="[...locals.map(x => x.controller!), ...globals.map(x => x.controller!)]" show-atis>
                <template #title>
                    {{ getATCFullName }}
                </template>
            </common-controller-info>
        </template>
    </map-overlay>
</template>

<script setup lang="ts">
import type { PropType, ShallowRef } from 'vue';
import { onMounted } from 'vue';
import { useDataStore } from '~/store/data';
import type VectorSource from 'ol/source/Vector';
import type { Feature } from 'ol';
import { GeoJSON } from 'ol/format';
import { fromLonLat } from 'ol/proj';
import type { VatSpyData } from '~/types/data/vatspy';

const props = defineProps({
    fir: {
        type: Object as PropType<VatSpyData['firs'][0]>,
        required: true,
    },
});

const dataStore = useDataStore();
const vectorSource = inject<ShallowRef<VectorSource | null>>('vector-source')!;
const isHovered = ref(false);
let localFeature: Feature | undefined;
let rootFeature: Feature | undefined;

const atc = computed(() => dataStore.vatsim.data?.firs.filter(x => x.firs.some(x => x.boundaryId === props.fir.feature.id)) ?? []);

const locals = computed(() => {
    const filtered = atc.value.flatMap(x => x.firs.filter(x => x.controller && x.boundaryId === props.fir.feature.id));

    return filtered.filter((x, index) => index <= filtered.findIndex(y => y.controller?.cid === x.controller!.cid));
});

const globals = computed(() => {
    const filtered = atc.value.filter(x => x.controller);

    return filtered.filter((x, index) => index <= filtered.findIndex(y => y.controller?.cid === x.controller!.cid));
});

const controllers = computed(() => {
    return locals.value.length ? locals.value : globals.value;
});

const getATCFullName = computed(() => {
    const prop = !locals.value.length ? globals.value[0] ?? props.fir : props.fir;
    const country = dataStore.vatspy?.data.countries.find(x => x.code === prop.icao?.slice(0, 2));
    if (!country) return prop.name;
    return `${ prop.name } ${ country.callsign ?? 'Center' }`;
});

const init = () => {
    if (!vectorSource.value) return;

    const localFeatureType = isHovered.value ? 'hovered' : (locals.value.length && !globals.value.length) ? 'local' : 'default';
    const rootFeatureType = isHovered.value ? 'hovered' : 'root';

    const geoJson = new GeoJSON();

    const featureWithXY = {
        ...props.fir.feature,
        geometry: {
            ...props.fir.feature.geometry,
            coordinates: props.fir.feature?.geometry.coordinates.map(x => x.map(x => x.map(x => fromLonLat(x)))),
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

    if (!rootFeature && globals.value.length) {
        rootFeature = geoJson.readFeature({
            ...featureWithXY,
            id: `${ featureWithXY.id }-root`,
            properties: {
                ...(featureWithXY.properties ?? {}),
                type: rootFeatureType,
            },
        });

        vectorSource.value.addFeature(rootFeature);
    }
    else if (rootFeature && rootFeature.getProperties().type !== rootFeatureType) {
        rootFeature.setProperties({
            type: rootFeatureType,
        });
    }
    else if (rootFeature && !globals.value.length) {
        vectorSource.value?.removeFeature(rootFeature);
        rootFeature = undefined;
    }
};

onMounted(init);

const featureComputed = computed(() => props.fir?.feature);

watch([atc, featureComputed, isHovered], init);

onBeforeUnmount(() => {
    if (localFeature) {
        vectorSource.value?.removeFeature(localFeature);
        localFeature.dispose();
    }
    if (rootFeature) {
        vectorSource.value?.removeFeature(rootFeature);
        rootFeature.dispose();
    }
});
</script>

<style lang="scss">
.fir-hover-container {
    z-index: 15;

    &--hovered {
        z-index: 20;
    }
}
</style>

<style lang="scss" scoped>
.sector-atc {
    &_name {
        cursor: pointer;
        background: $neutral900;
        color: $neutral150;
        padding: 4px;
        border-radius: 4px;
        font-weight: 700;
        font-size: 14px;
        text-align: center;
        position: relative;
        z-index: 10;

        &_sub {
            color: varToRgba('neutral150', 0.5);
        }
    }
}
</style>
