<template>
    <div
        v-once
        ref="scale"
        class="scale"
    />
</template>

<script setup lang="ts">
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import { ScaleLine } from 'ol/control.js';
import { useStore } from '~/store';

const map = inject<ShallowRef<Map | null>>('map')!;
const container = useTemplateRef('scale');
const store = useStore();

let scaleLine: ScaleLine | undefined;

watch([map, container], ([map, container]) => {
    if (!map || !container) return;

    scaleLine = new ScaleLine({
        target: container,
        units: typeof store.localSettings.filters?.layers?.relativeIndicator === 'string' ? store.localSettings.filters?.layers?.relativeIndicator : 'metric',
    });
    scaleLine.setMap(map);
}, {
    immediate: true,
});

watch(() => store.localSettings.filters?.layers?.relativeIndicator, val => {
    if (typeof val !== 'string') return;
    scaleLine?.setUnits(val);
});

onBeforeUnmount(() => scaleLine?.dispose());
</script>

<style scoped lang="scss">
.scale {
    position: absolute;
    z-index: 8;
    right: 20px;
    bottom: 10px;

    display: flex;
    justify-content: flex-end;

    :deep(.ol-scale-line) {
        left: auto;
        border-radius: 4px;
        background: varToRgba('darkgray1000', 0.75);

        .ol-scale-line-inner {
            border-color: varToRgba('lightgray125', 0.2);
            color: $lightgray125;
        }
    }
}
</style>
