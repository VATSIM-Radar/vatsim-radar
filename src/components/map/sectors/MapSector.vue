<template>
    <slot v-if="!controllers.length"/>
    <map-overlay
        v-else
        :active-z-index="20"
        model-value
        persistent
        :popup="isHovered"
        :settings="{
            position: [fir.lon, fir.lat],
            positioning: 'center-center',
            stopEvent: isHovered,
        }"
        :z-index="15"
        @mouseleave="isHovered = false"
        @update:overlay="!$event ? isHovered = false : undefined"
    >
        <div
            class="sector-atc"
            :class="{ 'sector-atc--hovered': isHovered }"
            @mouseover="$nextTick(() => isHovered = mapStore.canShowOverlay)"
        >
            <div class="sector-atc_name">
                <div class="sector-atc_name_main">
                    {{ !locals.length ? globals[0].icao : fir.icao }}
                </div>
                <div
                    v-if="globals.length"
                    class="sector-atc_name_sub"
                >
                    {{ locals.length ? globals[0].icao : fir.icao }}
                </div>
            </div>
        </div>
        <template
            v-if="isHovered"
            #popup
        >
            <common-controller-info
                absolute
                :controllers="[...locals.map(x => x.controller!), ...globals.map(x => x.controller!)]"
                show-atis
            >
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
import type VectorSource from 'ol/source/Vector';
import type { Feature } from 'ol';
import { GeoJSON } from 'ol/format';
import type { VatSpyData, VatSpyDataFeature } from '~/types/data/vatspy';
import { useMapStore } from '~/store/map';
import CommonControllerInfo from '~/components/common/vatsim/CommonControllerInfo.vue';
import MapOverlay from '~/components/map/MapOverlay.vue';

const props = defineProps({
    fir: {
        type: Object as PropType<VatSpyData['firs'][0]>,
        required: true,
    },
    atc: {
        type: Array as PropType<VatSpyDataFeature[]>,
        required: true,
    },
});

defineSlots<{ default: () => any }>();

const dataStore = useDataStore();
const mapStore = useMapStore();
const vectorSource = inject<ShallowRef<VectorSource | null>>('vector-source')!;
const isHovered = ref(false);
let localFeature: Feature | undefined;
let rootFeature: Feature | undefined;

const locals = computed(() => {
    const filtered = props.atc.filter(x => !x.icao && x.controller && x.firs.filter(x => x.boundaryId === props.fir.feature.id));

    return filtered.filter((x, index) => index <= filtered.findIndex(y => y.controller?.cid === x.controller!.cid));
});

const globals = computed(() => {
    const filtered = props.atc.filter(x => x.icao && x.controller);

    return filtered.filter((x, index) => index <= filtered.findIndex(y => y.controller?.cid === x.controller!.cid));
});

const controllers = computed(() => {
    return locals.value.length ? locals.value : globals.value;
});

const getATCFullName = computed(() => {
    const prop = !locals.value.length ? globals.value[0] ?? props.fir : props.fir;
    const country = dataStore.vatspy.value?.data.countries.find(x => x.code === prop.icao?.slice(0, 2));
    if ('isOceanic' in prop && prop.isOceanic) return `${ prop.name } Radio`;
    if (!country) return prop.name;
    return `${ prop.name } ${ country.callsign ?? 'Center' }`;
});

const geoJson = new GeoJSON();

const init = () => {
    if (!vectorSource.value) return;

    const localFeatureType = (isHovered.value && locals.value.length) ? 'hovered' : locals.value.length ? 'local' : 'default';
    const rootFeatureType = (isHovered.value && globals.value.length) ? 'hovered-root' : 'root';

    if (!localFeature) {
        localFeature = geoJson.readFeature({
            ...props.fir.feature,
            properties: {
                ...(props.fir.feature.properties ?? {}),
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

    if (!rootFeature && globals.value.length && !locals.value.length) {
        rootFeature = geoJson.readFeature({
            ...props.fir.feature,
            id: `${ props.fir.feature.id }-root`,
            properties: {
                ...(props.fir.feature.properties ?? {}),
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
    else if (rootFeature && (!globals.value.length || locals.value.length)) {
        vectorSource.value?.removeFeature(rootFeature);
        rootFeature = undefined;
    }
};

onMounted(init);

watch([() => props.atc, isHovered], init);

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

<style lang="scss">
.theme-light .sector-atc_name {
    box-shadow: 0 0 10px 2px varToRgba('lightgray150', 0.15);
}
</style>

<style lang="scss" scoped>
.sector-atc {
    &_name {
        cursor: pointer;
        user-select: none;

        position: relative;
        z-index: 10;

        padding: 4px;

        font-size: 11px;
        font-weight: 700;
        color: $lightgray150;
        text-align: center;

        background: $darkgray850;
        border: 1px solid varToRgba('lightgray150', 0.1);
        border-radius: 4px;

        &_sub {
            color: varToRgba('lightgray150', 0.5);
        }
    }

    &--hovered .sector-atc_name {
        color: $lightgray100Orig;
        background: $primary500;

        &_sub {
            color: $lightgray200Orig;
        }
    }
}
</style>
