<template>
    <slot/>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import type { MapLayoutLayerExternal } from '~/types/map';
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import TileLayer from 'ol/layer/Tile';
import { XYZ } from 'ol/source';
import { buildAttributions } from '~/utils/map';
import type { PartialRecord } from '~/types';
import { applyStyle } from 'ol-mapbox-style';
import VectorTileLayer from 'ol/layer/VectorTile';
import { GeoJSON } from 'ol/format';
import VectorSource from 'ol/source/Vector';
import { Fill, Style } from 'ol/style';
import VectorImageLayer from 'ol/layer/VectorImage';

defineSlots<{ default: () => any }>();

const store = useStore();

interface Layer {
    attribution?: {
        title: string;
        url: string;
    };
    size?: number;
    url: string;
    lightThemeUrl?: string;
    vector?: false;
}

type IVectorLayer = Pick<Layer, 'attribution' | 'url' | 'lightThemeUrl'> & {
    vector: true;
};

const externalLayers: PartialRecord<MapLayoutLayerExternal, Layer | IVectorLayer> = {
    Satellite: {
        url: `https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=AAPTxy8BH1VEsoebNVZXo8HurDMQfxZXP-jwqkEIQ3jLIZoTUg5nKRlVTBwkT6rjROYxXw0nv2RYA5yv6hZBods45S-mobzoAHIy4R8ZP_kadIqOrU5bJTyqic63SPSS8-EeC1qFvTOFBd2sQtynCOUMdk4YWCR7Jj7C85_hfBAYvFj9lI1jEmCNzQJqyoitGPjNwW-efZ318KR2nhYadO4TEDqT9D53FlaDZffQjSMeKD8.AT1_chWUHHAZ`,
    },
    OSM: {
        attribution: {
            title: 'OpenStreetMaps',
            url: 'https://openstreetmap.org/',
        },
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    },
};

/* enum InternalThemes {
    darkSatelliteL = 'clxpxzi3300ld01qqb343fuv8',
    darkSatelliteNL = 'clxpygplc00my01qwasza7aft',
    darkL = 'clxpvwey9006j01r08g6fdwtp',
    darkNL = 'clxpxxj6w00lc01qqh0dc2d4i',

    lightSatelliteL = 'clxpysco700n001qw2a9u61ar',
    lightSatelliteNL = 'clxpyxm4700nk01pc3nttg9g4',
    lightL = 'clxpypp7d00mz01qwe0gefqi7',
    lightNL = 'clxpykjoh00nj01pcgmrudq8q',
}*/

const layer = computed<Layer | IVectorLayer>(() => {
    let layer = store.localSettings.filters?.layers?.layer ?? 'carto';

    if (layer === 'OSM' && store.theme !== 'light') layer = 'carto';

    if (layer === 'basic') {
        return {
            url: 'basic',
        };
    }

    if (layer === 'carto' || !(layer in externalLayers)) {
        const isLabels = store.localSettings.filters?.layers?.layerLabels ?? true;
        const isVector = store.localSettings.filters?.layers?.layerVector ?? false;

        if (!isVector) {
            return {
                attribution: {
                    title: 'CartoDB',
                    url: 'https://cartodb.com/attribution',
                },
                url: `https://a.basemaps.cartocdn.com/${ isLabels ? 'dark_all' : 'dark_nolabels' }/{z}/{x}/{y}.png`,
                lightThemeUrl: `https://a.basemaps.cartocdn.com/${ isLabels ? 'light_all' : 'light_nolabels' }/{z}/{x}/{y}.png`,
            };
        }
        else {
            return {
                attribution: {
                    title: 'CartoDB',
                    url: 'https://cartodb.com/attribution',
                },
                url: `https://basemaps.cartocdn.com/gl/dark-matter${ isLabels ? '' : '-nolabels' }-gl-style/style.json`,
                lightThemeUrl: `https://basemaps.cartocdn.com/gl/positron${ isLabels ? '' : '-nolabels' }-gl-style/style.json`,
                vector: true,
            };
        }
    }

    return externalLayers[layer as MapLayoutLayerExternal]!;
});
const layerUrl = computed(() => layer.value.url + layer.value.lightThemeUrl);

const transparencySettings = computed(() => JSON.stringify(store.localSettings.filters?.layers?.transparencySettings ?? '{}'));

