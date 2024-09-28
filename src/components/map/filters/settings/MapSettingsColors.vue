<template>
    <div class="colors __info-sections">
        <div class="__grid-info-sections __grid-info-sections--large-title __grid-info-sections--reversed">
            <div class="__grid-info-sections_title">
                Settings apply to current theme only.
            </div>
            <div class="colors__button">
                <common-button
                    size="S"
                    type="link"
                >
                    Sync themes
                </common-button>
            </div>
        </div>
        <common-color
            :model-value="store.mapSettings.colors?.[themeKey]?.approach ?? reactive({ color: 'error300' })"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { approach: $event } } })"
        >
            Approach tracon/circle
        </common-color>
        <common-color
            :model-value="store.mapSettings.colors?.[themeKey]?.firs ?? reactive({ color: 'success500', transparency: 0.1 })"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { firs: $event } } })"
        >
            FIR
        </common-color>
        <common-color
            :model-value="store.mapSettings.colors?.[themeKey]?.uirs ?? reactive({ color: 'info400', transparency: 0.1 })"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { uirs: $event } } })"
        >
            UIR
        </common-color>

        <common-block-title>
            Aircraft
        </common-block-title>

        <common-select
            :items="aircraftColors"
            :model-value="store.mapSettings.colors?.[themeKey]?.aircraft?.main ?? null"
            placeholder="Default aircraft color"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { aircraft: { main: $event ?? 'default' } } } })"
        />

        <small> Default aircraft colors are limited<br> due to performance reasons.</small>

        <common-color
            v-for="(title, key) in aircraftOptions"
            :key
            :model-value="store.mapSettings.colors?.[themeKey]?.aircraft?.[key] ?? reactive({ color: hexToRgb(aircraftSvgColors()[key as MapAircraftStatus]) })"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { aircraft: { [key]: $event } } } })"
        >
            {{ title }}
        </common-color>
    </div>
</template>

<script setup lang="ts">
import CommonButton from '~/components/common/basic/CommonButton.vue';
import CommonColor from '~/components/common/basic/CommonColor.vue';
import { useStore } from '~/store';
import type { SelectItem } from '~/types/components/select';
import CommonSelect from '~/components/common/basic/CommonSelect.vue';
import { aircraftSvgColors } from '~/composables/pilots';
import type { MapAircraftStatus } from '~/composables/pilots';
import type { PartialRecord } from '~/types';
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';

const store = useStore();

const themeKey = computed(() => store.getCurrentTheme);

const aircraftColors: SelectItem[] = [
    {
        text: 'Default',
        value: 'default',
    },
    {
        text: 'Neutral blue',
        value: '#FFDEAD',
    },
    {
        text: 'Cyan',
        value: '#00FA9A',
    },
    {
        text: 'Aqua',
        value: '#7FFFD4',
    },
    {
        text: 'Violet',
        value: '#8A2BE2',
    },
    {
        text: 'Red',
        value: '#FF6347',
    },
    {
        text: 'Green',
        value: '#00FF00',
    },
    {
        text: 'Forest',
        value: '#FFFF00',
    },
];

// For type safety
const aircraftOptions: PartialRecord<MapAircraftStatus, string> = {
    active: 'Active',
    green: 'Own aircraft',
    hover: 'Hover',
    landed: 'Landed (dahsboard)',
    arriving: 'Arriving (dashboard)',
    departing: 'Departing (dashboard)',
};
</script>

<style scoped lang="scss">
.colors {
    min-height: 55vh;

    &__button {
        display: flex;
        justify-content: flex-end;
    }
}
</style>
