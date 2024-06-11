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

function initLayer() {
    if (tileLayer) {
        map.value?.removeLayer(tileLayer);
        tileLayer?.dispose();
        tileLayer = undefined;
    }

    if (weather.value) {
        tileLayer = new TileLayer({
            source: new XYZ({
                url: `https://tile.openweathermap.org/map/${ weather.value }/{z}/{x}/{y}.png?appid=a1d03b5fa17676270ee45e3b2b29bebb`,
                wrapX: true,
            }),
            opacity: store.theme === 'light' ? weather.value === 'clouds_new' ? 1 : 0.8 : 0.5,
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

onBeforeUnmount(() => {
    if (tileLayer) map.value?.removeLayer(tileLayer);
});
</script>
