<template>
    <view-map mode="map">
        <common-info-popup
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
                <common-radio-group
                    v-model="showConfig"
                    :items="[{ value: 'all' }, { value: 'previous' }, { value: 'changed' }, { value: 'added' }, { value: 'removed' }]"
                />
            </template>
        </common-info-popup>
    </view-map>
</template>

<script setup lang="ts">
import ViewMap from '~/components/views/ViewMap.vue';
import CommonRadioGroup from '~/components/common/basic/CommonRadioGroup.vue';
import CommonInfoPopup from '~/components/common/popup/CommonInfoPopup.vue';
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import VectorImageLayer from 'ol/layer/VectorImage';
import VectorSource from 'ol/source/Vector';
import type { FeatureCollection } from 'geojson';
import { GeoJSON } from 'ol/format';
import type { ColorsList } from '~/utils/backend/styles';
import { Fill, Stroke, Style } from 'ol/style';

const map = inject<ShallowRef<Map | null>>('map')!;

const showConfig = ref<'all' | 'changed' | 'previous' | 'added' | 'removed'>('all');

useHead(() => ({
    title: 'Debug',
}));

const route = useRoute();
let layer: VectorImageLayer | undefined;
const source = shallowRef<VectorSource | undefined>();

const type = computed(() => route.params.type as string);
const id = computed(() => +route.params.id);
const geoJSON = new GeoJSON({
    featureProjection: 'EPSG:4326',
    dataProjection: 'EPSG:4326',
});

const { data: geojson } = useAsyncData(() => $fetch<FeatureCollection>(`/api/data/debug/${ type.value }/${ id.value }/compare`), {
    watch: [type, id],
});

watch([showConfig, geojson, source], () => {
    if (!geojson.value || !source.value) return;

    const features = geoJSON.readFeatures({
        ...geojson.value,
        features: geojson.value.features.filter(x => {
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
}, {
    immediate: true,
});

function buildStyle(color: ColorsList) {
    return new Style({
        fill: new Fill({ color: `rgba(${ radarColors[`${ color }Rgb`].join(',') },  0.2)` }),
        stroke: new Stroke({
            width: 1,
            color: `rgba(${ radarColors[`${ color }Rgb`].join(',') }, 1)`,
        }),
    });
}

watch(map, val => {
    if (!val) return;

    const themes = {
        primary500: buildStyle('primary500'),
        success500: buildStyle('success500'),
        error500: buildStyle('error500'),
        info500: buildStyle('info500'),
    };

    layer = new VectorImageLayer({
        source: source.value = new VectorSource(),
        style: feature => {
            return themes[feature.getProperties().fill as keyof typeof themes];
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
</style>
