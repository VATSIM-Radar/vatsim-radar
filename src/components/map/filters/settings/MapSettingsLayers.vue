<template>
    <div class="__info-sections">
        <common-button
            v-if="Object.keys(store.mapSettings).length"
            size="S"
            type="secondary-875"
            @click="resetActive = true"
        >
            Reset to defaults
        </common-button>
        <common-block-title>
            General
        </common-block-title>
        <common-toggle
            :model-value="!!store.mapSettings.heatmapLayer"
            @update:modelValue="setUserMapSettings({ heatmapLayer: $event })"
        >
            Traffic Heatmap
        </common-toggle>
        <common-toggle
            :model-value="!!store.mapSettings.highlightEmergency"
            @update:modelValue="setUserMapSettings({ highlightEmergency: $event })"
        >
            Highlight Emergency Aircraft

            <template #description>
                Aircraft squawking 7700 and 7600
            </template>
        </common-toggle>
        <div class="__grid-info-sections __grid-info-sections--large-title">
            <div class="__grid-info-sections_title">
                Aircraft scale
            </div>
            <common-select
                :items="scaleOptions"
                max-dropdown-height="200px"
                :model-value="store.mapSettings.aircraftScale ?? null"
                placeholder="Choose Scale"
                width="100%"
                @update:modelValue="setUserMapSettings({ aircraftScale: $event as number })"
            />
        </div>

        <common-block-title>
            VATGlasses (BETA)
        </common-block-title>

        <div class="__section-group __section-group--even">
            <common-toggle
                v-if="store.user"
                :model-value="store.mapSettings.vatglasses?.autoEnable !== false"
                @update:modelValue="setUserMapSettings({ vatglasses: { autoEnable: $event } })"
            >
                Auto-enable

                <template #description>
                    Enables when you have active flight
                </template>
            </common-toggle>
            <common-toggle
                :model-value="!!store.mapSettings.vatglasses?.active"
                @update:modelValue="setUserMapSettings({ vatglasses: { active: $event } })"
            >
                Toggle Active
            </common-toggle>
            <common-toggle
                :disabled="!vatglassesActive"
                :model-value="store.mapSettings.vatglasses?.combined"
                @update:modelValue="setUserMapSettings({ vatglasses: { combined: $event } })"
            >
                Combined Mode

                <template #description>
                    All sectors at once. Eats performance.
                </template>
            </common-toggle>
            <common-toggle
                v-if="vatglassesActive"
                :model-value="store.mapSettings.vatglasses?.autoLevel !== false"
                @update:modelValue="setUserMapSettings({ vatglasses: { autoLevel: $event } })"
            >
                Auto-Set Level

                <template #description>
                    Based on your flight
                </template>
            </common-toggle>
        </div>

        <div
            v-if="vatglassesActive && !store.mapSettings.vatglasses?.combined && (store.mapSettings.vatglasses?.autoLevel === false || !mapStore.overlays.some(x => x.key === store.user?.cid))"
            class="__grid-info-sections __grid-info-sections--large-title"
        >
            <div class="__grid-info-sections_title">
                VATGlasses Level
            </div>
            <div class="__section-group">
                <input
                    v-model="vatglassesLevel"
                    max="430"
                    min="0"
                    step="10"
                    type="range"
                >
                <common-input-text
                    v-model="vatglassesLevel"
                    class="vatglassesLevel-input"
                    :input-attrs="{
                        max: 430,
                        min: 0,
                        step: 10,
                    }"
                    input-type="number"
                />
            </div>
        </div>

        <common-block-title>
            Airports Counters
        </common-block-title>
        <div class="__grid-info-sections __grid-info-sections--large-title">
            <div class="__grid-info-sections_title">
                Departures Mode
            </div>
            <common-select
                :items="countersSelectOptions"
                max-dropdown-height="200px"
                :model-value="store.mapSettings.airportsCounters?.departuresMode ?? 'ground'"
                width="100%"
                @update:modelValue="setUserMapSettings({ airportsCounters: { departuresMode: $event as any } })"
            />
        </div>
        <common-toggle
            :model-value="store.mapSettings.airportsCounters?.syncDeparturesArrivals"
            @update:modelValue="setUserMapSettings({ airportsCounters: { syncDeparturesArrivals: $event } })"
        >
            Sync arrivals mode with departures
        </common-toggle>
        <div class="__grid-info-sections __grid-info-sections--large-title">
            <div class="__grid-info-sections_title">
                Arrivals Mode
            </div>
            <common-select
                :disabled="!!store.mapSettings.airportsCounters?.syncDeparturesArrivals"
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
            <common-select
                :items="horizontalSelectOptions"
                max-dropdown-height="85px"
                :model-value="store.mapSettings.airportsCounters?.horizontalCounter ?? 'prefiles'"
                width="100%"
                @update:modelValue="setUserMapSettings({ airportsCounters: { horizontalCounter: $event as any } })"
            />
        </div>
        <common-toggle
            :model-value="!store.mapSettings.airportsCounters?.disableTraining"
            @update:modelValue="setUserMapSettings({ airportsCounters: { disableTraining: !$event } })"
        >
            Locals counter
            <template #description>
                Enables counter with aircraft on ground with same departure-arrival<br><br>
                When enabled, those aircraft are always excluded<br> from dep list when on ground
            </template>
        </common-toggle>

        <common-popup v-model="resetActive">
            <template #title>
                Map Settings Reset
            </template>

            You are about to reset all your map settings to defaults. This action is permanent.

            <template #actions>
                <common-button
                    type="secondary-flat"
                    @click="[resetUserMapSettings(), resetActive = false]"
                >
                    Confirm reset
                </common-button>
                <common-button
                    type="secondary-875"
                    @click="backupMapSettings()"
                >
                    Backup data
                </common-button>
                <common-button
                    type="primary"
                    @click="resetActive = false"
                >
                    Cancel that
                </common-button>
            </template>
        </common-popup>
    </div>
