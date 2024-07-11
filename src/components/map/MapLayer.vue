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
}

const externalLayers: Record<MapLayoutLayerExternal, Layer> = {
    CartoDB: {
        attribution: {
            title: 'CartoDB',
            url: 'https://cartodb.com/attribution',
        },
        url: '/layers/carto/dark_nolabels/{z}/{x}/{y}.png',
        lightThemeUrl: '/layers/carto/light_nolabels/{z}/{x}/{y}.png',
    },
    CartoDBLabels: {
        attribution: {
            title: 'CartoDB',
            url: 'https://cartodb.com/attribution',
        },
        url: '/layers/carto/dark_all/{z}/{x}/{y}.png',
        lightThemeUrl: '/layers/carto/light_all/{z}/{x}/{y}.png',
    },
    /* Jawg: {
        attribution: {
            title: 'Jawg',
            url: 'https://www.jawg.io',
        },
        url: '/layers/jawg/1578fbb3-df30-4ffd-a1ed-84fac385f59d/{z}/{x}/{y}.png?access-token=Ly133Lgdn5FiEmVwqE1hLT732DJuGdMZmxm6TcIEGCiKARCwXmAHPHpj58Lwxb1L',
        lightThemeUrl: '/layers/carto/light_nolabels/{z}/{x}/{y}.png',
    },*/
    Jawg: {
        attribution: {
            title: 'CartoDB',
            url: 'https://cartodb.com/attribution',
        },
        url: '/layers/carto/dark_nolabels/{z}/{x}/{y}.png',
        lightThemeUrl: '/layers/carto/light_nolabels/{z}/{x}/{y}.png',
    },
    Satellite: {
        attribution: {
            title: 'ArcGIS',
            url: 'https://arcgis.com',
        },
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
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

const layer = computed<Layer>(() => {
    const layer = store.localSettings.filters?.layers?.layer ?? 'RadarNoLabels';

    /* if (layer.startsWith('Radar')) {
        let id: string;

        switch (layer as MapLayoutLayerRadar) {
            case 'RadarLabels':
                id = InternalThemes[store.theme === 'default' ? 'darkL' : 'lightL'];
                break;
            case 'RadarNoLabels':
                id = InternalThemes[store.theme === 'default' ? 'darkNL' : 'lightNL'];
                break;
            case 'RadarSatelliteLabels':
                id = InternalThemes[store.theme === 'default' ? 'darkSatelliteL' : 'lightSatelliteL'];
                break;
            case 'RadarSatelliteNoLabels':
                id = InternalThemes[store.theme === 'default' ? 'darkSatelliteNL' : 'lightSatelliteNL'];
                break;
        }

        return {
            url: `/layers/mapbox/${ id }/tiles/512/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiZGFuaWx1azQwMDAiLCJhIjoiY2x4cHZ1eW1zMHJyYjJycXJxb2tubHNteCJ9.UeZYR32GOvwuMTr1JFrsCg`,
            size: 512,
        };
    }*/

    if (layer.startsWith('Radar')) {
        if (layer === 'RadarLabels') return externalLayers.CartoDBLabels;
        if (layer === 'RadarNoLabels') return externalLayers.CartoDB;

        if (layer === 'RadarSatelliteLabels' || layer === 'RadarSatelliteNoLabels') return externalLayers.Satellite;
    }

    if (layer === 'Jawg' && store.theme === 'light') return externalLayers.Jawg;
    if (layer === 'OSM' && store.theme === 'default') return externalLayers.CartoDB;
    if (layer === 'JawgOrOSM') {
        return store.theme === 'default' ? externalLayers.Jawg : externalLayers.OSM;
    }

    return externalLayers[layer as MapLayoutLayerExternal];
});
const layerUrl = computed(() => layer.value.url + layer.value.lightThemeUrl);

const transparencySettings = computed(() => JSON.stringify(store.localSettings.filters?.layers?.transparencySettings ?? '{}'));

const opacity = computed(() => {
    if (store.localSettings.filters?.layers?.layer === 'JawgOrOSM' && store.theme === 'light') return 0.5;

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
let tileLayer: TileLayer<XYZ>;

function initLayer() {
    map.value?.removeLayer(tileLayer);
    tileLayer?.dispose();

    tileLayer = new TileLayer({
        source: new XYZ({
            attributions: layer.value.attribution ? buildAttributions(layer.value.attribution.title, layer.value.attribution.url) : undefined,
            url: store.theme === 'light' ? (layer.value.lightThemeUrl || layer.value.url) : layer.value.url,
            wrapX: true,
            tileSize: layer.value.size ?? 256,
        }),
        opacity: opacity.value,
        zIndex: 0,
    });
    map.value?.addLayer(tileLayer);
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
    if (tileLayer) map.value?.removeLayer(tileLayer);
});
</script>
