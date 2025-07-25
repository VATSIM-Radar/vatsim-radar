<template>
    <div class="filter __info-sections">
        <common-tabs
            v-model="tab"
            :tabs="{
                filter: {
                    title: 'Filter',
                },
                manage: {
                    title: 'Manage',
                },
            }"
        />

        <template v-if="tab === 'filter'">
            <common-notification
                cookie-name="filters-input"
                type="info"
            >
                Press enter in search field to add your value to list
            </common-notification>
            <common-notification
                v-if="hasActiveFilter"
                type="info"
            >
                You have applied filter

                <common-button
                    link-color="error500"
                    type="link"
                    @click="resetUserActiveFilter"
                >
                    Reset
                </common-button>
            </common-notification>
            <common-block-title
                v-model:collapsed="collapsedStates.users"
                remove-margin
            >
                Users
            </common-block-title>
            <template v-if="!collapsedStates.users">
                <map-filter-columns>
                    <template #col1>
                        <map-filter-box
                            :model-value="store.filter.users?.pilots?.value ?? []"
                            placeholder="SBI"
                            show-chip-value
                            :suggestions="pilotSuggestions.airline"
                            @update:modelValue="setUserFilter({ users: { pilots: { value: $event as string[] } } })"
                        >
                            Pilots Callsigns
                        </map-filter-box>

                        <div class="__grid-info-sections __grid-info-sections--vertical">
                            <div class="__grid-info-sections_title">
                                Strategy (Pilots)
                            </div>
                            <common-radio-group
                                :items="[{ value: 'prefix', text: 'Start with' }, { value: 'include', text: 'Include' }]"
                                :model-value="store.filter.users?.pilots?.type ?? 'prefix'"
                                two-cols
                                @update:modelValue="setUserFilter({ users: { pilots: { type: $event as any } } })"
                            />
                        </div>
                    </template>
                    <template #col2>
                        <map-filter-box
                            :model-value="store.filter.users?.atc?.value ?? []"
                            placeholder="ULLI"
                            @update:modelValue="setUserFilter({ users: { atc: { value: $event as string[] } } })"
                        >
                            ATC Callsigns
                        </map-filter-box>

                        <div class="__grid-info-sections __grid-info-sections--vertical">
                            <div class="__grid-info-sections_title">
                                Strategy (ATC)
                            </div>
                            <common-radio-group
                                :items="[{ value: 'prefix', text: 'Start with' }, { value: 'include', text: 'Include' }]"
                                :model-value="store.filter.users?.atc?.type ?? 'prefix'"
                                two-cols
                                @update:modelValue="setUserFilter({ users: { atc: { type: $event as any } } })"
                            />
                        </div>
                    </template>
                </map-filter-columns>

                <map-filter-columns>
                    <template #col1>
                        <map-filter-box
                            is-number
                            :model-value="store.filter.users?.cids ?? []"
                            placeholder="800000"
                            @update:modelValue="setUserFilter({ users: { cids: $event as number[] } })"
                        >
                            CIDs
                        </map-filter-box>
                    </template>
                    <template
                        v-if="store.lists.some(x => x.users.length)"
                        #col2
                    >
                        <map-filter-box
                            always-show-text
                            is-number
                            :model-value="store.filter.users?.lists ?? []"
                            strict
                            :suggestions="store.lists.map(x => ({ value: x.id, text: x.name }))"
                            @update:modelValue="setUserFilter({ users: { lists: $event as number[] } })"
                        >
                            Favorite Lists
                        </map-filter-box>
                    </template>
                </map-filter-columns>
                <common-radio-group
                    :items="[{ value: 'and', text: 'Match callsigns AND cids/lists' }, { value: 'or', text: 'Match callsigns OR cids/lists' }]"
                    :model-value="store.filter.users?.strategy ?? 'or'"
                    @update:modelValue="setUserFilter({ users: { strategy: $event as any } })"
                />
            </template>
            <common-block-title
                v-model:collapsed="collapsedStates.airports"
                remove-margin
            >
                Airports
            </common-block-title>
            <template v-if="!collapsedStates.airports">
                <map-filter-columns>
                    <template #col1>
                        <map-filter-box
                            :model-value="store.filter.airports?.departure ?? []"
                            placeholder="ULLI"
                            show-chip-value
                            strict
                            :suggestions="airportsSuggestions"
                            @update:modelValue="setUserFilter({ airports: { departure: $event as string[] } })"
                        >
                            Departure airports
                        </map-filter-box>
                    </template>
                    <template #col2>
                        <map-filter-box
                            :model-value="store.filter.airports?.arrival ?? []"
                            placeholder="UUDD"
                            show-chip-value
                            strict
                            :suggestions="airportsSuggestions"
                            @update:modelValue="setUserFilter({ airports: { arrival: $event as string[] } })"
                        >
                            Arrival airports
                        </map-filter-box>
                    </template>
                </map-filter-columns>
                <common-select
                    v-if="getEvents.length"
                    :items="getEvents"
                    :model-value="null"
                    placeholder="Set airports from event"
                    show-placeholder
                    @update:modelValue="setEventAirports($event as number)"
                />
                <map-filter-columns>
                    <template #col1>
                        <map-filter-box
                            :model-value="store.filter.airports?.departurePrefix ?? []"
                            placeholder="UL"
                            @update:modelValue="setUserFilter({ airports: { departurePrefix: ($event as string[]).filter(x => x.length <= 4) } })"
                        >
                            Departure airports prefixes
                        </map-filter-box>
                    </template>
                    <template #col2>
                        <map-filter-box
                            :model-value="store.filter.airports?.arrivalPrefix ?? []"
                            placeholder="UU"
                            @update:modelValue="setUserFilter({ airports: { arrivalPrefix: ($event as string[]).filter(x => x.length <= 4) } })"
                        >
                            Arrival airports prefixes
                        </map-filter-box>
                    </template>
                </map-filter-columns>
                <map-filter-box
                    :model-value="store.filter.airports?.routes ?? []"
                    placeholder="ULLI-UUDD"
                    @update:modelValue="setRoutes($event as string[])"
                >
                    Routes
                </map-filter-box>
                <common-notification
                    cookie-name="filters-routes-format"
                    type="info"
                >
                    Format: ICAO-ICAO
                </common-notification>
                <common-toggle v-model="routesBothDirection">
                    Both directions
                </common-toggle>
                <common-select
                    v-if="getRouteEvents.length"
                    :items="getRouteEvents"
                    :model-value="null"
                    placeholder="Set routes from event"
                    show-placeholder
                    @update:modelValue="setEventRoutes($event as number)"
                />
            </template>
            <common-block-title
                v-model:collapsed="collapsedStates.atc"
                remove-margin
            >
                ATC
            </common-block-title>
            <template v-if="!collapsedStates.atc">
                <map-filter-columns>
                    <template #col1>
                        <map-filter-box
                            always-show-text
                            input-type="text"
                            is-number
                            :model-value="store.filter.atc?.ratings ?? []"
                            strict
                            :suggestions="atcRatings"
                            @update:modelValue="setUserFilter({ atc: { ratings: $event as number[] } })"
                        >
                            Rating
                        </map-filter-box>
                    </template>
                    <template #col2>
                        <map-filter-box
                            always-show-text
                            input-type="text"
                            is-number
                            :model-value="store.filter.atc?.facilities ?? []"
                            strict
                            :suggestions="atcPositions"
                            @update:modelValue="setUserFilter({ atc: { facilities: $event as number[] } })"
                        >
                            Position
                        </map-filter-box>
                    </template>
                </map-filter-columns>
            </template>
            <common-block-title
                v-model:collapsed="collapsedStates.flights"
                remove-margin
            >
                Flights
            </common-block-title>
            <template v-if="!collapsedStates.flights">
                <map-filter-columns>
                    <template #col1>
                        <common-select
                            :items="[{ value: 'departing', text: 'Departing' }, { value: 'all', text: 'All' }, { value: 'airborne', text: 'Airborne' }, { value: 'arrived', text: 'Arrived' }]"
                            :model-value="store.filter.flights?.status ?? 'all'"
                            placeholder="Status"
                            @update:modelValue="setUserFilter({ flights: { status: $event as any } })"
                        >
                            <template #label>
                                Status
                            </template>
                        </common-select>
                    </template>
                    <template #col2>
                        <common-select
                            :items="[{ value: 'all', text: 'All' }, { value: 'domestic', text: 'Domestic' }, { value: 'international', text: 'International' }]"
                            :model-value="store.filter.flights?.type ?? 'all'"
                            @update:modelValue="setUserFilter({ flights: { type: $event as any } })"
                        >
                            <template #label>
                                Type
                            </template>
                        </common-select>
                    </template>
                </map-filter-columns>
                <map-filter-columns>
                    <template #col1>
                        <map-filter-box
                            :model-value="store.filter.flights?.aircraft ?? []"
                            :suggestions="pilotSuggestions.aircraft"
                            @update:modelValue="setUserFilter({ flights: { aircraft: $event as string[] } })"
                        >
                            Aircraft type
                        </map-filter-box>
                    </template>
                    <template #col2>
                        <map-filter-box
                            :model-value="store.filter.flights?.squawks ?? []"
                            @update:modelValue="setUserFilter({ flights: { squawks: ($event as string[]).filter(x => x.length === 4) } })"
                        >
                            Squawks
                        </map-filter-box>
                    </template>
                </map-filter-columns>
                <map-filter-columns align-items="flex-start">
                    <template #col1>
                        <map-filter-box
                            always-show-text
                            input-type="text"
                            is-number
                            :model-value="store.filter.flights?.ratings ?? []"
                            strict
                            :suggestions="pilotRatings"
                            @update:modelValue="setUserFilter({ flights: { ratings: $event as number[] } })"
                        >
                            Rating
                        </map-filter-box>
                    </template>
                    <template #col2>
                        <map-filter-box
                            :model-value="store.filter.flights?.altitude ?? []"
                            @update:modelValue="($event as string[]).every(x => parseFilterAltitude(x).length) && setUserFilter({ flights: { altitude: $event as string[] } })"
                        >
                            Altitude
                        </map-filter-box>
                    </template>
                </map-filter-columns>
                <common-notification
                    type="info"
                >
                    Altitude allowed values examples: +FL100, -FL100, +10000, -10000, +FL100/-FL100, -10000/+10000
                </common-notification>
                <common-select
                    :items="[{ value: 'all', text: 'All' }, { value: 'ifr', text: 'IFR' }, { value: 'trueVfr', text: 'VFR (filed)' }, { value: 'allVfr', text: 'VFR + no plan' }, { value: 'none', text: 'No flight plan' }]"
                    :model-value="store.filter.flights?.plan ?? 'all'"
                    @update:modelValue="setUserFilter({ flights: { plan: $event as any } })"
                >
                    <template #label>
                        Flight plan
                    </template>
                </common-select>
                <common-toggle
                    :model-value="!!store.filter.flights?.diverted"
                    @update:modelValue="setUserFilter({ flights: { diverted: $event } } )"
                >
                    Diverted
                </common-toggle>
                <common-toggle
                    :model-value="!!store.filter.flights?.excludeNoFlightPlan"
                    @update:modelValue="setUserFilter({ flights: { excludeNoFlightPlan: $event } } )"
                >
                    Exclude flights with no flight plan
                </common-toggle>
            </template>
            <common-block-title remove-margin>Filter options</common-block-title>
            <common-toggle
                :model-value="typeof store.filter.others !== 'object'"
                @update:modelValue="setUserFilter({ others: $event ? 'hide' : {} } )"
            >
                Hide other aircraft
            </common-toggle>
            <template v-if="typeof store.filter.others === 'object'">
                <common-color
                    :model-value="{ transparency: store.filter.others.othersOpacity ?? 1 }"
                    transparency-only
                    @update:modelValue="setUserFilter({ others: { othersOpacity: $event.transparency } })"
                >
                    Non-filtered transparency
                </common-color>
                <common-color
                    :default-color="store.filter.others.ourColor"
                    :model-value="store.filter.others.ourColor"
                    @update:modelValue="setUserFilter({ others: { ourColor: $event as UserMapSettingsColor } })"
                >
                    Filtered color
                </common-color>
            </template>
            <common-toggle
                :model-value="!!store.filter.invert"
                @update:modelValue="setUserFilter({ invert: $event } )"
            >
                Invert filtration
            </common-toggle>
            <common-button-group class="filter__actions">
                <common-button
                    :disabled="Object.keys(store.filter).length === 0"
                    type="secondary"
                    @click="filterReset = true"
                >
                    Reset
                </common-button>
                <common-button
                    :disabled="areFiltersEqual"
                    type="primary"
                    @click="applyFilter"
                >
                    Apply
                </common-button>
            </common-button-group>
        </template>
        <map-filters-presets
            v-else
            endpoint-suffix="filters"
            has-share
            :max-presets="MAX_FILTERS"
            :presets="store.filterPresets"
            :refresh
            :selected-preset="store.filter"
            type="filter"
            @create="createFilterPreset"
            @reset="[resetUserFilter(), resetUserActiveFilter()]"
            @save="[setUserFilter($event, true), setUserActiveFilter($event)]"
        />
        <common-popup v-model="filterReset">
            <template #title>
                Filters Reset
            </template>

            You are about to reset your filter to defaults. This action is permanent.

            <template #actions>
                <common-button
                    type="secondary-flat"
                    @click="[resetUserFilter(), filterReset = false]"
                >
                    Confirm reset
                </common-button>
                <common-button
                    type="secondary-875"
                    @click="backupUserFilter()"
                >
                    Backup data
                </common-button>
                <common-button
                    type="primary"
                    @click="filterReset = false"
                >
                    Cancel that
                </common-button>
            </template>
        </common-popup>
    </div>
