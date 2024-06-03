<template>
    <slot/>
</template>

<script setup lang="ts">
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import TileLayer from 'ol/layer/Tile';
import { XYZ } from 'ol/source';

defineSlots<{ default: () => any }>();

const map = inject<ShallowRef<Map | null>>('map')!;
let tileLayer: TileLayer<XYZ>;

watch(map, val => {
    if (!val) return;

    if (!tileLayer) {
        tileLayer = new TileLayer({
            source: new XYZ({
                attributions: '© <a href="/about" target="_blank">3rd Party Projects</a> © <a href="https://openweathermap.org/" target="_blank">OpenWeather</a> © <a href="https://cartodb.com/attributions" target="_blank">CartoDB</a>',
                url: '/layers/carto/light_nolabels/{z}/{x}/{y}.png',
                wrapX: true,
            }),
            zIndex: 0,
        });
    }

    val.addLayer(tileLayer);
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    if (tileLayer) map.value?.removeLayer(tileLayer);
});
</script>
