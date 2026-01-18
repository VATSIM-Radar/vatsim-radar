<template>
    <view-map mode="map">
        <popup-overlay
            class="compare"
            disabled
            max-height="100%"
            model-value
            :sections="[{ key: 'content' }]"
        >
            <template #title>
                Settings
            </template>
            <template #content>
                <ui-radio-group
                    v-model="showConfig"
                    :items="[{ value: 'all' }, { value: 'previous' }, { value: 'changed' }, { value: 'added' }, { value: 'removed' }]"
                />
                <ui-toggle v-model="hideUnchanged">
                    Hide unchanged
                </ui-toggle>
            </template>
        </popup-overlay>
        <map-html-overlay
            v-if="openProps"
            :settings="{ position: openProps.pixel, stopEvent: true }"
            :z-index="5"
            @update:modelValue="openProps = null"
        >
            <popup-map-info
                class="props"
                @mouseleave="openProps = null"
            >
                <template #title>
                    Properties
                </template>
                <div class="props_list">
                    <div
                        v-for="(props, index) in openProps.properties"
                        :key="index"
                        class="props__item"
                    >
                        <div
                            v-for="[key, value] in Object.entries(props).filter(x => x[0] !== 'geometry' && x[0] !== 'fill')"
                            :key
                            class="__grid-info-sections __grid-info-sections--vertical"
                        >
                            <div class="__grid-info-sections_title">
                                {{ key }}
                            </div>
                            <span>
                                {{ value }}
                            </span>
                        </div>
                    </div>
                </div>
            </popup-map-info>
        </map-html-overlay>
    </view-map>
</template>

<script setup lang="ts">
import ViewMap from '~/components/views/ViewMap.vue';
import UiRadioGroup from '~/components/ui/inputs/UiRadioGroup.vue';
import PopupOverlay from '~/components/popups/PopupOverlay.vue';
import type { ShallowRef } from 'vue';
import { Feature } from 'ol';
import type { Map, MapBrowserEvent } from 'ol';
import VectorImageLayer from 'ol/layer/VectorImage';
import VectorSource from 'ol/source/Vector';
import type { FeatureCollection } from 'geojson';
import type { ColorsList } from '~/utils/server/styles';
import { Fill, Stroke, Style, Text } from 'ol/style';
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import type { Coordinate } from 'ol/coordinate';
import { Point } from 'ol/geom';
import PopupMapInfo from '~/components/popups/PopupMapInfo.vue';
import MapHtmlOverlay from '~/components/map/MapHtmlOverlay.vue';

const map = inject<ShallowRef<Map | null>>('map')!;

const showConfig = ref<'all' | 'changed' | 'previous' | 'added' | 'removed'>('all');
const hideUnchanged = ref(false);

useHead(() => ({
    title: 'Debug',
}));

const openProps = shallowRef<{
    properties: Array<Record<string, any>>;
    pixel: Coordinate;
} | null>(null);

const route = useRoute();
let layer: VectorImageLayer | undefined;
const source = shallowRef<VectorSource | undefined>();

const type = computed(() => route.params.type as string);
const id = computed(() => +route.params.id);

const { data: geojson } = useAsyncData(() => $fetch<FeatureCollection>(`/api/data/debug/${ type.value }/${ id.value }/compare`), {
    watch: [type, id],
    server: false,
});

watch([showConfig, geojson, source, hideUnchanged], () => {
    if (!geojson.value || !source.value) return;

    const features = geoJson.readFeatures({
        ...geojson.value,
        features: geojson.value.features.filter(x => {
            if (hideUnchanged.value && !x.properties!.fill) return false;

            if (!x.properties!.fill) return true;

            if (showConfig.value === 'all') return true;
            if (showConfig.value === 'changed') return x.properties!.fill === 'primary500';
            if (showConfig.value === 'previous') return x.properties!.fill === 'info500';
            if (showConfig.value === 'added') return x.properties!.fill === 'success500';
            if (showConfig.value === 'removed') return x.properties!.fill === 'error500';
            return false;
        }),
    });

    source.value?.clear();
    source.value?.addFeatures(features);
    source.value?.addFeatures(features.filter(x => x.getProperties().fill).map(x => new Feature({
        ...x.getProperties(),
        type: 'text',
        geometry: new Point([x.getProperties().label_lon, x.getProperties().label_lat]),
    })));
}, {
    immediate: true,
});

function buildStyle(color: ColorsList, fillOpacity = 0.2, strokeOpacity = 1) {
    return new Style({
        fill: new Fill({ color: `rgba(${ radarColors[`${ color }Rgb`].join(',') }, ${ fillOpacity })` }),
        stroke: new Stroke({
            width: 1,
            color: `rgba(${ radarColors[`${ color }Rgb`].join(',') }, ${ strokeOpacity })`,
        }),
    });
}

function handleMapClick(event: MapBrowserEvent<any>) {
    openProps.value = null;
    const features = map.value?.getFeaturesAtPixel(event.pixel, { hitTolerance: 2, layerFilter: mapLayer => mapLayer === layer })?.filter(x => x.getProperties().type !== 'text');

    const props = features?.map(x => x.getProperties());
    if (!props?.length) return;

    openProps.value = {
        pixel: event.coordinate,
        properties: props,
    };
}

watch(map, val => {
    if (!val || layer) return;

    const themes = {
        primary500: buildStyle('primary500'),
        success500: buildStyle('success500'),
        error500: buildStyle('error500'),
        info500: buildStyle('info500'),
        default: buildStyle('lightgray200', 0.05, 0.2),
    };

    val.on('singleclick', handleMapClick);

    layer = new VectorImageLayer({
        source: source.value = new VectorSource(),
        declutter: false,
        style: feature => {
            const properties = feature.getProperties();

            if (properties.type === 'text') {
                return new Style({
                    text: new Text({
                        text: properties.id,
                        font: 'bold 12px Montserrat',
                        fill: new Fill({
                            color: `rgba(${ radarColors[`${ properties.fill as ColorsList }Rgb`].join(',') }, 0.5)`,
                        }),
                        backgroundFill: new Fill({
                            color: `rgba(${ getCurrentThemeRgbColor('darkgray950').join(',') }, 1)`,
                        }),
                        backgroundStroke: new Stroke({
                            color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.15)`,
                        }),
                        padding: [2, 0, 2, 2],
                    }),
                });
            }

            if (!properties.fill) return themes.default;
            return themes[properties.fill as keyof typeof themes];
        },
        zIndex: 2,
    });
    val.addLayer(layer);
});

onBeforeUnmount(() => {
    layer?.dispose();
    if (layer) {
        map.value?.removeLayer(layer);
    }
    map.value?.un('singleclick', handleMapClick);
});
</script>

<style lang="scss" scoped>
.compare {
    position: absolute;
    z-index: 5;
    top: 10px;
    left: 10px;

    width: 250px;
    border-radius: 8px;
}

.props {
    &_list {
        cursor: initial;

        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;

        max-height: 300px;
    }

    &__item {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;

        max-width: 350px;
        padding: 8px;
        border-radius: 4px;

        font-size: 13px;
        overflow-wrap: anywhere;

        background: $darkgray900;

        @include mobileOnly {
            max-width: 70dvw;
        }

        .__grid-info-sections {
            gap: 0 !important;
            padding: 8px;
            border-radius: 8px;
            background: $darkgray850;
        }
    }
}
</style>
