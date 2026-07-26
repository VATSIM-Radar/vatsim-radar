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
import type { Units } from 'ol/control/ScaleLine.js';

const map = inject<ShallowRef<Map | null>>('map')!;
const container = useTemplateRef('scale');

let scaleLine: ScaleLine | undefined;

watch([map, container], ([map, container]) => {
    if (!map || !container) return;

    scaleLine = new ScaleLine({
        target: container,
        units: typeof getKeyedValueFromSettings('map.layers.relativeIndicator') === 'string' ? getKeyedValueFromSettings('map.layers.relativeIndicator') as Units : 'metric',
    });
    scaleLine.setMap(map);
}, {
    immediate: true,
});

watch(() => getKeyedValueFromSettings('map.layers.relativeIndicator'), val => {
    if (typeof val !== 'string') return;
    scaleLine?.setUnits(val as Units);
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
        background: varToRgba('darkGray900', 0.75);

        .ol-scale-line-inner {
            border-color: varToRgba('lightGray400', 0.2);
            color: $lightGray400;
        }
    }
}
</style>
