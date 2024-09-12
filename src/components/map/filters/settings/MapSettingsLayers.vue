<template>
    <div class="__info-sections">
        <common-toggle
            :model-value="!!store.mapSettings.heatmapLayer"
            @update:modelValue="setUserMapSettings({ heatmapLayer: $event })"
        >
            Traffic Heatmap
        </common-toggle>
        <label class="__section-group">
            Aircraft scale
            <input
                max="2"
                min="0.1"
                step="0.1"
                type="range"
                :value="String(store.mapSettings.aircraftScale ?? 1)"
                @input="setUserMapSettings({ aircraftScale: Number(($event.target as HTMLInputElement).value) })"
            >
            x{{ store.mapSettings.aircraftScale ?? 1 }}
        </label>
        <div class="__section-group"/>
    </div>
</template>

<script setup lang="ts">
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import { useStore } from '~/store';
import type { IUserMapSettings } from '~/server/api/user/settings/map';

const store = useStore();

const countersOptions: Record<IUserMapSettings['airportsCounters']['departuresMode'], string> = {
    total: 'Total',
    totalMoving: 'Total with GS > 0',
    airborne: 'Airborne',
    ground: 'Ground (default)',
    groundMoving: 'Ground with GS > 0',
    hide: 'Hide',
};
</script>

<style scoped lang="scss">

</style>
