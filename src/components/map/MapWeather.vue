<template>
    <slot/>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import TileLayer from 'ol/layer/Tile';
import { XYZ } from 'ol/source';

defineSlots<{ default: () => any }>();

const store = useStore();

const weather = computed(() => {
    const item = store.localSettings.filters?.layers?.weather;
    if (!item || String(item) === 'false') return null;

    return item;
});

const map = inject<ShallowRef<Map | null>>('map')!;
let tileLayer: TileLayer<XYZ> | undefined;
const timestamp = ref(0);

async function loadTimestamp() {
    timestamp.value = (await $fetch<number[]>('https://tilecache.rainviewer.com/api/maps.json'))[0];
}

async function initLayer() {
    if (weather.value === 'rain_viewer') await loadTimestamp();

    if (tileLayer) {
        map.value?.removeLayer(tileLayer);
        tileLayer?.dispose();
        tileLayer = undefined;
    }

    if (weather.value) {
        let opacity = store.theme === 'light' ? weather.value === 'clouds_new' ? 1 : weather.value === 'rain_viewer' ? 0.5 : 0.8 : 0.5;
        const transparency = store.localSettings.filters?.layers?.transparencySettings?.[store.theme === 'light' ? 'weatherLight' : 'weatherDark'];
        if (typeof transparency === 'number') opacity = transparency;

        tileLayer = new TileLayer({
            source: new XYZ({
                attributions: weather.value === 'rain_viewer' ? '© <a href="https://www.rainviewer.com/" target="_blank">RainViewer</a>' : undefined,
                tileUrlFunction: coord => weather.value === 'rain_viewer' ? `https://tilecache.rainviewer.com/v2/radar/${ timestamp.value }/256/${ coord[0] }/${ coord[1] }/${ coord[2] }/3/1_1.png` : `https://tile.openweathermap.org/map/${ weather.value }/${ coord[0] }/${ coord[1] }/${ coord[2] }.png?appid=a1d03b5fa17676270ee45e3b2b29bebb`,
                wrapX: true,
                tileSize: 256,
            }),
            opacity,
            zIndex: 1,
        });
        map.value?.addLayer(tileLayer);
    }
}

watch(map, val => {
    if (!val) return;

    initLayer();
}, {
    immediate: true,
});

watch(weather, initLayer);
const transparencySettings = computed(() => JSON.stringify(store.localSettings.filters?.layers?.transparencySettings ?? '{}'));
watch(transparencySettings, initLayer);

onMounted(async () => {
    const interval = setInterval(() => {
        if (weather.value !== 'rain_viewer') return;
        initLayer();
    }, 1000 * 60);

    onBeforeUnmount(() => clearInterval(interval));
});

onBeforeUnmount(() => {
    if (tileLayer) map.value?.removeLayer(tileLayer);
});
</script>
