<template>
    <div class="__info-sections">
        <ui-button
            v-if="Object.keys(settingsStore.settings).length"
            size="S"
            type="secondary"
            @click="resetActive = true"
        >
            Reset to defaults
        </ui-button>
        <ui-block-title>
            VATGlasses
        </ui-block-title>

        <div class="__section-group __section-group--even">
            <ui-toggle
                v-if="store.user"
                :model-value="vatglassesAutoEnable !== false"
                @update:modelValue="setUserMapSettings({ vatglasses: { autoEnable: $event } })"
            >
                Auto-enable

                <template #description>
                    Enables when you have active flight
                </template>
            </ui-toggle>
            <ui-toggle
                :model-value="!!vatglassesActiveSetting"
                @update:modelValue="setUserMapSettings({ vatglasses: { active: $event } })"
            >
                Toggle Active
            </ui-toggle>
            <div class="flex-container">
                <ui-toggle
                    :disabled="!vatglassesActive"
                    :model-value="vatglassesCombined"
                    @update:modelValue="setUserMapSettings({ vatglasses: { combined: $event } })"
                >
                    Combined Mode

                    <template #description>
                        All sectors at once. Slows down updates depending on your device.
                    </template>
                </ui-toggle>
                <div
                    v-if="dataStore.vatglassesCombiningInProgress.value"
                    class="loading-spinner"
                >
                    <div class="spinner"/>
                </div>
            </div>
            <ui-toggle
                v-if="vatglassesActive"
                :model-value="vatglassesAutoLevel !== false"
                @update:modelValue="setUserMapSettings({ vatglasses: { autoLevel: $event } })"
            >
                Auto-Set Level

                <template #description>
                    Based on your flight
                </template>
            </ui-toggle>
        </div>
        <quick-settings-vat-glasses-level/>
        <ui-block-title>
            General
        </ui-block-title>
        <ui-columns-display>
            <template #col1>
                <ui-toggle
                    :model-value="!!highlightEmergency"
                    @update:modelValue="setUserMapSettings({ highlightEmergency: $event })"
                >
                    Highlight Emergencies
                </ui-toggle>
            </template>
            <template #col2>
                <ui-toggle
                    :model-value="!!heatmapLayer"
                    @update:modelValue="setUserMapSettings({ heatmapLayer: $event })"
                >
                    Traffic Heatmap
                </ui-toggle>
            </template>
        </ui-columns-display>
        <ui-columns-display>
            <template #col1>
                <ui-toggle
                    :model-value="!!aircraftShortView"
                    @update:modelValue="setUserMapSettings({ shortAircraftView: $event })"
                >
                    Compact aircraft view

                    <template #description>
                        Reduces on-hover displayed info
                    </template>
                </ui-toggle>
            </template>
            <template #col2>
                <ui-toggle
                    :model-value="!queryUpdateEnabled"
                    @update:modelValue="setUserMapSettings({ disableQueryUpdate: $event })"
                >
                    Disable query update

                    <template #description>
                        URL will stop updating with constant center-zoom change
                    </template>
                </ui-toggle>
            </template>
        </ui-columns-display>
        <ui-columns-display>
            <template #col1>
                <ui-toggle
                    :model-value="shortAirportView"
                    @update:modelValue="setUserMapSettings({ shortAirportView: $event })"
                >
                    Short airports view

                    <template #description>
                        Always show airport info as lines
                    </template>
                </ui-toggle>
            </template>
            <template #col2>
                <ui-select
                    :items="[{ text: 'Disabled', value: false }, { text: 'Enabled (when many)', value: true }, { text: 'Enabled (always)', value: 'always' }]"
                    :model-value="trafficDeclutter"
                    @update:modelValue="setUserMapSettings({ aircraftDeclutter: $event as any })"
                >
                    Aircraft Declutter
                </ui-select>
            </template>
        </ui-columns-display>
        <ui-select
            v-if="!isMobile"
            :items="[{ value: 'bottom-left', text: 'Bottom Left' }, { value: 'top-left', text: 'Top Left' }]"
            :model-value="overlaysPositions"
            @update:modelValue="setUserMapSettings({ overlaysPositions: $event as any })"
        >
            Minified Overlays position
        </ui-select>
        <ui-notification
            remember-message="SETTINGS_EMERGENCY"
            type="info"
        >
            Emergencies are aircraft squawking 7700 and 7600
        </ui-notification>
        <div class="__grid-info-sections __grid-info-sections--large-title">
            <div class="__grid-info-sections_title">
                Aircraft scale
            </div>
            <ui-select
                :items="scaleOptions"
                max-dropdown-height="200px"
                :model-value="aircraftScale"
                placeholder="Choose Scale"
                width="100%"
                @update:modelValue="setUserMapSettings({ aircraftScale: $event as number })"
            />
        </div>
        <ui-toggle
            class="__grid-info-sections_toggle"
            :model-value="aircraftDynamicScale !== false"
            width="100%"
            @update:modelValue="setUserMapSettings({ dynamicAircraftScale: $event })"
        >
            Dynamic zoom

            <template #description>
                Smoothly scales aircraft icons as you zoom in or out - and shows close to real aircraft size when on ground.
            </template>
        </ui-toggle>
        <div class="__grid-info-sections __grid-info-sections--large-title">
            <div class="__grid-info-sections_title">
                Airport default zoom level
            </div>
            <ui-select
                :items="zoomOptions"
                max-dropdown-height="200px"
                :model-value="airportDefaultZoomLevel"
                width="100%"
                @update:modelValue="setUserMapSettings({ defaultAirportZoomLevel: $event as number })"
            />
        </div>

        <ui-block-title>
            Airports Counters
        </ui-block-title>

        <ui-toggle
            :model-value="airportCountersEnabled"
            @update:modelValue="setUserMapSettings({ airportsCounters: { showCounters: $event } })"
        >
            Show Airports Counters
        </ui-toggle>

        <div class="__grid-info-sections __grid-info-sections--large-title">
            <div class="__grid-info-sections_title">
                Max Counters to Show
            </div>
            <ui-select
                :disabled="airportCountersEnabled === false"
                :items="[{ value: 10 }, { value: 25 }, { value: 50 }, { value: 75 }, { value: 100 },
                         { value: 150 }, { value: 200 }, { value: 300 }, { value: 400 }, { value: 500 }, { value: 1000 }]"
                max-dropdown-height="200px"
                :model-value="airportShowLimit"
                width="100%"
                @update:modelValue="setUserMapSettings({ airportCounterLimit: $event as number })"
            />
        </div>

        <div class="__grid-info-sections __grid-info-sections--large-title">
            <div class="__grid-info-sections_title">
                Departures Mode
            </div>
            <ui-select
                :disabled="airportCountersEnabled === false"
                :items="countersSelectOptions"
                max-dropdown-height="200px"
                :model-value="airportCountersDeparturesMode"
                width="100%"
                @update:modelValue="setUserMapSettings({ airportsCounters: { departuresMode: $event as any } })"
            />
        </div>
        <ui-toggle
            :disabled="airportCountersEnabled === false"
            :model-value="airportCountersSyncDeparturesArrivals"
            @update:modelValue="setUserMapSettings({ airportsCounters: { syncDeparturesArrivals: $event } })"
        >
            Sync arrivals mode with departures
        </ui-toggle>
        <div class="__grid-info-sections __grid-info-sections--large-title">
            <div class="__grid-info-sections_title">
                Arrivals Mode
            </div>
            <ui-select
                :disabled="!!airportCountersSyncDeparturesArrivals || airportCountersEnabled === false"
                :items="countersArrivalSelectOptions"
                max-dropdown-height="115px"
                :model-value="airportCountersArrivalsMode"
                width="100%"
                @update:modelValue="setUserMapSettings({ airportsCounters: { arrivalsMode: $event as any } })"
            />
        </div>
        <div class="__grid-info-sections __grid-info-sections--large-title">
            <div class="__grid-info-sections_title">
                Horizontal (prefiles)
            </div>
            <ui-select
                :disabled="airportCountersEnabled === false"
                :items="horizontalSelectOptions"
                max-dropdown-height="85px"
                :model-value="airportCountersHorizontalCounter"
                width="100%"
                @update:modelValue="setUserMapSettings({ airportsCounters: { horizontalCounter: $event as any } })"
            />
        </div>
        <ui-toggle
            :disabled="airportCountersEnabled === false"
            :model-value="!airportCountersDisableTraining"
            @update:modelValue="setUserMapSettings({ airportsCounters: { disableTraining: !$event } })"
        >
            Locals counter
            <template #description>
                Enables counter with aircraft on ground with same departure-arrival<br><br>
                When enabled, those aircraft are always excluded<br> from dep list when on ground
            </template>
        </ui-toggle>
        <ui-toggle
            :model-value="debugMode"
            @update:modelValue="setUserLocalSettings({ debugMode: $event })"
        >
            Debug mode
            <template #description>
                Allows to use VATGlasses beta datafeed, test parse flight plans, and add fake ATCs
            </template>
        </ui-toggle>

        <popup-fullscreen v-model="resetActive">
            <template #title>
                Map Settings Reset
            </template>

            You are about to reset all your map settings to defaults. This action is permanent.

            <template #actions>
                <ui-button
                    type="secondary"
                    @click="[resetUserMapSettings(), resetActive = false]"
                >
                    Confirm reset
                </ui-button>
                <ui-button
                    type="secondary"
                    @click="backupMapSettings()"
                >
                    Backup data
                </ui-button>
                <ui-button
                    type="primary"
                    @click="resetActive = false"
                >
                    Cancel that
                </ui-button>
            </template>
        </popup-fullscreen>
    </div>
