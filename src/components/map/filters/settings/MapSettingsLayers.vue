<template>
    <div class="__info-sections">
        <common-block-title>
            General
        </common-block-title>
        <common-toggle
            :model-value="!!store.mapSettings.heatmapLayer"
            @update:modelValue="setUserMapSettings({ heatmapLayer: $event })"
        >
            Traffic Heatmap
        </common-toggle>
        <div class="__section-group">
            <div class="__small-title">
                Aircraft scale
            </div>
            <input
                max="1.5"
                min="0.5"
                step="0.05"
                type="range"
                :value="String(store.mapSettings.aircraftScale ?? 1)"
                @input="setUserMapSettings({ aircraftScale: Number(($event.target as HTMLInputElement).value) })"
            >
            x{{ store.mapSettings.aircraftScale ?? 1 }}
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
            :model-value="store.mapSettings.airportsCounters?.disableTraining"
            @update:modelValue="setUserMapSettings({ airportsCounters: { disableTraining: $event } })"
        >
            Disable Training counter
            <template #description>
                Disables counter with aircraft on ground with same departure-arrival<br><br>
                When <strong>not</strong> disabled, those aircraft are always excluded<br> from dep list when on ground
            </template>
        </common-toggle>
    </div>
</template>

<script setup lang="ts">
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import { useStore } from '~/store';
import type { IUserMapSettings } from '~/server/api/user/settings/map';
import CommonSelect from '~/components/common/basic/CommonSelect.vue';
import type { SelectItem } from '~/types/components/select';
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';

const store = useStore();

// For type safety
const countersOptions: Record<Required<IUserMapSettings['airportsCounters']>['departuresMode'], string> = {
    total: 'Total departures',
    totalMoving: 'Total departures with GS > 0',
    airborne: 'Airborne departures',
    airborneDeparting: 'Airborne + GS > 0',
    ground: 'Departing (default)',
    groundMoving: 'Departing with GS > 0',
    hide: 'Hide',
};

const countersArrivalOptions: Record<Required<IUserMapSettings['airportsCounters']>['departuresMode'], string> = {
    total: 'Total arrivals',
    totalMoving: 'Total arrivals with GS > 0',
    airborne: 'Airborne arrivals',
    airborneDeparting: 'Airborne + Departing',
    ground: 'Landed (default)',
    groundMoving: 'Landed with GS > 0',
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
    groundMoving: 'Ground with GS > 0',
    hide: 'Hide',
};

const horizontalSelectOptions = Object.entries(horizontalOptions).map(([key, value]) => ({
    text: value,
    value: key,
} satisfies SelectItem));
</script>
