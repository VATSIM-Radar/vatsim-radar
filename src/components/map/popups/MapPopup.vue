<template>
    <div
        class="map-popup"
        :style="{
            '--max-height': `${overlay.maxHeight}px`,
            '--position-x': typeof overlay.position === 'object' ? `${overlay.position.x}%` : undefined,
            '--position-y': typeof overlay.position === 'object' ? `${overlay.position.y}%` : undefined,
        }"
    >
        <map-popup-pilot v-if="overlay.type === 'pilot'" :overlay="overlay"/>
    </div>
</template>

<script setup lang="ts">
import type { StoreOverlay } from '~/store';
import type { PropType } from 'vue';
import MapPopupPilot from '~/components/map/popups/MapPopupPilot.vue';

defineProps({
    overlay: {
        type: Object as PropType<StoreOverlay>,
        required: true,
    },
});
</script>

<style scoped lang="scss">
.map-popup {
    position: relative;
    height: var(--max-height);
    transition: 0.5s ease-in-out;
}
</style>
