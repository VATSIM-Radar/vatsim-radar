<template>
    <div
        class="map-popup"
        :style="{
            '--max-height': `${overlay.maxHeight}px`,
            '--position-x': typeof overlay.position === 'object' ? `${overlay.position.x}%` : undefined,
            '--position-y': typeof overlay.position === 'object' ? `${overlay.position.y}%` : undefined,
        }"
        v-if="overlay?.data"
    >
        <map-popup-pilot v-if="overlay.type === 'pilot'" :overlay="overlay"/>
        <map-popup-prefile v-else-if="overlay.type === 'prefile'" :overlay="overlay"/>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import MapPopupPilot from '~/components/map/popups/MapPopupPilot.vue';
import type { StoreOverlay } from '~/store/map';
import MapPopupPrefile from '~/components/map/popups/MapPopupPrefile.vue';

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

    :deep(.pilot-header) {
        font-family: $openSansFont;
        color: var(--status-color, $primary500);
        font-size: 17px;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 8px;

        > * {
            position: relative;
            z-index: 2;
        }

        .pilot-header_type {
            background: $primary500;
            color: $neutral150Orig;
            font-size: 10px;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: 600;
            line-height: 100%;
        }
    }
}
</style>