</template>

<script setup lang="ts">
import CommonTabs from '~/components/common/basic/CommonTabs.vue';
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';
import MapFilterBox from '~/components/map/filters/filters/MapFilterBox.vue';
import { useStore } from '~/store';
import { klona } from 'klona/json';
import { backupUserFilter, setUserActiveFilter, setUserFilter } from '~/composables/fetchers/filters';
import type { SelectItem } from '~/types/components/select';
import type { RadarDataAirline } from '~/utils/backend/storage';
import CommonNotification from '~/components/common/basic/CommonNotification.vue';
import MapFilterColumns from '~/components/map/filters/filters/MapFilterColumns.vue';
import CommonRadioGroup from '~/components/common/basic/CommonRadioGroup.vue';
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import CommonSelect from '~/components/common/basic/CommonSelect.vue';
import type { VatsimEventData } from '~~/server/api/data/vatsim/events';
import CommonColor from '~/components/common/basic/CommonColor.vue';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import { MAX_FILTERS, parseFilterAltitude } from '~/utils/shared';
import CommonButtonGroup from '~/components/common/basic/CommonButtonGroup.vue';
import MapFiltersPresets from '~/components/map/filters/MapFiltersPresets.vue';
import type { UserFilter } from '~/utils/backend/handlers/filters';
import { sendUserPreset } from '~/composables/fetchers';
import equal from 'deep-equal';
import type { UserMapSettingsColor } from '~/utils/backend/handlers/map-settings';

