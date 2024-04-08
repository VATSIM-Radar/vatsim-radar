<template>
    <slot v-if="!controllers.length"/>
    <div v-else v-show="false">
        <!-- @todo click for touch -->
        <div class="sector-atc" ref="atcContainer" @mouseover="isHovered = true" @mouseleave="isHovered = false">
            <div class="sector-atc_name">
                <div class="sector-atc_name_main">
                    {{ !locals.length ? globals[0].icao : fir.icao }}
                </div>
                <div class="sector-atc_name_sub" v-if="globals.length">
                    {{ fir.icao }}
                </div>
            </div>
            <div class="sector-atc_popup" v-if="isHovered">
                <div class="sector-atc_popup_title">
                    {{ getATCFullName }}
                </div>
                <common-info-block
                    class="sector-atc_popup_atc"
                    v-for="(controller) in [...locals, ...globals]"
                    :key="controller.controller!.cid"
                    is-button
                    :top-items="[
                        controller.controller!.callsign,
                        controller.controller!.frequency,
                        controller.controller!.name,
                        dataStore.vatsim.data!.ratings.find(x => x.id === controller.controller!.rating)?.short ?? '',
                        getATCTime(controller.controller!),
                    ]"
                >
                    <template #bottom v-if="controller.controller?.text_atis?.length">
                        <div class="sector-atc_popup_atc__atis">
                            <div class="sector-atc_popup_atc__atis_line" v-for="atis in controller.controller.text_atis" :key="atis">
                                {{ parseCyrillic(atis) }}<br>
                            </div>
                        </div>
                    </template>
                </common-info-block>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { PropType, ShallowRef } from 'vue';
import { onMounted } from 'vue';
import { useDataStore } from '~/store/data';
import type VectorSource from 'ol/source/Vector';
import type { Feature, Map } from 'ol';
import { Overlay } from 'ol';
import { GeoJSON } from 'ol/format';
import { fromLonLat } from 'ol/proj';
import type { VatSpyData } from '~/types/data/vatspy';
import { parseCyrillic } from '~/utils/data';
import type { VatsimShortenedController } from '~/types/data/vatsim';

const props = defineProps({
    fir: {
        type: Object as PropType<VatSpyData['firs'][0]>,
        required: true,
    },
});

const dataStore = useDataStore();
const map = inject<ShallowRef<Map | null>>('map')!;
const vectorSource = inject<ShallowRef<VectorSource | null>>('vector-source')!;
const atcContainer = ref<HTMLDivElement | null>(null);
const isHovered = ref(false);
let localFeature: Feature | undefined;
let rootFeature: Feature | undefined;
let controllerOverlay: Overlay | undefined;

const atc = computed(() => dataStore.vatsim.data?.firs.filter(x => x.firs.some(x => x.boundaryId === props.fir.feature.id)) ?? []);

const locals = computed(() => atc.value.flatMap(x => x.firs.filter(x => x.controller && x.boundaryId === props.fir.feature.id)));
const globals = computed(() => atc.value.filter(x => x.controller));

const controllers = computed(() => {
    return locals.value.length ? locals.value : globals.value;
});

watch(() => controllers.value.length, async (val) => {
    if (!val && controllerOverlay) {
        map.value!.removeOverlay(controllerOverlay);
        return;
    }

    await nextTick();
    controllerOverlay = new Overlay({
        position: [props.fir.lon, props.fir.lat],
        positioning: 'center-center',
        element: atcContainer.value!,
        className: 'ol-overlay-container ol-selectable fir-hover-container',
    });
    map.value!.addOverlay(controllerOverlay);
}, {
    immediate: true,
});

const getATCFullName = computed(() => {
    const prop = !locals.value.length ? globals.value[0] ?? props.fir : props.fir;
    const country = dataStore.vatspy?.data.countries.find(x => x.code === prop.icao?.slice(0, 2));
    if (!country) return prop.name;
    return `${ prop.name } ${ country.callsign ?? 'Center' }`;
});

const getATCTime = (controller: VatsimShortenedController) => {
    const diff = (Date.now() - new Date(controller.logon_time).getTime()) / (1000 * 60);

    return `${ (`0${ Math.floor(diff / 60) }`).slice(-2) }:${ (`0${ Math.floor(diff % 60) }`).slice(-2) }`;
};

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

watch(() => props.fir.feature, init);
watch([atc, isHovered], () => {
    const controllerElement = atcContainer.value?.parentElement;
    if (isHovered.value) {
        controllerElement?.classList.add('fir-hover-container--hovered');
    }
    else {
        controllerElement?.classList.remove('fir-hover-container--hovered');
    }
    init();
});

onBeforeUnmount(() => {
    if (localFeature) {
        vectorSource.value?.removeFeature(localFeature);
    }
    if (rootFeature) {
        vectorSource.value?.removeFeature(rootFeature);
    }
    if (controllerOverlay) {
        map.value!.removeOverlay(controllerOverlay);
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

    &_popup {
        padding: 8px;
        border-radius: 8px;
        background: $neutral1000;
        position: absolute;
        z-index: 20;
        width: max-content;
        margin: 5px 0 0 10px;
        display: flex;
        flex-direction: column;
        gap: 4px;

        &_title {
            margin-bottom: 10px;
            font-weight: 600;
        }

        &_atc {
            &__atis {
                display: flex;
                flex-direction: column;
                gap: 5px;
                max-width: 350px;
            }
        }
    }
}
</style>
