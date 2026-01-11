<template>
    <div class="__info-sections">
        <ui-tabs
            v-model="tab"
            mobile-vertical
            :tabs="{ hide: { title: 'ATC & Layers' }, modes: { title: 'Airports & Traffic' } }"
        />

        <template v-if="tab === 'modes'">

            <ui-block-title>
                Airports
            </ui-block-title>

            <div class="__grid-info-sections __grid-info-sections--large-title">
                <div class="__grid-info-sections_title">
                    Display mode
                </div>

                <ui-select
                    :items="[
                        { text: 'All', value: 'all' },
                        { text: 'Staffed only', value: 'staffedOnly' },
                        { text: 'Staffed or has ground traffic', value: 'staffedAndGroundTraffic' },
                    ]"
                    :model-value="store.mapSettings.airportsMode ?? 'all'"
                    @update:modelValue="setUserMapSettings({ airportsMode: $event as any })"
                />
            </div>

            <ui-toggle
                :model-value="!!store.mapSettings.hideATISOnly"
                @update:modelValue="setUserMapSettings({ hideATISOnly: $event })"
            >
                Hide info when only ATIS

                <template #description>
                    Hides ATIS button when airport only has ATIS
                </template>
            </ui-toggle>

            <ui-block-title>
                Tracks (turns)
            </ui-block-title>

            <div class="__grid-info-sections __grid-info-sections--large-title">
                <div class="__grid-info-sections_title">
                    Airport traffic mode
                </div>

                <ui-select
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

                <ui-select
                    :items="[ { value: 50 }, { value: 40 }, { value: 25 }, { value: 15 }, { value: 10 } ]"
                    :model-value="store.mapSettings.tracks?.limit ?? 50"
                    placeholder="Limit"
                    width="100%"
                    @update:modelValue="setUserMapSettings({ tracks: { limit: $event as number } })"
                />
            </div>

            <ui-toggle
                :model-value="store.mapSettings.tracks?.showOutOfBounds !== true"
                @update:modelValue="setUserMapSettings({ tracks: { showOutOfBounds: !$event } })"
            >
                Hide when aircraft not visible

                <template #description>
                    Improves performance
                </template>
            </ui-toggle>

            <ui-block-title>
                Ground traffic
            </ui-block-title>

            <ui-select
                :items="[
                    { text: 'Hide all', value: 'always' },
                    { text: 'Hide if zoomed out (default)', value: 'lowZoom' },
                    { text: 'Show all', value: 'never' },
                ]"
                :model-value="store.mapSettings.groundTraffic?.hide ?? null"
                placeholder="Ground traffic mode"
                @update:modelValue="setUserMapSettings({ groundTraffic: { hide: $event as any } })"
            />

            <div class="__section-group">
                <ui-toggle
                    :disabled="!store.user || store.mapSettings.groundTraffic?.hide === 'never'"
                    :model-value="store.mapSettings.groundTraffic?.excludeMyLocation === true"
                    @update:modelValue="setUserMapSettings({ groundTraffic: { excludeMyLocation: $event } })"
                >
                    Apply to current

                    <template #description>
                        By default, we still show traffic for airport you're currently in
                    </template>
                </ui-toggle>
                <ui-toggle
                    :disabled="!store.user || store.mapSettings.groundTraffic?.hide === 'never'"
                    :model-value="store.mapSettings.groundTraffic?.excludeMyArrival === true"
                    @update:modelValue="setUserMapSettings({ groundTraffic: { excludeMyArrival: $event } })"
                >
                    Apply to arrival

                    <template #description>
                        By default, we still show traffic for airport you're flying to
                    </template>
                </ui-toggle>
            </div>
        </template>
        <template v-else>
            <ui-block-title>
                ATC
            </ui-block-title>

            <ui-toggle
                :disabled="store.mapSettings.visibility?.atc === false"
                :model-value="!store.mapSettings.visibility?.atcLabels"
                @update:modelValue="setUserMapSettings({ visibility: { atcLabels: !$event } })"
            >
                Labels
            </ui-toggle>

            <div class="__section-group __section-group--even">
                <ui-toggle
                    :model-value="store.mapSettings.visibility?.bookings ?? true"
                    @update:modelValue="setUserMapSettings({ visibility: { bookings: $event } })"
                >
                    Show Bookings
                </ui-toggle>
                <ui-toggle
                    :model-value="store.mapSettings.bookingsLocalTimezone ?? false"
                    @update:modelValue="setUserMapSettings({ bookingsLocalTimezone: $event })"
                >
                    Bookings local time
                </ui-toggle>
            </div>

            <div class="__grid-info-sections __grid-info-sections--large-title">
                <div class="__grid-info-sections_title">
                    Hours In Advance
                </div>
                <ui-select
                    :disabled="!(store.mapSettings.visibility?.bookings ?? true)"
                    :items="[{ value: 0.5, text: '30 min' }, { value: 1, text: '1h' }, { value: 2, text: '2h' }, { value: 3, text: '3h' }, { value: 4, text: '4h' }]"
                    :model-value="store.mapSettings.bookingHours ?? 0.5"
                    placeholder="1h"
                    @update:modelValue="setUserMapSettings({ bookingHours: $event as any })"
                />
            </div>

            <ui-notification
                v-if="store.bookingOverride"
                type="error"
            >
                Booking override is active!
            </ui-notification>

            <div class="__section-group __section-group--even">
                <ui-toggle
                    :model-value="store.mapSettings.visibility?.atc !== false"
                    @update:modelValue="setUserMapSettings({ visibility: { atc: !$event ? false : {} } })"
                >
                    All
                </ui-toggle>

                <ui-toggle
                    :disabled="store.mapSettings.visibility?.atc === false"
                    :model-value="!isHideAtcType('firs')"
                    @update:modelValue="setUserMapSettings({ visibility: { atc: { firs: !$event } } })"
                >
                    FIRs
                </ui-toggle>

                <ui-toggle
                    :disabled="store.mapSettings.visibility?.atc === false"
                    :model-value="!isHideAtcType('approach')"
                    @update:modelValue="setUserMapSettings({ visibility: { atc: { approach: !$event } } })"
                >
                    Approach
                </ui-toggle>

                <ui-toggle
                    :disabled="store.mapSettings.visibility?.atc === false"
                    :model-value="!isHideAtcType('ground')"
                    @update:modelValue="setUserMapSettings({ visibility: { atc: { ground: !$event } } })"
                >
                    Locals
                </ui-toggle>
            </div>

            <ui-block-title>
                Pilots
            </ui-block-title>

            <ui-toggle
                :disabled="store.mapSettings.visibility?.pilots === true"
                :model-value="!store.mapSettings.visibility?.pilotLabels"
                @update:modelValue="setUserMapSettings({ visibility: { pilotLabels: !$event } })"
            >
                Labels
            </ui-toggle>

            <div class="__grid-info-sections __grid-info-sections--large-title">
                <div class="__grid-info-sections_title">
                    Max Labels to Show
                </div>
                <ui-select
                    :disabled="store.mapSettings.visibility?.pilots === true || store.mapSettings.visibility?.pilotLabels === true"
                    :items="[{ value: 10 }, { value: 25 }, { value: 50 }, { value: 75 }, { value: 100 },
                             { value: 150 }, { value: 200 }, { value: 300 }, { value: 400 }, { value: 500 }, { value: 1000 }]"
                    max-dropdown-height="200px"
                    :model-value="store.mapSettings.pilotLabelLimit ?? 100"
                    @update:modelValue="setUserMapSettings({ pilotLabelLimit: $event as number })"
                />
            </div>

            <ui-block-title>
                Objects
            </ui-block-title>

            <div class="__section-group __section-group--even">
                <ui-toggle
                    :model-value="!store.mapSettings.visibility?.airports"
                    @update:modelValue="setUserMapSettings({ visibility: { airports: !$event } })"
                >
                    Airports
                </ui-toggle>

                <ui-toggle
                    :model-value="!store.mapSettings.visibility?.pilots"
                    @update:modelValue="setUserMapSettings({ visibility: { pilots: !$event } })"
                >
                    Aircraft
                </ui-toggle>

                <ui-toggle
                    :model-value="!store.mapSettings.visibility?.gates"
                    @update:modelValue="setUserMapSettings({ visibility: { gates: !$event } })"
                >
                    Gates
                </ui-toggle>

                <ui-toggle
                    :model-value="!store.mapSettings.visibility?.runways"
                    @update:modelValue="setUserMapSettings({ visibility: { runways: !$event } })"
                >
                    Runways
                </ui-toggle>
            </div>

            <ui-block-title>
                Personal Info
            </ui-block-title>

            <div class="__section-group __section-group--even">
                <ui-toggle
                    :model-value="!store.mapSettings.visibility?.pilotsInfo"
                    @update:modelValue="setUserMapSettings({ visibility: { pilotsInfo: !$event } })"
                >
                    Pilots
                </ui-toggle>

                <ui-toggle
                    :model-value="!store.mapSettings.visibility?.atcInfo"
                    @update:modelValue="setUserMapSettings({ visibility: { atcInfo: !$event } })"
                >
                    Controllers
                </ui-toggle>
            </div>

            <ui-block-title>
                Navigraph Airports Layouts
            </ui-block-title>

            <ui-notification
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
            </ui-notification>

            <div class="__section-group __section-group--even">
                <ui-toggle
                    :disabled="!store.user?.hasCharts"
                    :model-value="!store.user?.hasCharts ? false : !store.mapSettings.navigraphLayers?.disable"
                    @update:modelValue="setUserMapSettings({ navigraphLayers: { disable: !$event } })"
                >
                    Enabled
                </ui-toggle>

                <ui-toggle
                    :disabled="!store.user?.hasCharts"
                    :model-value="!store.user?.hasCharts ? false : !store.mapSettings.navigraphLayers?.gatesFallback"
                    @update:modelValue="setUserMapSettings({ navigraphLayers: { gatesFallback: !$event } })"
                >
                    New gates system
                </ui-toggle>
            </div>

            <div
                v-if="store.user?.hasCharts"
                class="__section-group __section-group--even"
            >
                <ui-toggle
                    :disabled="!!store.mapSettings.navigraphLayers?.disable"
                    :model-value="!store.mapSettings.navigraphLayers?.hideTaxiways"
                    @update:modelValue="setUserMapSettings({ navigraphLayers: { hideTaxiways: !$event } })"
                >
                    Taxiways
                </ui-toggle>

                <ui-toggle
                    :disabled="!!store.mapSettings.navigraphLayers?.disable"
                    :model-value="!store.mapSettings.navigraphLayers?.hideRunwayExit"
                    @update:modelValue="setUserMapSettings({ navigraphLayers: { hideRunwayExit: !$event } })"
                >
                    Runway Exits
                </ui-toggle>

                <ui-toggle
                    :disabled="!!store.mapSettings.navigraphLayers?.disable"
                    :model-value="!store.mapSettings.navigraphLayers?.hideGateGuidance"
                    @update:modelValue="setUserMapSettings({ navigraphLayers: { hideGateGuidance: !$event } })"
                >
                    Gate Guidance
                </ui-toggle>

                <ui-toggle
                    :disabled="!!store.mapSettings.navigraphLayers?.disable"
                    :model-value="!store.mapSettings.navigraphLayers?.hideDeicing"
                    @update:modelValue="setUserMapSettings({ navigraphLayers: { hideDeicing: !$event } })"
                >
                    Deicing Pads
                </ui-toggle>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import UiBlockTitle from '~/components/ui/text/UiBlockTitle.vue';
import { useStore } from '~/store';
import UiSelect from '~/components/ui/inputs/UiSelect.vue';
import UiTabs from '~/components/ui/data/UiTabs.vue';
import type { SelectItem } from '~/types/components/select';
import type { IUserMapSettings } from '~/utils/backend/handlers/map-settings';
import UiNotification from '~/components/ui/data/UiNotification.vue';

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
