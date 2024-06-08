<template>
    <div
        v-if="overlay?.data"
        class="map-popup"
        :style="{
            '--max-height': `${ overlay._maxHeight }px`,
            '--position-x': typeof overlay.position === 'object' ? `${ overlay.position.x }%` : undefined,
            '--position-y': typeof overlay.position === 'object' ? `${ overlay.position.y }%` : undefined,
        }"
    >
        <map-popup-pilot
            v-if="overlay.type === 'pilot'"
            :overlay="overlay"
        />
        <map-popup-prefile
            v-else-if="overlay.type === 'prefile'"
            :overlay="overlay"
        />
        <map-popup-atc
            v-else-if="overlay.type === 'atc'"
            :overlay="overlay"
        />
        <map-popup-airport
            v-else-if="overlay.type === 'airport'"
            :overlay="overlay"
        />
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { StoreOverlay } from '~/store/map';

defineProps({
    overlay: {
        type: Object as PropType<StoreOverlay>,
        required: true,
    },
});
const MapPopupPilot = defineAsyncComponent(() => import('./MapPopupPilot.vue'));
const MapPopupPrefile = defineAsyncComponent(() => import('./MapPopupPrefile.vue'));
const MapPopupAtc = defineAsyncComponent(() => import('./MapPopupAtc.vue'));
const MapPopupAirport = defineAsyncComponent(() => import('./MapPopupAirport.vue'));
</script>

<style scoped lang="scss">
.map-popup {
    position: relative;
    height: var(--max-height);
    transition: 0.5s ease-in-out;

    :deep(.pilot-header) {
        display: flex;
        gap: 8px;
        align-items: center;

        font-family: $openSansFont;
        font-size: 17px;
        font-weight: 700;

        &, a {
            color: var(--status-color, $primary500);
        }

        .pilot-header_title:is(a) {
            text-underline-offset: 2px;
        }

        > * {
            position: relative;
            z-index: 2;
        }
    }
}
</style>
