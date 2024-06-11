<template>
    <slot/>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import type { MapLayoutLayer } from '~/types/map';
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import TileLayer from 'ol/layer/Tile';
import { XYZ } from 'ol/source';
import { buildAttributions } from '~/utils/map';

defineSlots<{ default: () => any }>();

const store = useStore();

interface Layer {
    attribution: {
        title: string;
        url: string;
    };
    url: string;
    lightThemeUrl?: string;
}

const layers: Record<MapLayoutLayer, Layer> = {
    CartoDB: {
        attribution: {
            title: 'CartoDB',
            url: 'https://cartodb.com/attribution',
        },
        url: '/layers/carto/dark_nolabels/{z}/{x}/{y}.png',
        lightThemeUrl: '/layers/carto/light_nolabels/{z}/{x}/{y}.png',
    },
    Jawg: {
        attribution: {
            title: 'Jawg',
            url: 'https://www.jawg.io',
        },
        url: '/layers/jawg/1578fbb3-df30-4ffd-a1ed-84fac385f59d/{z}/{x}/{y}.png?access-token=Ly133Lgdn5FiEmVwqE1hLT732DJuGdMZmxm6TcIEGCiKARCwXmAHPHpj58Lwxb1L',
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
const layer = computed(() => {
    const layer = store.localSettings.filters?.layers?.layer ?? 'CartoDB';

    if (layer === 'Jawg' && store.theme === 'light') return layers.Jawg;
    if (layer === 'OSM' && store.theme === 'default') return layers.CartoDB;
    if (layer === 'JawgOrOSM') {
        return store.theme === 'default' ? layers.Jawg : layers.OSM;
    }

    return layers[layer];
});

const opacity = computed(() => {
    if (store.localSettings.filters?.layers?.layer === 'JawgOrOSM' && store.theme === 'light') return 0.5;

    switch (store.localSettings.filters?.layers?.layer) {
        case 'OSM':
            return 0.5;
        case 'Satellite':
            return 0.3;
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
            attributions: buildAttributions(layer.value.attribution.title, layer.value.attribution.url),
            url: store.theme === 'light' ? (layer.value.lightThemeUrl || layer.value.url) : layer.value.url,
            wrapX: true,
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

watch([layer, theme], initLayer);

onBeforeUnmount(() => {
    if (tileLayer) map.value?.removeLayer(tileLayer);
});
</script>
