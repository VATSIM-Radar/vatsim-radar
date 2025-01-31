<template>
    <slot/>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import type { MapLayoutLayerExternal } from '~/types/map';
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import TileLayer from 'ol/layer/Tile';
import type { TileJSON } from 'ol/source';
import { XYZ } from 'ol/source';
import { buildAttributions } from '~/utils/map';
import type { PartialRecord } from '~/types';
import { applyStyle } from 'ol-mapbox-style';
import VectorTileLayer from 'ol/layer/VectorTile';
import { GeoJSON } from 'ol/format';
import VectorSource from 'ol/source/Vector';
import { Fill, Style } from 'ol/style';
import VectorImageLayer from 'ol/layer/VectorImage';
import { isVatGlassesActive } from '~/utils/data/vatglasses';
import { isProductionMode } from '~/utils/shared';
import protoWithLabels, { noLabels as protoNoLabels } from 'protomaps-themes-base';

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
    pm?: false;
}

type IVectorLayer = Pick<Layer, 'attribution' | 'url' | 'lightThemeUrl'> & {
    vector: true;
    pm?: false;
};

type IPMLayer = Pick<Layer, 'attribution' | 'url' | 'lightThemeUrl'> & {
    pm: true;
    vector?: false;
    theme: 'black' | 'dark' | 'grayscale' | 'light' | 'white';
};

const externalLayers: PartialRecord<MapLayoutLayerExternal, Layer | IVectorLayer> = {
    Satellite: {
        url: `/layers/esri/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=AAPTxy8BH1VEsoebNVZXo8HurDMQfxZXP-jwqkEIQ3jLIZoTUg5nKRlVTBwkT6rjROYxXw0nv2RYA5yv6hZBods45S-mobzoAHIy4R8ZP_kadIqOrU5bJTyqic63SPSS8-EeC1qFvTOFBd2sQtynCOUMdk4YWCR7Jj7C85_hfBAYvFj9lI1jEmCNzQJqyoitGPjNwW-efZ318KR2nhYadO4TEDqT9D53FlaDZffQjSMeKD8.AT1_chWUHHAZ`,
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

const layer = computed<Layer | IVectorLayer | IPMLayer>(() => {
    let layer = store.localSettings.filters?.layers?.layer ?? 'protoData';

    if (layer === 'OSM' && store.theme !== 'light') layer = 'protoGeneral';

    if (layer === 'Satellite' && isProductionMode()) {
        layer = 'protoData';
        setUserLocalSettings({
            filters: {
                layers: {
                    layer: 'protoData',
                },
            },
        });
    }

    if (layer === 'basic') {
        return {
            url: 'basic',
        };
    }

    if (!(layer in externalLayers)) {
        const isGeneral = layer === 'protoGeneral';
        const isGrayscale = store.getCurrentTheme === 'default' ? false : store.localSettings.filters?.layers?.layer === 'protoDataGray';

        let theme: IPMLayer['theme'];

        if (isGeneral) {
            theme = store.getCurrentTheme === 'default' ? 'dark' : 'light';
        }
        else if (isGrayscale) {
            theme = 'grayscale';
        }
        else {
            theme = store.getCurrentTheme === 'default' ? 'black' : 'white';
        }

        return {
            attribution: {
                title: 'Protomaps',
                url: 'https://github.com/protomaps/basemaps',
            },
            url: '/tiles.json',
            pm: true,
            theme,
        };
    }

    return externalLayers[layer as MapLayoutLayerExternal]!;
});
const layerUrl = computed(() => layer.value.url + layer.value.lightThemeUrl + ('theme' in layer.value ? layer.value.theme : ''));

const transparencySettings = computed(() => JSON.stringify(store.localSettings.filters?.layers?.transparencySettings ?? '{}'));

const opacity = computed(() => {
    switch (store.localSettings.filters?.layers?.layer) {
        case 'OSM':
            return store.localSettings.filters.layers.transparencySettings?.osm || 0.5;
        case 'Satellite':
            return store.localSettings.filters.layers.transparencySettings?.satellite || 0.3;
        default:
            return 1;
    }
});

const theme = computed(() => store.theme);

const map = inject<ShallowRef<Map | null>>('map')!;
const tileLayer = shallowRef<TileLayer<XYZ | TileJSON> | VectorTileLayer | null>();
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

const isLabels = computed(() => store.localSettings.filters?.layers?.layerLabels ?? true);

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
            declutter: false,
            updateWhileAnimating: false,
            updateWhileInteracting: false,
            renderMode: 'hybrid',
        });

        const url = store.theme === 'light' ? (layer.value.lightThemeUrl || layer.value.url) : layer.value.url;
        const json = await $fetch<Record<string, any>>(store.theme === 'light' ? (layer.value.lightThemeUrl || layer.value.url) : layer.value.url);
        json.id = url;

        if (json.layers) {
            json.layers = json.layers.filter((layer: Record<string, any>) => allowedLayers.test(layer.id));
        }

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

    if (layer.value.pm) {
        const glStyle = {
            version: 8,
            glyphs: 'https://cdn.protomaps.com/fonts/pbf/{fontstack}/{range}.pbf',
            sources: {
                protomaps: {
                    type: 'vector',
                    url: layer.value.url,
                },
            },
            layers: (isLabels.value ? protoWithLabels : protoNoLabels)('protomaps', layer.value.theme, 'en'),
        };

        tileLayer.value = new VectorTileLayer({
            declutter: false,
            updateWhileAnimating: false,
            updateWhileInteracting: false,
            renderMode: 'hybrid',
        });

        glStyle.layers = glStyle.layers.filter((layer: Record<string, any>) => layer.id !== 'roads_labels_minor' && layer.id !== 'roads_labels_major' && layer.id !== 'water_waterway_label');

        await applyStyle(tileLayer.value, glStyle);

        attributionLayer = new TileLayer({
            source: new XYZ({
                attributions: buildAttributions(layer.value.attribution?.title || false, layer.value.attribution?.url ?? ''),
            }),
        });
        map.value?.addLayer(attributionLayer);
        map.value?.addLayer(tileLayer.value);

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

const vatglassesEnabled = isVatGlassesActive();

watch([layerUrl, theme, vatglassesEnabled, transparencySettings, isLabels], initLayer);

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
