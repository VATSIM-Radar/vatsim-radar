<template>
    <div class="colors __info-sections">
        <div class="__grid-info-sections __grid-info-sections--large-title __grid-info-sections--reversed">
            <div class="__grid-info-sections_title">
                Settings apply to current theme only.
            </div>
            <div class="colors__button">
                <common-button
                    v-if="!!store.mapSettings.colors?.[isLightTheme ? 'light' : 'default']"
                    size="S"
                    type="link"
                    @click="themeSyncActive = true"
                >
                    Sync themes
                </common-button>
            </div>
        </div>
        <common-color
            :default-color="{ color: 'error300' }"
            :model-value="store.mapSettings.colors?.[themeKey]?.approach ?? reactive({ color: 'error300' })"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { approach: $event } } })"
        >
            Approach tracon/circle
        </common-color>
        <common-color
            :default-color="{ color: 'success500', transparency: 0.1 }"
            :model-value="store.mapSettings.colors?.[themeKey]?.firs ?? reactive({ color: 'success500', transparency: 0.1 })"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { firs: $event } } })"
        >
            FIR
        </common-color>
        <common-color
            :default-color="{ color: 'info400', transparency: 0.1 }"
            :model-value="store.mapSettings.colors?.[themeKey]?.uirs ?? reactive({ color: 'info400', transparency: 0.1 })"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { uirs: $event } } })"
        >
            UIR
        </common-color>
        <common-color
            :default-color="{ color: 'error300', transparency: 0.7 }"
            :model-value="store.mapSettings.colors?.[themeKey]?.runways ?? reactive({ color: 'error300', transparency: 0.7 })"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { runways: $event } } })"
        >
            Runways
        </common-color>

        <common-block-title>
            Aircraft
        </common-block-title>

        <common-color
            :default-color="{ color: 'primary500' }"
            :model-value="store.mapSettings.colors?.[themeKey]?.aircraft?.main ?? reactive({ color: 'primary500' })"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { aircraft: { main: $event } } } })"
        >
            Default
        </common-color>

        <small> Default aircraft colors may look weird due to performance reasons.</small>

        <common-color
            v-for="(title, key) in aircraftOptions"
            :key
            :default-color="{ color: hexToRgb(aircraftColors[key as MapAircraftStatus]) }"
            :model-value="store.mapSettings.colors?.[themeKey]?.aircraft?.[key] ?? reactive({ color: hexToRgb(aircraftColors[key as MapAircraftStatus]) })"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { aircraft: { [key]: $event } } } })"
        >
            {{ title }}
        </common-color>
        <common-popup
            v-model="themeSyncActive"
            width="100vw"
        >
            <template #title>
                Settings overwrite
            </template>

            Are you sure you want to overwrite {{ isLightTheme ? 'dark' : 'light' }} theme settings?<br> This change is permanent.

            <template #actions>
                <common-button
                    type="secondary-flat"
                    @click="syncThemes"
                >
                    Confirm overwrite
                </common-button>
                <common-button
                    type="secondary-875"
                    @click="backup"
                >
                    Backup data
                </common-button>
                <common-button
                    type="primary"
                    @click="themeSyncActive = false"
                >
                    Cancel that
                </common-button>
            </template>
        </common-popup>
        <common-popup
            v-model="themeSyncComplete"
            width="300px"
        >
            <template #title>
                Success
            </template>
            Themes have been synced.
            <template
                #actions
            >
                <common-button  @click="themeSyncComplete = false">
                    Roger
                </common-button>
            </template>
        </common-popup>
    </div>
</template>

<script setup lang="ts">
import CommonButton from '~/components/common/basic/CommonButton.vue';
import CommonColor from '~/components/common/basic/CommonColor.vue';
import { useStore } from '~/store';
import { aircraftSvgColors } from '~/composables/pilots';
import type { MapAircraftStatus } from '~/composables/pilots';
import type { PartialRecord } from '~/types';
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';
import { useFileDownload } from '~/composables/settings';

const store = useStore();

const themeKey = computed(() => store.getCurrentTheme);

const aircraftColors = aircraftSvgColors();

// For type safety
const aircraftOptions: PartialRecord<MapAircraftStatus, string> = {
    active: 'Active',
    green: 'Own aircraft',
    hover: 'Hover',
    landed: 'Landed (dahsboard)',
    arriving: 'Arriving (dashboard)',
    departing: 'Departing (dashboard)',
};

const themeSyncActive = ref(false);
const themeSyncComplete = ref(false);
const isLightTheme = computed(() => store.getCurrentTheme === 'light');

const backup = () => {
    useFileDownload({
        fileName: `vatsim-radar-current-settings-${ Date.now() }.json`,
        mime: 'application/json',
        blob: new Blob([JSON.stringify(store.mapSettings)], { type: 'application/json' }),
    });
};

const syncThemes = () => {
    setUserMapSettings({
        colors: {
            [isLightTheme.value ? 'default' : 'light']: store.mapSettings.colors![isLightTheme.value ? 'light' : 'default'],
        },
    });

    themeSyncActive.value = false;
    themeSyncComplete.value = true;
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
