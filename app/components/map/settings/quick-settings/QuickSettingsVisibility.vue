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
                    :model-value="airportsShowMode"
                    @update:modelValue="setUserMapSettings({ airportsMode: $event as any })"
                />
            </div>

            <ui-toggle
                :model-value="!!atisAsUnstaffed"
                @update:modelValue="setUserMapSettings({ hideATISOnly: $event })"
            >
                Hide info when only ATIS

                <template #description>
                    Hides ATIS button when airport only has ATIS
                </template>
            </ui-toggle>

            <ui-select
                :items="[
                    { text: 'Unstaffed only (default)', value: 'unstaffed' },
                    { text: 'Always', value: 'all' },
                    { text: 'Never', value: 'none' },
                ]"
                :model-value="airportsDeclutterIf"
                @update:modelValue="setUserMapSettings({ airportsHide: $event as any })"
            >
                Hide airports on zoom
            </ui-select>

            <ui-block-title>
                Tracks (turns)
            </ui-block-title>

            <div class="__grid-info-sections __grid-info-sections--large-title">
                <div class="__grid-info-sections_title">
                    Airport traffic mode
                </div>

                <ui-select
                    :items="tracksOptions"
                    :model-value="aircraftTracksMode"
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
                    :model-value="aircraftTracksLimit"
                    placeholder="Limit"
                    width="100%"
                    @update:modelValue="setUserMapSettings({ tracks: { limit: $event as number } })"
                />
            </div>

            <ui-toggle
                :model-value="aircraftTracksShowOutOfBounds !== true"
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
                :model-value="groundTrafficHide"
                placeholder="Ground traffic mode"
                @update:modelValue="setUserMapSettings({ groundTraffic: { hide: $event as any } })"
            />

            <div class="__section-group">
                <ui-toggle
                    :disabled="!store.user || groundTrafficHide === 'never'"
                    :model-value="groundTrafficExcludeMyLocation === true"
                    @update:modelValue="setUserMapSettings({ groundTraffic: { excludeMyLocation: $event } })"
                >
                    Apply to current

                    <template #description>
                        By default, we still show traffic for airport you're currently in
                    </template>
                </ui-toggle>
                <ui-toggle
                    :disabled="!store.user || groundTrafficHide === 'never'"
                    :model-value="groundTrafficExcludeMyArrival === true"
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
                :disabled="!allAtcVisible"
                :model-value="atcLabels"
                @update:modelValue="setUserMapSettings({ visibility: { atcLabels: !$event } })"
            >
                Labels
            </ui-toggle>

            <div class="__section-group __section-group--even">
                <ui-toggle
                    :model-value="bookingsEnabled"
                    @update:modelValue="setUserMapSettings({ visibility: { bookings: $event } })"
                >
                    Show Bookings
                </ui-toggle>
                <ui-toggle
                    :model-value="bookingsLocalTimezone"
                    @update:modelValue="setUserMapSettings({ bookingsLocalTimezone: $event })"
                >
                    Bookings local time
                </ui-toggle>
                <ui-select
                    :disabled="!bookingsEnabled"
                    :items="[{ value: 0.5, text: '30 min' }, { value: 1, text: '1h' }, { value: 2, text: '2h' }, { value: 3, text: '3h' }, { value: 4, text: '4h' }]"
                    :model-value="bookingHours"
                    placeholder="30 min"
                    @update:modelValue="setUserMapSettings({ bookingHours: $event as any })"
                >
                    Hours in advance for bookings
                </ui-select>
            </div>

            <ui-columns-display
                align-items="flex-start"
                class="__section-group __section-group--even"
            >
                <template #col1>
                    <ui-toggle
                        :model-value="bookingsEnabled"
                        @update:modelValue="setUserMapSettings({ visibility: { bookings: $event } })"
                    >
                        Show Events on Map
                    </ui-toggle>
                </template>
                <template #col2>
                    <ui-select
                        :disabled="!eventsEnabled"
                        :items="[{ value: 1, text: '1h' }, { value: 2, text: '2h' }, { value: 3, text: '3h' }, { value: 6, text: '6h' }, { value: 12, text: '12h' }, { value: 24, text: '24h' }]"
                        :model-value="eventsHours"
                        placeholder="21h"
                        @update:modelValue="setUserMapSettings({ eventsHours: $event as any })"
                    >
                        Hours in advance for events
                    </ui-select>
                </template>
            </ui-columns-display>

            <ui-notification
                v-if="store.bookingOverride"
                type="error"
            >
                Booking override is active!
            </ui-notification>

            <div class="__section-group __section-group--even">
                <ui-toggle
                    :model-value="allAtcVisible"
                    @update:modelValue="setUserMapSettings({ visibility: { atc: !$event ? false : {} } })"
                >
                    All
                </ui-toggle>

                <ui-toggle
                    :disabled="!allAtcVisible"
                    :model-value="!isHideAtcType('firs')"
                    @update:modelValue="setUserMapSettings({ visibility: { atc: { firs: !$event } } })"
                >
                    FIRs
                </ui-toggle>

                <ui-toggle
                    :disabled="!allAtcVisible"
                    :model-value="!isHideAtcType('approach')"
                    @update:modelValue="setUserMapSettings({ visibility: { atc: { approach: !$event } } })"
                >
                    Approach
                </ui-toggle>

                <ui-toggle
                    :disabled="!allAtcVisible"
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
                :disabled="!pilotsVisible"
                :model-value="pilotLabels"
                @update:modelValue="setUserMapSettings({ visibility: { pilotLabels: !$event } })"
            >
                Labels
            </ui-toggle>

            <div class="__grid-info-sections __grid-info-sections--large-title">
                <div class="__grid-info-sections_title">
                    Max Labels to Show
                </div>
                <ui-select
                    :disabled="!pilotsVisible || !pilotLabels"
                    :items="[{ value: 10 }, { value: 25 }, { value: 50 }, { value: 75 }, { value: 100 },
                             { value: 150 }, { value: 200 }, { value: 300 }, { value: 400 }, { value: 500 }, { value: 1000 }]"
                    max-dropdown-height="200px"
                    :model-value="aircraftShowLimit"
                    @update:modelValue="setUserMapSettings({ pilotLabelLimit: $event as number })"
                />
            </div>

            <ui-block-title>
                Objects
            </ui-block-title>

            <div class="__section-group __section-group--even">
                <ui-toggle
                    :model-value="airportsVisible"
                    @update:modelValue="setUserMapSettings({ visibility: { airports: !$event } })"
                >
                    Airports
                </ui-toggle>

                <ui-toggle
                    :model-value="pilotsVisible"
                    @update:modelValue="setUserMapSettings({ visibility: { pilots: !$event } })"
                >
                    Aircraft
                </ui-toggle>

                <ui-toggle
                    :model-value="gatesVisible"
                    @update:modelValue="setUserMapSettings({ visibility: { gates: !$event } })"
                >
                    Gates
                </ui-toggle>

                <ui-toggle
                    :model-value="runwaysVisible"
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
                    :model-value="pilotsInfoVisible"
                    @update:modelValue="setUserMapSettings({ visibility: { pilotsInfo: !$event } })"
                >
                    Pilots
                </ui-toggle>

                <ui-toggle
                    :model-value="atcInfoVisible"
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
                remember-message="NAVIGRAPH_CONNECT_WARNING"
                type="error"
            >
                Airports Layouts are available to Navigraph Unlimited subscribers only.<br>

                <template v-if="store.user">
                    <a
                        class="__link"
                        @click="navigraphAuth"
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
                    :model-value="!store.user?.hasCharts ? false : navigraphAirportEnabled"
                    @update:modelValue="setUserMapSettings({ navigraphLayers: { disable: !$event } })"
                >
                    Enabled
                </ui-toggle>
            </div>

            <div
                v-if="store.user?.hasCharts"
                class="__section-group __section-group--even"
            >
                <ui-toggle
                    :disabled="!navigraphAirportEnabled"
                    :model-value="navigraphAirportTaxiways"
                    @update:modelValue="setUserMapSettings({ navigraphLayers: { hideTaxiways: !$event } })"
                >
                    Taxiways
                </ui-toggle>

                <ui-toggle
                    :disabled="!navigraphAirportEnabled"
                    :model-value="navigraphAirportRunwayExit"
                    @update:modelValue="setUserMapSettings({ navigraphLayers: { hideRunwayExit: !$event } })"
                >
                    Runway Exits
                </ui-toggle>

                <ui-toggle
                    :disabled="!navigraphAirportEnabled"
                    :model-value="navigraphAirportGateGuidance"
                    @update:modelValue="setUserMapSettings({ navigraphLayers: { hideGateGuidance: !$event } })"
                >
                    Gate Guidance
                </ui-toggle>

                <ui-toggle
                    :disabled="!navigraphAirportEnabled"
                    :model-value="navigraphAirportDeicing"
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
import type { IUserMapSettings } from '~/utils/server/handlers/map-settings';
import UiNotification from '~/components/ui/data/UiNotification.vue';
import UiColumnsDisplay from '~/components/ui/data/UiColumnsDisplay.vue';
import { navigraphAuth } from '~/composables/vatsim/auth';

