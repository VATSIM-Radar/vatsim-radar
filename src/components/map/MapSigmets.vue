<template>
    <div class="sigmets"/>
</template>

<script setup lang="ts">
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import type { Sigmet } from '~/utils/backend/storage';
import { GeoJSON } from 'ol/format';
import VectorSource from 'ol/source/Vector';
import VectorImageLayer from 'ol/layer/VectorImage';
import type { AmdbLayerName } from '@navigraph/amdb';
import { Fill, Stroke, Style } from 'ol/style';
import type { ColorsList } from '~/utils/backend/styles';

const { refresh, data } = await useFetch('/api/data/sigmets');
const map = inject<ShallowRef<Map | null>>('map')!;
const openSigmet = ref<Sigmet | null>(null);

let layer: VectorImageLayer<any>;
let source: VectorSource;

const jsonFeatures = computed(() => {
    return geojson.readFeatures(data.value, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857',
    });
});

const sigmets = computed(() => {
    return jsonFeatures.value ?? [];
});

const geojson = new GeoJSON();

function buildStyle(color: ColorsList) {
    return new Style({
        fill: new Fill({
            color: `rgba(${ getCurrentThemeRgbColor(color).join(',') }, 0.2)`,
        }),
        stroke: new Stroke({
            color: `rgba(${ getCurrentThemeRgbColor(color).join(',') }, 0.4)`,
            width: 1,
        }),
        zIndex: 1,
    });
}

const styles = {
    default: buildStyle('primary300'),
    ICE: buildStyle('primary300'),
    TURB: buildStyle('warning300'),
};

watch([jsonFeatures, map], () => {
    if (!map.value) return;

    if (!source) {
        source = new VectorSource<any>({
            features: [],
            wrapX: true,
        });

        layer = new VectorImageLayer<any>({
            source: source,
            properties: {
                type: 'sigmets',
            },
            zIndex: 6,
            style: function(_feature) {
                const properties = _feature.getProperties() as Sigmet['properties'];

                console.log(properties.hazard);

                return styles.default;
            },
        });

        map.value.addLayer(layer);
    }

    source.removeFeatures(source.getFeatures());
    source.addFeatures(jsonFeatures.value);
}, {
    immediate: true,
});
</script>

<style scoped lang="scss">
.sigmets {

}
</style>