const store = useStore();
const tab = ref('filter');
const routesBothDirection = ref(true);

const atcPositions: SelectItem[] = Object.entries(useFacilitiesIds()).filter(([key]) => key !== 'OBS').map(([text, value]) => ({ value, text }));
const atcRatings: SelectItem[] = Object.entries(useRatingsIds()).map(([text, value]) => ({ value, text }));
const pilotRatings: SelectItem[] = Object.entries(usePilotRatings()).map(([text, value]) => ({ value, text }));

const collapsedStates = reactive({
    users: false,
    airports: false,
    atc: false,
    flights: false,
});

const filterReset = ref(false);
const dataStore = useDataStore();

const { data: events } = await useLazyAsyncData('events', async () => {
    return $fetch<VatsimEventData>('/api/data/vatsim/events');
});

const { refresh } = await useLazyAsyncData('filters-presets', async () => {
    await store.fetchFiltersPresets();

    return true;
});

const getClosestEvents = computed(() => {
    const date = dataStore.time.value;

    return events.value?.events.filter(x => {
        const startDate = new Date(x.start_time);
        const endDate = new Date(x.end_time);

        return endDate.getTime() + (1000 * 60 * 60) > date && startDate.getTime() - (1000 * 60 * 60) < date;
    });
});

const getEvents = computed<SelectItem[]>(() => {
    return getClosestEvents.value?.filter(x => x.airports.length).map(x => ({
        text: x.name,
        value: x.id,
    })) ?? [];
});