const store = useStore();
const bookingsLocalTimezone = useSettingValueFromFunc('appearance.bookingsLocalTimezone');
const bookingHours = useSettingValueFromFunc('map.bookings.hours');
const airportsShowMode = useSettingValueFromFunc('map.preferences.airports.showMode');
const atisAsUnstaffed = useSettingValueFromFunc('map.preferences.airports.ATISAsUnstaffed');
const airportsDeclutterIf = useSettingValueFromFunc('map.preferences.airports.declutterIf');
const aircraftTracksMode = useSettingValueFromFunc('map.preferences.aircraft.tracks.mode');
const aircraftTracksLimit = useSettingValueFromFunc('map.preferences.aircraft.tracks.limit');
const aircraftTracksShowOutOfBounds = useSettingValueFromFunc('map.preferences.aircraft.tracks.showOutOfBounds');
const groundTrafficHide = useSettingValueFromFunc('map.preferences.airports.groundTraffic.hide');
const groundTrafficExcludeMyLocation = useSettingValueFromFunc('map.preferences.airports.groundTraffic.excludeMyLocation');
const groundTrafficExcludeMyArrival = useSettingValueFromFunc('map.preferences.airports.groundTraffic.excludeMyArrival');
const aircraftShowLimit = useSettingValueFromFunc('map.preferences.aircraft.showLimit');
const atcFirsVisible = useSettingValueFromFunc('map.visibility.atc.firs');
const atcApproachVisible = useSettingValueFromFunc('map.visibility.atc.approach');
const atcGroundVisible = useSettingValueFromFunc('map.visibility.atc.ground');
const allAtcVisible = computed(() => atcFirsVisible.value && atcApproachVisible.value && atcGroundVisible.value);
const atcLabels = useSettingValueFromFunc('map.visibility.atcLabels');
const bookingsEnabled = useSettingValueFromFunc('map.bookings.enabled');
const eventsEnabled = useSettingValueFromFunc('map.events.enabled');
const eventsHours = useSettingValueFromFunc('map.events.hours');
const pilotsVisible = useSettingValueFromFunc('map.visibility.pilots');
const pilotLabels = useSettingValueFromFunc('map.visibility.pilotLabels');
const airportsVisible = useSettingValueFromFunc('map.visibility.airports');
const gatesVisible = useSettingValueFromFunc('map.visibility.gates');
const runwaysVisible = useSettingValueFromFunc('map.visibility.runways');
const pilotsInfoVisible = useSettingValueFromFunc('map.visibility.pilotsInfo');
const atcInfoVisible = useSettingValueFromFunc('map.visibility.atcInfo');
const navigraphAirportEnabled = useSettingValueFromFunc('map.navigraph.airport.enabled');
const navigraphAirportTaxiways = useSettingValueFromFunc('map.navigraph.airport.taxiways');
const navigraphAirportRunwayExit = useSettingValueFromFunc('map.navigraph.airport.runwayExit');
const navigraphAirportGateGuidance = useSettingValueFromFunc('map.navigraph.airport.gateGuidance');
const navigraphAirportDeicing = useSettingValueFromFunc('map.navigraph.airport.deicing');

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
