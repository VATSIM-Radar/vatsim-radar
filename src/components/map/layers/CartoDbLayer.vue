<template>
    <slot/>
</template>

<script setup lang="ts">
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import TileLayer from 'ol/layer/Tile';
import { XYZ } from 'ol/source';
import { buildAttributions } from '~/utils/map';

defineSlots<{ default: () => any }>();

const map = inject<ShallowRef<Map | null>>('map')!;
let tileLayer: TileLayer<XYZ>;

watch(map, val => {
    if (!val) return;

    if (!tileLayer) {
        tileLayer = new TileLayer({
            source: new XYZ({
                attributions: buildAttributions('CartoDB', 'https://cartodb.com/attribution'),
                url: '/layers/carto/dark_nolabels/{z}/{x}/{y}.png',
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
