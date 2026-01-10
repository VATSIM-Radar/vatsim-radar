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
        <div class="__grid-info-sections __grid-info-sections--large-title">
            <div class="__grid-info-sections_title">
                Turns theme
            </div>
            <common-select
                :items="[{ value: 'magma' }, { value: 'inferno' }, { value: 'rainbow' }, { value: 'viridis' }]"
                :model-value="store.mapSettings.colors?.turns ?? null"
                placeholder="Magma"
                @update:modelValue="setUserMapSettings({ colors: { turns: $event as any } })"
            />
        </div>
        <common-color
            :default-color="{ transparency: 1 }"
            :model-value="store.mapSettings.colors?.turnsTransparency ? { transparency: store.mapSettings.colors?.turnsTransparency ?? 1 } : reactive({ transparency: 1 })"
            transparency-only
            @update:modelValue="setUserMapSettings({ colors: { turnsTransparency: $event.transparency } })"
        >
            Turns transparency
        </common-color>
        <common-color
            :default-color="{ color: 'error300' }"
            :model-value="store.mapSettings.colors?.[themeKey]?.approach ?? reactive({ color: 'error300' })"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { approach: $event } } })"
        >
            Approach tracon/circle
        </common-color>
        <common-color
            :default-color="{ color: 'info300', transparency: 0.7 }"
            :model-value="store.mapSettings.colors?.[themeKey]?.approachBookings ?? reactive({ color: 'info300', transparency: 0.7 })"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { approachBookings: $event } } })"
        >
            Booked approach
        </common-color>
        <common-color
            :default-color="{ color: 'success500', transparency: 0.1 }"
            :model-value="store.mapSettings.colors?.[themeKey]?.firs ?? reactive({ color: 'success500', transparency: 0.1 })"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { firs: $event } } })"
        >
            FIR (ARTCC)
        </common-color>
        <common-color
            :default-color="{ color: 'lightgray125', transparency: 0.07 }"
            :model-value="store.mapSettings.colors?.[themeKey]?.centerBookings ?? reactive({ color: 'lightgray125', transparency: 0.07 })"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { centerBookings: $event } } })"
        >
            Booked FIR (ARTCC)
        </common-color>
        <common-color
            :default-color="{ color: 'info400', transparency: 0.1 }"
            :model-value="store.mapSettings.colors?.[themeKey]?.uirs ?? reactive({ color: 'info400', transparency: 0.1 })"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { uirs: $event } } })"
        >
            UIR (FSS)
        </common-color>
        <common-color
            :default-color="{ color: 'lightgray150' }"
            :model-value="store.mapSettings.colors?.[themeKey]?.centerText ?? reactive({ color: 'lightgray150' })"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { centerText: $event } } })"
        >
            FIR label (text)
        </common-color>
        <common-color
            :default-color="{ color: 'darkgray850' }"
            :model-value="store.mapSettings.colors?.[themeKey]?.centerBg ?? reactive({ color: 'darkgray850' })"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { centerBg: $event } } })"
        >
            FIR label (background)
        </common-color>
        <common-color
            :default-color="{ color: 'error300', transparency: 0.7 }"
            :model-value="store.mapSettings.colors?.[themeKey]?.runways ?? reactive({ color: 'error300', transparency: 0.7 })"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { runways: $event } } })"
        >
            Runways
        </common-color>
        <common-color
            :default-color="{ transparency: 1 }"
            :model-value="store.mapSettings.colors?.[themeKey]?.gates ? { transparency: store.mapSettings.colors?.[themeKey]?.gates ?? 1 } : reactive({ transparency: 1 })"
            transparency-only
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { gates: $event.transparency } } })"
        >
            Gates
        </common-color>
        <common-color
            :default-color="{ transparency: 1 }"
            :model-value="store.mapSettings.colors?.[themeKey]?.staffedAirport ? { transparency: store.mapSettings.colors?.[themeKey]?.staffedAirport ?? 1 } : reactive({ transparency: 1 })"
            transparency-only
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { staffedAirport: $event.transparency } } })"
        >
            Staffed Airport
        </common-color>
        <common-color
            :default-color="{ transparency: 1 }"
            :model-value="store.mapSettings.colors?.[themeKey]?.defaultAirport ? { transparency: store.mapSettings.colors?.[themeKey]?.defaultAirport ?? 1 } : reactive({ transparency: 1 })"
            transparency-only
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { defaultAirport: $event.transparency } } })"
        >
            Unstaffed Airport
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
            <span v-html="title"/>
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
                    @click="backupMapSettings()"
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
import { backupMapSettings } from '~/composables/settings';
import CommonSelect from '~/components/common/basic/CommonSelect.vue';
import CommonPopup from '~/components/common/popup/CommonPopup.vue';

const store = useStore();

const themeKey = computed(() => store.getCurrentTheme);

const aircraftColors = aircraftSvgColors();

// For type safety
const aircraftOptions: PartialRecord<MapAircraftStatus, string> = {
    ground: 'On ground',
    active: 'Active (has overlay)',
    green: 'Own aircraft',
    hover: 'Hover',
    landed: 'Landed (dashboard <br>or emergency)',
    arriving: 'Arriving (dashboard)',
    departing: 'Departing (dashboard)',
};

const themeSyncActive = ref(false);
const themeSyncComplete = ref(false);
const isLightTheme = computed(() => store.getCurrentTheme === 'light');

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
