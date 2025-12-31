<template>
    <slot/>
</template>

<script setup lang="ts">
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import DayNight from 'ol-ext/source/DayNight';
import { Circle, Fill, Stroke, Style } from 'ol/style';

defineSlots<{ default: () => any }>();

const store = useStore();
const map = inject<ShallowRef<Map | null>>('map')!;
const dataStore = useDataStore();
const dayNightSource = new DayNight();
let dayNightLayer: VectorLayer | undefined;

watch(map, map => {
    if (!map || dayNightLayer) return;

    dayNightSource.setTime(new Date(dataStore.time.value));

    dayNightLayer = new VectorLayer({
        source: dayNightSource,
        zIndex: 1,
        style: new Style({
            image: new Circle({
                radius: 5,
                fill: new Fill({ color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.3)` }),
            }),
            fill: new Fill({
                color: store.theme === 'default' ? `rgba(${ getCurrentThemeRgbColor('darkgray950').join(',') }, 0.4)` : `rgba(${ radarColors.darkgray950Rgb.join(',') }, 0.05)`,
            }),
            stroke: new Stroke({
                color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.2)`,
            }),
        }),
    });

    map.addLayer(dayNightLayer);
}, {
    immediate: true,
});

useUpdateInterval(() => {
    if (!dayNightLayer) return;
    dayNightSource.setTime(new Date(dataStore.time.value));
});

onBeforeUnmount(() => {
    if (dayNightLayer) {
        map.value?.removeLayer(dayNightLayer);
        dayNightLayer?.dispose();
    }
});
</script>
