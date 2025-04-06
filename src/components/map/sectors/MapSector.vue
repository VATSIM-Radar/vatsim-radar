<template>
    <slot v-if="!controllers.length || store.mapSettings.visibility?.atcLabels"/>
    <map-overlay
        v-else
        :active-z-index="20"
        model-value
        persistent
        :popup="isHovered"
        :settings="{
            position: [fir.lon, fir.lat],
            positioning: 'center-center',
            stopEvent: isHovered && hasScroll,
        }"
        :z-index="15"
        @mouseleave="isHovered = false"
        @update:overlay="!$event ? isHovered = false : undefined"
    >
        <div
            class="sector-atc"
            :class="{ 'sector-atc--hovered': isHovered }"
            :style="{
                '--bg': getSelectedColorFromSettings('centerBg') ?? undefined,
                '--bg-raw': getSelectedColorFromSettings('centerBg', true) ?? undefined,
                '--text': getSelectedColorFromSettings('centerText') ?? undefined,
                '--text-raw': getSelectedColorFromSettings('centerText', true) ?? undefined,
            }"
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
                ref="controllerInfo"
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
import { getAirportCountry } from '~/composables/airport';
import { useScrollExists } from '~/composables';
import { useStore } from '~/store';
import { isVatGlassesActive } from '~/utils/data/vatglasses';
import { useRadarError } from '~/composables/errors';

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

const controllerInfo = ref<{ $el: HTMLDivElement } | null>(null);

const hasScroll = useScrollExists(computed(() => {
    return controllerInfo.value?.$el.querySelector('.atc-popup_list');
}));

const mapStore = useMapStore();
const dataStore = useDataStore();
const vectorSource = inject<ShallowRef<VectorSource | null>>('vector-source')!;
const isHovered = ref(false);
let localFeature: Feature | undefined;
let rootFeature: Feature | undefined;

const vatGlassesActive = isVatGlassesActive();

const store = useStore();

const locals = computed(() => {
    if (!dataStore.vatglassesActivePositions.value) return [];

    let filtered = props.atc.filter(x => !x.icao && x.controller && x.firs.filter(x => x.boundaryId === props.fir.feature.id));
    filtered = filtered.filter((x, index) => index <= filtered.findIndex(y => y.controller?.cid === x.controller!.cid));
    if (!vatGlassesActive.value || !dataStore.vatglassesActivePositions.value['fallback']) return filtered;

    const fallbackPositions = Object.keys(dataStore.vatglassesActivePositions.value['fallback']);
    return filtered.filter(x => fallbackPositions.includes(x.controller?.callsign)); // We filter out all stations which are not in the fallback list, because they are shown with vatglasses sector. We need the vatspy sectors as fallback for positions which are not defined in vatglasses.
});

const globals = computed(() => {
    let filtered = props.atc.filter(x => x.icao && x.controller);
    filtered = filtered.filter((x, index) => index <= filtered.findIndex(y => y.controller?.cid === x.controller!.cid));
    if (!vatGlassesActive.value || !dataStore.vatglassesActivePositions.value['fallback']) return filtered;

    const fallbackPositions = Object.keys(dataStore.vatglassesActivePositions.value['fallback']);
    return filtered.filter(x => fallbackPositions.includes(x.controller?.callsign)); // We filter out all stations which are not in the fallback list, because they are shown with vatglasses sector. We need the vatspy sectors as fallback for positions which are not defined in vatglasses.
});

const controllers = computed(() => {
    return locals.value.length ? locals.value : globals.value;
});

const getATCFullName = computed(() => {
    const prop = props.fir;

    if (!locals.value.length && globals.value[0]) {
        return globals.value[0].name;
    }

    const country = getAirportCountry(prop.icao);
    if (!country) return prop.name;

    if ('isOceanic' in prop && prop.isOceanic && !country.callsign) return `${ prop.name } Radio`;
    return `${ prop.name } ${ country.callsign ?? 'Center' }`;
});

const geoJson = new GeoJSON({
    featureProjection: 'EPSG:4326',
    dataProjection: 'EPSG:4326',
});

const init = () => {
    if (!vectorSource.value) return;

    try {
        const localFeatureType = (isHovered.value && locals.value.length) ? 'hovered' : locals.value.length ? 'local' : 'default';
        const rootFeatureType = (isHovered.value && globals.value.length) ? 'hovered-root' : 'root';

        if (!localFeature) {
            localFeature = geoJson.readFeature({
                ...props.fir.feature,
                id: undefined,
                properties: {
                    ...(props.fir.feature.properties ?? {}),
                    type: localFeatureType,
                },
            }) as Feature<any>;

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
                id: undefined,
                properties: {
                    ...(props.fir.feature.properties ?? {}),
                    type: rootFeatureType,
                },
            }) as Feature<any>;

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
    }
    catch (e) {
        useRadarError(e);
    }
};

onMounted(init);

watch([() => props.atc, isHovered, locals], init);

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
        border: 1px solid rgb(var(--text-raw, var(--lightgray150)), 0.1);
        border-radius: 4px;

        font-size: 11px;
        font-weight: 700;
        color: var(--text, $lightgray150);
        text-align: center;

        background: var(--bg, $darkgray850);

        &_sub {
            color: rgb(var(--text-raw, var(--lightgray150)), 0.5);
        }
    }

    &--hovered .sector-atc_name {
        border-color: varToRgba('lightgray150', 0.1);
        color: $lightgray100Orig;
        background: $primary500;

        &_sub {
            color: $lightgray200Orig;
        }
    }
}
</style>
