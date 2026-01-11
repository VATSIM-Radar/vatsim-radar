<template>
    <div class="__info-sections">
        <ui-button
            v-if="Object.keys(store.mapSettings).length"
            size="S"
            type="secondary-875"
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
                :model-value="store.mapSettings.vatglasses?.autoEnable !== false"
                @update:modelValue="setUserMapSettings({ vatglasses: { autoEnable: $event } })"
            >
                Auto-enable

                <template #description>
                    Enables when you have active flight
                </template>
            </ui-toggle>
            <ui-toggle
                :model-value="!!store.mapSettings.vatglasses?.active"
                @update:modelValue="setUserMapSettings({ vatglasses: { active: $event } })"
            >
                Toggle Active
            </ui-toggle>
            <div class="flex-container">
                <ui-toggle
                    :disabled="!vatglassesActive"
                    :model-value="store.mapSettings.vatglasses?.combined"
                    @update:modelValue="setUserMapSettings({ vatglasses: { combined: $event } })"
                >
                    Combined Mode

                    <template #description>
                        All sectors at once. Eats performance.
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
                :model-value="store.mapSettings.vatglasses?.autoLevel !== false"
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
                    :model-value="!!store.mapSettings.highlightEmergency"
                    @update:modelValue="setUserMapSettings({ highlightEmergency: $event })"
                >
                    Highlight Emergencies
                </ui-toggle>
            </template>
            <template #col2>
                <ui-toggle
                    :model-value="!!store.mapSettings.heatmapLayer"
                    @update:modelValue="setUserMapSettings({ heatmapLayer: $event })"
                >
                    Traffic Heatmap
                </ui-toggle>
            </template>
        </ui-columns-display>
        <ui-columns-display>
            <template #col1>
                <ui-toggle
                    :model-value="!!store.mapSettings.shortAircraftView"
                    @update:modelValue="setUserMapSettings({ shortAircraftView: $event })"
                >
                    Short aircraft view

                    <template #description>
                        Reduces on-hover displayed info
                    </template>
                </ui-toggle>
            </template>
            <template #col2>
                <ui-toggle
                    :model-value="!!store.mapSettings.disableQueryUpdate"
                    @update:modelValue="setUserMapSettings({ disableQueryUpdate: $event })"
                >
                    Disable query update

                    <template #description>
                        URL will stop updating with constant center-zoom change
                    </template>
                </ui-toggle>
            </template>
        </ui-columns-display>
        <ui-select
            :items="[{ value: true, text: 'Default (400ms)' }, { value: 150, text: '150ms' }, { value: 300, text: '300ms' }, { value: 750, text: '750ms' }, { value: 1000, text: '1 second' }, { value: false, text: 'Disabled (no delay)' }]"
            :model-value="store.mapSettings.aircraftHoverDelay ?? true"
            @update:modelValue="setUserMapSettings({ aircraftHoverDelay: $event as any })"
        >
            <template #label>
                Aircraft hover delay duration
            </template>
        </ui-select>
        <ui-notification
            cookie-name="settings-emergency"
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
                :model-value="store.mapSettings.aircraftScale ?? null"
                placeholder="Choose Scale"
                width="100%"
                @update:modelValue="setUserMapSettings({ aircraftScale: $event as number })"
            />
        </div>
        <ui-toggle
            class="__grid-info-sections_toggle"
            :model-value="store.mapSettings.dynamicAircraftScale !== false"
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
                :model-value="store.mapSettings.defaultAirportZoomLevel ?? 14"
                width="100%"
                @update:modelValue="setUserMapSettings({ defaultAirportZoomLevel: $event as number })"
            />
        </div>

        <ui-block-title>
            Airports Counters
        </ui-block-title>

        <ui-toggle
            :model-value="store.mapSettings.airportsCounters?.showCounters ?? true"
            @update:modelValue="setUserMapSettings({ airportsCounters: { showCounters: $event } })"
        >
            Show Airports Counters
        </ui-toggle>

        <div class="__grid-info-sections __grid-info-sections--large-title">
            <div class="__grid-info-sections_title">
                Max Counters to Show
            </div>
            <ui-select
                :disabled="store.mapSettings.airportsCounters?.showCounters === false"
                :items="[{ value: 10 }, { value: 25 }, { value: 50 }, { value: 75 }, { value: 100 },
                         { value: 150 }, { value: 200 }, { value: 300 }, { value: 400 }, { value: 500 }, { value: 1000 }]"
                max-dropdown-height="200px"
                :model-value="store.mapSettings.airportCounterLimit ?? 100"
                width="100%"
                @update:modelValue="setUserMapSettings({ airportCounterLimit: $event as number })"
            />
        </div>

        <div class="__grid-info-sections __grid-info-sections--large-title">
            <div class="__grid-info-sections_title">
                Departures Mode
            </div>
            <ui-select
                :disabled="store.mapSettings.airportsCounters?.showCounters === false"
                :items="countersSelectOptions"
                max-dropdown-height="200px"
                :model-value="store.mapSettings.airportsCounters?.departuresMode ?? 'ground'"
                width="100%"
                @update:modelValue="setUserMapSettings({ airportsCounters: { departuresMode: $event as any } })"
            />
        </div>
        <ui-toggle
            :disabled="store.mapSettings.airportsCounters?.showCounters === false"
            :model-value="store.mapSettings.airportsCounters?.syncDeparturesArrivals"
            @update:modelValue="setUserMapSettings({ airportsCounters: { syncDeparturesArrivals: $event } })"
        >
            Sync arrivals mode with departures
        </ui-toggle>
        <div class="__grid-info-sections __grid-info-sections--large-title">
            <div class="__grid-info-sections_title">
                Arrivals Mode
            </div>
            <ui-select
                :disabled="!!store.mapSettings.airportsCounters?.syncDeparturesArrivals || store.mapSettings.airportsCounters?.showCounters === false"
                :items="countersArrivalSelectOptions"
                max-dropdown-height="115px"
                :model-value="store.mapSettings.airportsCounters?.arrivalsMode ?? 'ground'"
                width="100%"
                @update:modelValue="setUserMapSettings({ airportsCounters: { arrivalsMode: $event as any } })"
            />
        </div>
        <div class="__grid-info-sections __grid-info-sections--large-title">
            <div class="__grid-info-sections_title">
                Horizontal (prefiles)
            </div>
            <ui-select
                :disabled="store.mapSettings.airportsCounters?.showCounters === false"
                :items="horizontalSelectOptions"
                max-dropdown-height="85px"
                :model-value="store.mapSettings.airportsCounters?.horizontalCounter ?? 'prefiles'"
                width="100%"
                @update:modelValue="setUserMapSettings({ airportsCounters: { horizontalCounter: $event as any } })"
            />
        </div>
        <ui-toggle
            :disabled="store.mapSettings.airportsCounters?.showCounters === false"
            :model-value="!store.mapSettings.airportsCounters?.disableTraining"
            @update:modelValue="setUserMapSettings({ airportsCounters: { disableTraining: !$event } })"
        >
            Locals counter
            <template #description>
                Enables counter with aircraft on ground with same departure-arrival<br><br>
                When enabled, those aircraft are always excluded<br> from dep list when on ground
            </template>
        </ui-toggle>

        <popup-fullscreen v-model="resetActive">
            <template #title>
                Map Settings Reset
            </template>

            You are about to reset all your map settings to defaults. This action is permanent.

            <template #actions>
                <ui-button
                    type="secondary-flat"
                    @click="[resetUserMapSettings(), resetActive = false]"
                >
                    Confirm reset
                </ui-button>
                <ui-button
                    type="secondary-875"
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
import type { IUserMapSettings } from '~/utils/backend/handlers/map-settings';
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

const resetActive = ref(false);
const vatglassesActive = isVatGlassesActive;

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
    border: 4px solid $darkgray850;
    // border-left-color: #000;
    border-left-color: $lightgray200;
    border-radius: 50%;

    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
