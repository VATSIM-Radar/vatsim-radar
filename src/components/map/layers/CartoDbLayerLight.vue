<template>
    <slot/>
</template>

<script setup lang="ts">
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import TileLayer from 'ol/layer/Tile';
import { XYZ } from 'ol/source';

const map = inject<ShallowRef<Map | null>>('map')!;
let tileLayer: TileLayer<XYZ>;

watch(map, (val) => {
    if (!val) return;

    if (!tileLayer) {
        tileLayer = new TileLayer({
            source: new XYZ({
                attributions: '© <a href="https://navigraph.com/" target="_blank">Navigraph</a> © <a href="https://openlayers.org/" target="_blank">OpenLayers</a> © <a href="http://cartodb.com/attributions" target="_blank">CartoDB</a>',
                url: 'https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
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