const getRouteEvents = computed<SelectItem[]>(() => {
    return getClosestEvents.value?.filter(x => x.routes.length).map(x => ({
        text: x.name,
        value: x.id,
    })) ?? [];
});

const areFiltersEqual = computed(() => {
    return equal(store.filter, store.activeFilter);
});

const hasActiveFilter = computed(() => {
    return hasActivePilotFilter();
});

const setEventAirports = (id: number) => {
    const event = events.value!.events.find(x => x.id === id)!;
    setUserFilter({
        airports: {
            departure: Array.from(new Set([
                ...store.filter.airports?.departure ?? [],
                ...event.airports.map(x => x.icao),
            ])),
            arrival: Array.from(new Set([
                ...store.filter.airports?.arrival ?? [],
                ...event.airports.map(x => x.icao),
            ])),
        },
    });
};

const setEventRoutes = (id: number) => {
    const event = events.value!.events.find(x => x.id === id)!;
    setUserFilter({
        airports: {
            routes: Array.from(new Set([
                ...store.filter.airports?.routes ?? [],
                ...event.routes.map(x => `${ x.departure }-${ x.arrival }`),
            ])),
        },
    });
};

const applyFilter = () => {
    setUserActiveFilter(klona(store.filter));
    store.getVATSIMData(true);
};

