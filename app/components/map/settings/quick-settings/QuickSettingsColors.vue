<template>
    <div class="colors __info-sections">
        <div class="__grid-info-sections __grid-info-sections--large-title __grid-info-sections--reversed">
            <div class="__grid-info-sections_title">
                Settings apply to current theme only.
            </div>
            <div class="colors__button">
                <ui-button
                    v-if="hasThemeColors"
                    size="S"
                    type="link"
                    @click="themeSyncActive = true"
                >
                    Sync themes
                </ui-button>
            </div>
        </div>
        <div class="__grid-info-sections __grid-info-sections--large-title">
            <div class="__grid-info-sections_title">
                Turns theme
            </div>
            <ui-select
                :items="[{ value: 'magma' }, { value: 'inferno' }, { value: 'rainbow' }, { value: 'viridis' }]"
                :model-value="turnsColor"
                placeholder="Magma"
                @update:modelValue="setUserMapSettings({ colors: { turns: $event as any } })"
            />
        </div>
        <ui-input-color
            :default-color="{ transparency: 1 }"
            :model-value="turnsTransparency ? { transparency: turnsTransparency } : undefined"
            transparency-only
            @update:modelValue="setUserMapSettings({ colors: { turnsTransparency: $event ? $event.transparency : undefined } })"
        >
            Turns transparency
        </ui-input-color>
        <ui-input-color
            :default-color="{ color: 'red300' }"
            :model-value="getColor('approach')"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { approach: $event } } })"
        >
            Approach tracon/circle
        </ui-input-color>
        <ui-input-color
            :default-color="{ color: 'purple300', transparency: 0.7 }"
            :model-value="getColor('approachBookings')"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { approachBookings: $event } } })"
        >
            Booked approach
        </ui-input-color>
        <ui-input-color
            :default-color="{ color: 'green500', transparency: 0.1 }"
            :model-value="getColor('firs')"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { firs: $event } } })"
        >
            FIR (ARTCC)
        </ui-input-color>
        <ui-input-color
            :default-color="{ color: 'lightGray400', transparency: 0.07 }"
            :model-value="getColor('centerBookings')"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { centerBookings: $event } } })"
        >
            Booked FIR (ARTCC)
        </ui-input-color>
        <ui-input-color
            :default-color="{ color: 'purple400', transparency: 0.1 }"
            :model-value="getColor('uirs')"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { uirs: $event } } })"
        >
            UIR (FSS)
        </ui-input-color>
        <ui-input-color
            :default-color="{ color: 'lightGray500' }"
            :model-value="getColor('centerText')"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { centerText: $event } } })"
        >
            FIR label (text)
        </ui-input-color>
        <ui-input-color
            :default-color="{ color: 'darkGray500' }"
            :model-value="getColor('centerBg')"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { centerBg: $event } } })"
        >
            FIR label (background)
        </ui-input-color>
        <ui-input-color
            :default-color="{ color: 'red300', transparency: 0.7 }"
            :model-value="getColor('runways')"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { runways: $event } } })"
        >
            Runways
        </ui-input-color>
        <ui-input-color
            :default-color="{ transparency: 1 }"
            :model-value="getColor('gates') ? { transparency: getColor('gates') ?? 1 } : undefined"
            transparency-only
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { gates: $event ? $event.transparency : undefined } } })"
        >
            Gates
        </ui-input-color>
        <ui-input-color
            :default-color="{ transparency: 1 }"
            :model-value="getColor('staffedAirport') ? { transparency: getColor('staffedAirport') ?? 1 } : undefined"
            transparency-only
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { staffedAirport: $event ? $event.transparency : undefined } } })"
        >
            Staffed Airport
        </ui-input-color>
        <ui-input-color
            :default-color="{ transparency: 1 }"
            :model-value="getColor('defaultAirport') ? { transparency: getColor('defaultAirport') ?? 1 } : undefined"
            transparency-only
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { defaultAirport: $event ? $event.transparency : undefined } } })"
        >
            Unstaffed Airport
        </ui-input-color>

        <ui-block-title>
            Aircraft
        </ui-block-title>

        <ui-input-color
            :default-color="{ color: 'blue500' }"
            :model-value="getAircraftColor('main')"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { aircraft: { main: $event } } } })"
        >
            Default
        </ui-input-color>

        <small> Default aircraft colors may look weird due to performance reasons.</small>

        <ui-input-color
            v-for="(title, key) in aircraftOptions"
            :key
            :default-color="{ color: hexToRgb(aircraftColors[key as MapAircraftStatus]) }"
            :model-value="getAircraftColor(key as MapAircraftStatus)"
            @update:modelValue="setUserMapSettings({ colors: { [themeKey]: { aircraft: { [key]: $event } } } })"
        >
            <span v-html="title"/>
        </ui-input-color>
        <popup-fullscreen
            v-model="themeSyncActive"
            width="100vw"
        >
            <template #title>
                Settings overwrite
            </template>

            Are you sure you want to overwrite {{ isLightTheme ? 'dark' : 'light' }} theme settings?<br> This change is permanent.

            <template #actions>
                <ui-button
                    type="secondary"
                    @click="syncThemes"
                >
                    Confirm overwrite
                </ui-button>
                <ui-button
                    type="secondary"
                    @click="backupMapSettings()"
                >
                    Backup data
                </ui-button>
                <ui-button
                    type="primary"
                    @click="themeSyncActive = false"
                >
                    Cancel that
                </ui-button>
            </template>
        </popup-fullscreen>
        <popup-fullscreen
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
                <ui-button  @click="themeSyncComplete = false">
                    Roger
                </ui-button>
            </template>
        </popup-fullscreen>
    </div>