const opacity = computed(() => {
    switch (store.localSettings.filters?.layers?.layer) {
        case 'OSM':
            return store.localSettings.filters.layers.transparencySettings?.osm ?? 0.5;
        case 'Satellite':
            return store.localSettings.filters.layers.transparencySettings?.satellite ?? 0.3;
        default:
            return 1;
    }
});

const theme = computed(() => store.theme);

const map = inject<ShallowRef<Map | null>>('map')!;
const tileLayer = shallowRef<TileLayer<XYZ> | VectorTileLayer | null>();
let attributionLayer: TileLayer<XYZ> | null = null;

useHead(() => ({
    htmlAttrs: {
        class: {
            '--dark-matter-vector': tileLayer.value instanceof VectorTileLayer && store.getCurrentTheme !== 'light',
            '--positron-vector': tileLayer.value instanceof VectorTileLayer && store.getCurrentTheme === 'light',
            '--basic-layer': layerUrl.value.startsWith('basic'),
        },
    },
}));

const allowedLayers = /^(?!roadname)(background|landcover|boundary|water|aeroway|road|rail|bridge|building|place)/;

const geoJson = new GeoJSON();

let mapSource: VectorSource | undefined;
let mapLayer: VectorImageLayer | undefined;
let style: Style | undefined;

async function initLayer() {
    if (tileLayer.value) map.value?.removeLayer(tileLayer.value);
    tileLayer.value?.dispose();

    if (attributionLayer) map.value?.removeLayer(attributionLayer);
    attributionLayer?.dispose();

    if (mapLayer) map.value?.removeLayer(mapLayer);
    mapLayer?.dispose();

    if (layer.value.url === 'basic') {
        const continents = (await import('@/assets/continents.json')).default;

        if (mapSource) {
            mapSource.clear();
        }
        else mapSource = new VectorSource();

        style ??= new Style({
            fill: new Fill({
                color: getCurrentThemeHexColor('darkgray1000'),
            }),
        });

        mapLayer = new VectorImageLayer({
            source: mapSource,
            style,
            zIndex: 0,
            imageRatio: 2,
        });

        mapSource.addFeatures(geoJson.readFeatures(continents, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857',
        }));

        map.value?.addLayer(mapLayer);

        return;
    }

    if (layer.value.vector) {
        tileLayer.value = new VectorTileLayer({
            declutter: true,
            updateWhileAnimating: false,
            updateWhileInteracting: false,
            renderMode: 'hybrid',
        });

        const url = store.theme === 'light' ? (layer.value.lightThemeUrl || layer.value.url) : layer.value.url;
        const json = await $fetch<Record<string, any>>(store.theme === 'light' ? (layer.value.lightThemeUrl || layer.value.url) : layer.value.url);
        json.id = url;

        json.layers = json.layers.filter((layer: Record<string, any>) => allowedLayers.test(layer.id));

        await applyStyle(tileLayer.value, json);

        map.value?.addLayer(tileLayer.value);
        attributionLayer = new TileLayer({
            source: new XYZ({
                attributions: buildAttributions(false, ''),
            }),
        });
        map.value?.addLayer(attributionLayer);

        return;
    }

    tileLayer.value = new TileLayer({
        source: new XYZ({
            attributions: layer.value.attribution ? buildAttributions(layer.value.attribution.title, layer.value.attribution.url) : undefined,
            url: store.theme === 'light' ? (layer.value.lightThemeUrl || layer.value.url) : layer.value.url,
            wrapX: true,
            tileSize: layer.value.size ?? 256,
        }),
        opacity: opacity.value,
        zIndex: 0,
    });
    map.value?.addLayer(tileLayer.value);
}

watch(map, val => {
    if (!val) return;

    initLayer();
}, {
    immediate: true,
});

watch([layerUrl, theme], initLayer);
watch(transparencySettings, initLayer);

onBeforeUnmount(() => {
    if (tileLayer.value) map.value?.removeLayer(tileLayer.value);
    if (mapLayer) map.value?.removeLayer(mapLayer);
});
</script>

<style lang="scss">
.--dark-matter-vector .app_content > .map {
    background: $darkgray900;
}

.--positron-vector .app_content > .map {
    background: rgb(253, 253, 250);
}

.--basic-layer .app_content > .map {
    background: $darkgray850;
}
</style>