</template>

<script setup lang="ts">
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import { useStore } from '~/store';
import type { IUserMapSettings } from '~/utils/server/handlers/map-settings';
import UiSelect from '~/components/ui/inputs/UiSelect.vue';
import type { SelectItem } from '~/types/components/select';
import UiBlockTitle from '~/components/ui/text/UiBlockTitle.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import { backupMapSettings } from '~/composables/settings';
import QuickSettingsVatGlassesLevel from '~/components/map/settings/quick-settings/QuickSettingsVatGlassesLevel.vue';
import { resetUserMapSettings } from '~/composables/fetchers/map-settings';
import UiColumnsDisplay from '~/components/ui/data/UiColumnsDisplay.vue';
import UiNotification from '~/components/ui/data/UiNotification.vue';

import { isVatGlassesActive } from '~/utils/data/vatglasses';
import PopupFullscreen from '~/components/popups/PopupFullscreen.vue';

const store = useStore();
const dataStore = useDataStore();
const settingsStore = useSettingsStore();

const resetActive = ref(false);
const vatglassesActive = isVatGlassesActive;
const isMobile = useIsMobile();
const queryUpdateEnabled = useSettingValueFromFunc('map.preferences.enableQueryUpdate');
const vatglassesAutoEnable = useSettingValueFromFunc('map.vatglasses.autoEnable');
const vatglassesActiveSetting = useSettingValueFromFunc('map.vatglasses.active');
const vatglassesCombined = useSettingValueFromFunc('map.vatglasses.combined');
const vatglassesAutoLevel = useSettingValueFromFunc('map.vatglasses.autoLevel');
const shortAirportView = useSettingValueFromFunc('map.preferences.airports.shortView');
const aircraftShortView = useSettingValueFromFunc('map.preferences.aircraft.shortView');
const highlightEmergency = useSettingValueFromFunc('map.traffic.highlightEmergency');
const heatmapLayer = useSettingValueFromFunc('map.layers.heatmap');
const trafficDeclutter = useSettingValueFromFunc('map.traffic.declutter');
const overlaysPositions = useSettingValueFromFunc('map.preferences.overlaysPositions');
const aircraftScale = useSettingValueFromFunc('map.preferences.aircraft.scale');
const airportDefaultZoomLevel = useSettingValueFromFunc('map.preferences.airports.defaultZoomLevel');
const airportCountersEnabled = useSettingValueFromFunc('map.preferences.airports.counters.enabled');
const airportShowLimit = useSettingValueFromFunc('map.preferences.airports.showLimit');
const airportCountersDeparturesMode = useSettingValueFromFunc('map.preferences.airports.counters.departuresMode');
const airportCountersArrivalsMode = useSettingValueFromFunc('map.preferences.airports.counters.arrivalsMode');
const airportCountersHorizontalCounter = useSettingValueFromFunc('map.preferences.airports.counters.horizontalCounter');
const aircraftDynamicScale = useSettingValueFromFunc('map.preferences.aircraft.dynamicScale');
const airportCountersSyncDeparturesArrivals = useSettingValueFromFunc('map.preferences.airports.counters.syncDeparturesArrivals');
const airportCountersDisableTraining = useSettingValueFromFunc('map.preferences.airports.counters.disableTraining');
const debugMode = useSettingValueFromFunc('map.preferences.debugMode');