</template>

<script setup lang="ts">
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiInputColor from '~/components/ui/inputs/UiInputColor.vue';
import { useStore } from '~/store';
import { aircraftSvgColors } from '~/composables/vatsim/pilots';
import type { MapAircraftStatus } from '~/composables/vatsim/pilots';
import type { PartialRecord } from '~/types';
import UiBlockTitle from '~/components/ui/text/UiBlockTitle.vue';
import { backupMapSettings } from '~/composables/settings';
import UiSelect from '~/components/ui/inputs/UiSelect.vue';
import PopupFullscreen from '~/components/popups/PopupFullscreen.vue';
import type { UserMapSettingsColors } from '~/utils/server/handlers/map-settings';

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
const turnsColor = useSettingValueFromFunc('map.preferences.colors.turns');
const turnsTransparency = useSettingValueFromFunc('map.preferences.colors.turnsTransparency');
const hasThemeColors = computed(() => !!getColorByKey('map.preferences.colors.default.approach').value.value);

const getColor = (key: keyof UserMapSettingsColors) => getColorByKey(`map.preferences.colors.default.${ key }` as any).value.value;
const getAircraftColor = (key: MapAircraftStatus | 'main') => getColorByKey(`map.preferences.colors.default.aircraft.${ key }` as any).value.value;

const syncThemes = () => {
    const source = {
        approach: getColor('approach'),
        approachBookings: getColor('approachBookings'),
        firs: getColor('firs'),
        centerBookings: getColor('centerBookings'),
        uirs: getColor('uirs'),
        centerText: getColor('centerText'),
        centerBg: getColor('centerBg'),
        runways: getColor('runways'),
        gates: getColor('gates'),
        staffedAirport: getColor('staffedAirport'),
        defaultAirport: getColor('defaultAirport'),
        aircraft: Object.fromEntries(Object.keys(aircraftOptions).concat('main').map(key => [key, getAircraftColor(key as MapAircraftStatus | 'main')])),
    };

    setUserMapSettings({
        colors: {
            [isLightTheme.value ? 'default' : 'light']: source,
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
