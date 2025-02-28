<template>
    <div class="__info-sections">
        <common-tabs
            v-model="tab"
            mobile-vertical
            :tabs="{ hide: { title: 'ATC & Layers' }, modes: { title: 'Airports & Traffic' } }"
        />

        <template v-if="tab === 'modes'">

            <common-block-title>
                Airports
            </common-block-title>

            <div class="__grid-info-sections __grid-info-sections--large-title">
                <div class="__grid-info-sections_title">
                    Display mode
                </div>

                <common-select
                    :items="[
                        { text: 'All', value: 'all' },
                        { text: 'Staffed only', value: 'staffedOnly' },
                        { text: 'Staffed or has ground traffic', value: 'staffedAndGroundTraffic' },
                    ]"
                    :model-value="store.mapSettings.airportsMode ?? 'all'"
                    @update:modelValue="setUserMapSettings({ airportsMode: $event as any })"
                />
            </div>

            <common-toggle
                :model-value="!!store.mapSettings.hideATISOnly"
                @update:modelValue="setUserMapSettings({ hideATISOnly: $event })"
            >
                Hide info when only ATIS

                <template #description>
                    Hides ATIS button when airport only has ATIS
                </template>
            </common-toggle>

            <common-block-title>
                Tracks (turns)
            </common-block-title>

            <div class="__grid-info-sections __grid-info-sections--large-title">
                <div class="__grid-info-sections_title">
                    Airport traffic mode
                </div>

                <common-select
                    :items="tracksOptions"
                    :model-value="store.mapSettings.tracks?.mode ?? 'arrivalsOnly'"
                    placeholder="Choose Scale"
                    width="100%"
                    @update:modelValue="setUserMapSettings({ tracks: { mode: $event as any } })"
                />
            </div>

            <div class="__grid-info-sections __grid-info-sections--large-title">
                <div class="__grid-info-sections_title">
                    Max. tracks displayed
                </div>

                <common-select
                    :items="[ { value: 50 }, { value: 40 }, { value: 25 }, { value: 15 }, { value: 10 } ]"
                    :model-value="store.mapSettings.tracks?.limit ?? 50"
                    placeholder="Limit"
                    width="100%"
                    @update:modelValue="setUserMapSettings({ tracks: { limit: $event as number } })"
                />
            </div>

            <common-toggle
                :model-value="store.mapSettings.tracks?.showOutOfBounds !== true"
                @update:modelValue="setUserMapSettings({ tracks: { showOutOfBounds: !$event } })"
            >
                Hide when aircraft not visible

                <template #description>
                    Improves performance
                </template>
            </common-toggle>

            <common-block-title>
                Ground traffic
            </common-block-title>

            <common-select
                :items="[
                    { text: 'Hide all', value: 'always' },
                    { text: 'Hide if zoomed out', value: 'lowZoom' },
                    { text: 'Show all (default)', value: 'never' },
                ]"
                :model-value="store.mapSettings.groundTraffic?.hide ?? null"
                placeholder="Ground traffic mode"
                @update:modelValue="setUserMapSettings({ groundTraffic: { hide: $event as any } })"
            />

            <div class="__section-group">
                <common-toggle
                    :disabled="!store.user || store.mapSettings.groundTraffic?.hide === 'never' || !store.mapSettings.groundTraffic?.hide"
                    :model-value="store.mapSettings.groundTraffic?.excludeMyLocation === true"
                    @update:modelValue="setUserMapSettings({ groundTraffic: { excludeMyLocation: $event } })"
                >
                    Apply to current

                    <template #description>
                        By default, we still show traffic for airport you're currently in
                    </template>
                </common-toggle>
                <common-toggle
                    :disabled="!store.user || store.mapSettings.groundTraffic?.hide === 'never' || !store.mapSettings.groundTraffic?.hide"
                    :model-value="store.mapSettings.groundTraffic?.excludeMyArrival === true"
                    @update:modelValue="setUserMapSettings({ groundTraffic: { excludeMyArrival: $event } })"
                >
                    Apply to arrival

                    <template #description>
                        By default, we still show traffic for airport you're flying to
                    </template>
                </common-toggle>
            </div>
        </template>
        <template v-else>
            <common-block-title>
                ATC
            </common-block-title>

            <common-toggle
                :disabled="store.mapSettings.visibility?.atc === false"
                :model-value="!store.mapSettings.visibility?.atcLabels"
                @update:modelValue="setUserMapSettings({ visibility: { atcLabels: !$event } })"
            >
                Labels
            </common-toggle>

            <common-toggle
                :model-value="store.mapSettings.visibility?.bookings ?? false"
                @update:modelValue="setUserMapSettings({ visibility: { bookings: $event } })"
            >
                Show Booked
            </common-toggle>

            <div class="__grid-info-sections __grid-info-sections--large-title">
                <div class="__grid-info-sections_title">
                    Hours In Advance
                </div>
                <common-select
                    :disabled="!(store.mapSettings.visibility?.bookings ?? false)"
                    :items="[{ value: '1', text: '1h' }, { value: '2', text: '2h' }, { value: '3', text: '3h' }, { value: '4', text: '4h' }]"
                    :model-value="store.mapSettings.bookingHours ?? '1h'"
                    placeholder="1h"
                    @update:modelValue="setUserMapSettings({ bookingHours: $event as any })"
                />
            </div>

            <common-notification
                v-if="store.mapSettings.bookingOverride"
                type="error"
            >
                Booking override is active!
            </common-notification>

            <div class="__section-group __section-group--even">
                <common-toggle
                    :model-value="store.mapSettings.visibility?.atc !== false"
                    @update:modelValue="setUserMapSettings({ visibility: { atc: !$event ? false : {} } })"
                >
                    All
                </common-toggle>

                <common-toggle
                    :disabled="store.mapSettings.visibility?.atc === false"
                    :model-value="!isHideAtcType('firs')"
                    @update:modelValue="setUserMapSettings({ visibility: { atc: { firs: !$event } } })"
                >
                    FIRs
                </common-toggle>

                <common-toggle
                    :disabled="store.mapSettings.visibility?.atc === false"
                    :model-value="!isHideAtcType('approach')"
                    @update:modelValue="setUserMapSettings({ visibility: { atc: { approach: !$event } } })"
                >
                    Approach
                </common-toggle>

                <common-toggle
                    :disabled="store.mapSettings.visibility?.atc === false"
                    :model-value="!isHideAtcType('ground')"
                    @update:modelValue="setUserMapSettings({ visibility: { atc: { ground: !$event } } })"
                >
                    Locals
                </common-toggle>
            </div>

            <common-block-title>
                Objects
            </common-block-title>

            <div class="__section-group __section-group--even">
                <common-toggle
                    :model-value="!store.mapSettings.visibility?.airports"
                    @update:modelValue="setUserMapSettings({ visibility: { airports: !$event } })"
                >
                    Airports
                </common-toggle>

                <common-toggle
                    :model-value="!store.mapSettings.visibility?.pilots"
                    @update:modelValue="setUserMapSettings({ visibility: { pilots: !$event } })"
                >
                    Aircraft
                </common-toggle>

                <common-toggle
                    :model-value="!store.mapSettings.visibility?.gates"
                    @update:modelValue="setUserMapSettings({ visibility: { gates: !$event } })"
                >
                    Gates
                </common-toggle>

                <common-toggle
                    :model-value="!store.mapSettings.visibility?.runways"
                    @update:modelValue="setUserMapSettings({ visibility: { runways: !$event } })"
                >
                    Runways
                </common-toggle>
            </div>

            <common-block-title>
                Personal Info
            </common-block-title>

            <div class="__section-group __section-group--even">
                <common-toggle
                    :model-value="!store.mapSettings.visibility?.pilotsInfo"
                    @update:modelValue="setUserMapSettings({ visibility: { pilotsInfo: !$event } })"
                >
                    Pilots
                </common-toggle>

                <common-toggle
                    :model-value="!store.mapSettings.visibility?.atcInfo"
                    @update:modelValue="setUserMapSettings({ visibility: { atcInfo: !$event } })"
                >
                    Controllers
                </common-toggle>
            </div>

            <common-block-title>
                Navigraph Airports Layouts
            </common-block-title>

            <common-notification
                v-if="!store.user?.hasCharts"
                cookie-name="navigraph-connect-warning"
            >
                Airports Layouts are available to Navigraph Unlimited subscribers only.<br>

                <template v-if="store.user">
                    <a
                        class="__link"
                        href="/api/auth/navigraph/redirect"
                    >Link your account</a> or view
                </template>
                <template v-else>
                    View
                </template>
                <a
                    class="__link"
                    href="https://navigraph.com/pricing?utm_source=vatsimradar&utm_medium=referral&utm_campaign=subscribe"
                    target="_blank"
                >subscription options</a>.
            </common-notification>

            <div class="__section-group __section-group--even">
                <common-toggle
                    :disabled="!store.user?.hasCharts"
                    :model-value="!store.user?.hasCharts ? false : !store.mapSettings.navigraphLayers?.disable"
                    @update:modelValue="setUserMapSettings({ navigraphLayers: { disable: !$event } })"
                >
                    Enabled
                </common-toggle>

                <common-toggle
                    :disabled="!store.user?.hasCharts"
                    :model-value="!store.user?.hasCharts ? false : !store.mapSettings.navigraphLayers?.gatesFallback"
                    @update:modelValue="setUserMapSettings({ navigraphLayers: { gatesFallback: !$event } })"
                >
                    New gates system
                </common-toggle>
            </div>

            <div
                v-if="store.user?.hasCharts"
                class="__section-group __section-group--even"
            >
                <common-toggle
                    :disabled="!!store.mapSettings.navigraphLayers?.disable"
                    :model-value="!store.mapSettings.navigraphLayers?.hideTaxiways"
                    @update:modelValue="setUserMapSettings({ navigraphLayers: { hideTaxiways: !$event } })"
                >
                    Taxiways
                </common-toggle>

                <common-toggle
                    :disabled="!!store.mapSettings.navigraphLayers?.disable"
                    :model-value="!store.mapSettings.navigraphLayers?.hideRunwayExit"
                    @update:modelValue="setUserMapSettings({ navigraphLayers: { hideRunwayExit: !$event } })"
                >
                    Runway Exits
                </common-toggle>

                <common-toggle
                    :disabled="!!store.mapSettings.navigraphLayers?.disable"
                    :model-value="!store.mapSettings.navigraphLayers?.hideGateGuidance"
                    @update:modelValue="setUserMapSettings({ navigraphLayers: { hideGateGuidance: !$event } })"
                >
                    Gate Guidance
                </common-toggle>

                <common-toggle
                    :disabled="!!store.mapSettings.navigraphLayers?.disable"
                    :model-value="!store.mapSettings.navigraphLayers?.hideDeicing"
                    @update:modelValue="setUserMapSettings({ navigraphLayers: { hideDeicing: !$event } })"
                >
                    Deicing Pads
                </common-toggle>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';
import { useStore } from '~/store';
import CommonSelect from '~/components/common/basic/CommonSelect.vue';
import CommonTabs from '~/components/common/basic/CommonTabs.vue';
import type { SelectItem } from '~/types/components/select';
import type { IUserMapSettings } from '~/utils/backend/handlers/map-settings';
import CommonNotification from '~/components/common/basic/CommonNotification.vue';

const store = useStore();

const tab = ref('hide');

const tracksOptions: SelectItem<NonNullable<IUserMapSettings['tracks']['mode']>>[] = [
    {
        value: 'arrivalsAndLanded',
        text: 'Arrivals',
    },
    {
        value: 'arrivalsOnly',
        text: 'Airborne Arrivals (default)',
    },
    {
        value: 'departures',
        text: 'Airborne Departures',
    },
    {
        value: 'ground',
        text: 'Ground traffic',
    },
    {
        value: 'allAirborne',
        text: 'All Airborne',
    },
    {
        value: 'all',
        text: 'All',
    },
];
</script>