// For type safety
const countersOptions: Record<Required<IUserMapSettings['airportsCounters']>['departuresMode'], string> = {
    total: 'Total departures',
    totalMoving: 'Total departures (moving only)',
    totalLanded: 'Total departures (not parked)',
    airborne: 'Airborne departures',
    ground: 'Departing (default)',
    groundMoving: 'Departing (moving only)',
    hide: 'Hide',
};

const countersArrivalOptions: Record<Required<IUserMapSettings['airportsCounters']>['departuresMode'], string> = {
    total: 'Total arrivals',
    totalMoving: 'Total arrivals (moving only)',
    totalLanded: 'Total arrivals (not parked)',
    airborne: 'Airborne arrivals',
    ground: 'Landed (default)',
    groundMoving: 'Landed (moving only)',
    hide: 'Hide',
};

const countersSelectOptions = Object.entries(countersOptions).map(([key, value]) => ({
    text: value,
    value: key,
} satisfies SelectItem));

const countersArrivalSelectOptions = Object.entries(countersArrivalOptions).map(([key, value]) => ({
    text: value,
    value: key,
} satisfies SelectItem));

const horizontalOptions: Record<Required<IUserMapSettings['airportsCounters']>['horizontalCounter'], string> = {
    total: 'Total airport traffic',
    prefiles: 'Prefiles (default)',
    ground: 'Ground',
    groundMoving: 'Ground (moving only)',
    hide: 'Hide',
};

const horizontalSelectOptions = Object.entries(horizontalOptions).map(([key, value]) => ({
    text: value,
    value: key,
} satisfies SelectItem));

const scaleOptions = (() => {
    const options: SelectItem[] = [];

    for (let i = 0.5; i <= 1.51; i += 0.05) {
        options.unshift({
            value: Number(i.toFixed(2)),
            text: `x${ i.toFixed(2) }`,
        });
    }

    return options;
})();

const zoomOptions = (() => {
    const options: SelectItem[] = [];

    for (let i = 17; i >= 12; i -= 0.5) {
        options.unshift({
            value: i,
        });
    }

    return options;
})();
</script>

<style scoped lang="scss">
.flex-container {
    display: flex;
    align-items: center;
}

.loading-spinner {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-left: 5px;
}

.spinner {
    width: 20px;
    height: 20px;
    // border: 4px solid rgba(0, 0, 0, 0.1);
    border: 4px solid $darkGray500;
    // border-left-color: #000;
    border-left-color: $lightGray600;
    border-radius: 50%;

    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