const pilotSuggestions = computed<{ airline: SelectItem[]; aircraft: SelectItem[] }>(() => {
    const airlines: Record<string, { airline: RadarDataAirline; count: number }> = {};
    const aircraft: Record<string, { aircraft: string; count: number }> = {};

    for (const pilot of dataStore.vatsim.data.pilots.value) {
        const airline = getAirlineFromCallsign(pilot.callsign);
        const aircraftShort = pilot.aircraft_short?.split('/')[0];

        if (airline) {
            if (airlines[airline.icao]) airlines[airline.icao].count++;
            else {
                airlines[airline.icao] = {
                    airline,
                    count: 1,
                };
            }
        }

        if (aircraftShort) {
            if (aircraft[aircraftShort]) aircraft[aircraftShort].count++;
            else {
                aircraft[aircraftShort] = {
                    aircraft: aircraftShort,
                    count: 1,
                };
            }
        }
    }

    return {
        aircraft: Object.entries(aircraft).sort((a, b) => b[1].count - a[1].count).map(x => ({
            value: x[1].aircraft,
        })),
        airline: Object.entries(airlines).sort((a, b) => b[1].count - a[1].count).map(x => ({
            value: x[1].airline.icao,
            text: x[1].airline.name,
        })),
    };
});

const airportsSuggestions = computed<SelectItem[]>(() => {
    return dataStore.vatspy.value!.data.airports.filter(x => !x.isPseudo).map(x => ({
        value: x.icao,
        text: x.name,
    }));
});

let previousRoutesLength = -1;

const setRoutes = (routes: string[]) => {
    if (previousRoutesLength === -1) previousRoutesLength = store.filter.airports?.routes?.length ?? 0;

    if (previousRoutesLength > routes.length) {
        previousRoutesLength = routes.length;
        setUserFilter({ airports: { routes: routes } });
        return;
    }

    const addedRoute = routes[routes.length - 1];

    const splitted = addedRoute.split('-');
    if (splitted.length !== 2 || !splitted.every(x => dataStore.vatspy.value?.data.keyAirports.realIcao[x as any])) {
        setUserFilter({ airports: { routes: routes.slice(0, routes.length - 2) } });
    }
    else if (routesBothDirection.value) {
        setUserFilter({ airports: { routes: [...routes, splitted.reverse().join('-')] } });
    }
    else {
        setUserFilter({ airports: { routes: routes } });
    }

    previousRoutesLength = store.filter.airports!.routes!.length;
};

const createFilterPreset = async (name: string, json: UserFilter) => {
    setUserFilter(await sendUserPreset(name, json, 'filters', () => createFilterPreset(name, json)));
    await refresh();
};
</script>

<style lang="scss" scoped>
.filter {
    &__actions {
        position: sticky;
        z-index: 5;
        bottom: -16px;

        margin: 0 -16px -16px;
        padding: 16px;

        background: $darkgray1000;
    }
}
</style>