</template>

<script setup lang="ts">
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import { useStore } from '~/store';
import type { IUserMapSettings } from '~/utils/backend/map-settings';
import CommonSelect from '~/components/common/basic/CommonSelect.vue';
import type { SelectItem } from '~/types/components/select';
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import CommonInputText from '~/components/common/basic/CommonInputText.vue';
import { backupMapSettings } from '~/composables/settings';
import { resetUserMapSettings } from '~/composables';
import { isVatGlassesActive } from '~/utils/data/vatglasses';
import { useMapStore } from '~/store/map';

const store = useStore();
const mapStore = useMapStore();

const resetActive = ref(false);

const vatglassesLevel = computed({
    get() {
        return store.localSettings.vatglassesLevel?.toString();
    },
    set(value) {
        if (value !== undefined) {
            setUserLocalSettings({ vatglassesLevel: Number(value) });
        }
    },
});

const vatglassesActive = isVatGlassesActive();

// For type safety
const countersOptions: Record<Required<IUserMapSettings['airportsCounters']>['departuresMode'], string> = {
    total: 'Total departures',
    totalMoving: 'Total departures (moving only)',
    airborne: 'Airborne departures',
    ground: 'Departing (default)',
    groundMoving: 'Departing (moving only)',
    hide: 'Hide',
};

const countersArrivalOptions: Record<Required<IUserMapSettings['airportsCounters']>['departuresMode'], string> = {
    total: 'Total arrivals',
    totalMoving: 'Total arrivals (moving only)',
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

const scaleOptions = computed<SelectItem[]>(() => {
    const options: SelectItem[] = [];

    for (let i = 0.5; i <= 1.51; i += 0.05) {
        options.unshift({
            value: Number(i.toFixed(2)),
            text: `x${ i.toFixed(2) }`,
        });
    }

    return options;
});
</script>
