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
                            :suggestions="pilotSuggestions"
                            @update:modelValue="setUserFilters({ users: { pilots: { value: $event as string[] } } })"
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
                                @update:modelValue="setUserFilters({ users: { pilots: { type: $event as any } } })"
                            />
                        </div>
                    </template>
                    <template #col2>
                        <map-filter-box
                            :model-value="store.filter.users?.atc?.value ?? []"
                            placeholder="ULLI"
                            @update:modelValue="setUserFilters({ users: { atc: { value: $event as string[] } } })"
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
                                @update:modelValue="setUserFilters({ users: { atc: { type: $event as any } } })"
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
                            @update:modelValue="setUserFilters({ users: { cids: $event as number[] } })"
                        >
                            CIDs
                        </map-filter-box>
                    </template>
                    <template
                        v-if="store.lists.some(x => x.users.length)"
                        #col2
                    >
                        <map-filter-box
                            is-number
                            :model-value="store.filter.users?.lists ?? []"
                            strict
                            :suggestions="store.lists.map(x => ({ value: x.id, text: x.name }))"
                            @update:modelValue="setUserFilters({ users: { lists: $event as number[] } })"
                        >
                            Favorite Lists
                        </map-filter-box>
                    </template>
                </map-filter-columns>
                <common-radio-group
                    :items="[{ value: 'and', text: 'Match callsigns AND cids/lists' }, { value: 'or', text: 'Match callsigns OR cids/lists' }]"
                    :model-value="store.filter.users?.strategy ?? 'or'"
                    @update:modelValue="setUserFilters({ users: { strategy: $event as any } })"
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
                            @update:modelValue="setUserFilters({ airports: { departure: $event as string[] } })"
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
                            @update:modelValue="setUserFilters({ airports: { arrival: $event as string[] } })"
                        >
                            Arrival airports
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
                            @update:modelValue="setUserFilters({ atc: { ratings: $event as number[] } })"
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
                            @update:modelValue="setUserFilters({ atc: { facilities: $event as number[] } })"
                        >
                            Position
                        </map-filter-box>
                    </template>
                </map-filter-columns>
            </template>
        </template>
    </div>
</template>

<script setup lang="ts">
import CommonTabs from '~/components/common/basic/CommonTabs.vue';
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';
import MapFilterBox from '~/components/map/filters/filters/MapFilterBox.vue';
import { useStore } from '~/store';
import { setUserFilters } from '~/composables/fetchers/filters';
import type { SelectItem } from '~/types/components/select';
import type { RadarDataAirline } from '~/utils/backend/storage';
import CommonNotification from '~/components/common/basic/CommonNotification.vue';
import MapFilterColumns from '~/components/map/filters/filters/MapFilterColumns.vue';
import CommonRadioGroup from '~/components/common/basic/CommonRadioGroup.vue';
import CommonToggle from '~/components/common/basic/CommonToggle.vue';

const store = useStore();
const tab = ref('filter');
const routesBothDirection = ref(true);

const atcPositions: SelectItem[] = Object.entries(useFacilitiesIds()).filter(([key]) => key !== 'OBS').map(([text, value]) => ({ value, text }));
const atcRatings: SelectItem[] = Object.entries(useRatingsIds()).map(([text, value]) => ({ value, text }));

const collapsedStates = reactive({
    users: false,
    airports: false,
    atc: false,
    flights: false,
});

const dataStore = useDataStore();

const pilotSuggestions = computed<SelectItem[]>(() => {
    const airlines: Record<string, { airline: RadarDataAirline; count: number }> = {};

    for (const pilot of dataStore.vatsim.data.pilots.value) {
        const airline = getAirlineFromCallsign(pilot.callsign);
        if (!airline) continue;
        if (airlines[airline.icao]) airlines[airline.icao].count++;
        else {
            airlines[airline.icao] = {
                airline,
                count: 1,
            };
        }
    }

    return Object.entries(airlines).sort((a, b) => b[1].count - a[1].count).map(x => ({
        value: x[1].airline.icao,
        text: x[1].airline.name,
    }));
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
        setUserFilters({ airports: { routes: routes } });
        return;
    }

    const addedRoute = routes[routes.length - 1];

    const splitted = addedRoute.split('-');
    if (splitted.length !== 2 || !splitted.every(x => dataStore.vatspy.value?.data.keyAirports.realIcao[x as any])) {
        setUserFilters({ airports: { routes: routes.slice(0, routes.length - 2) } });
    }
    else if (routesBothDirection.value) {
        setUserFilters({ airports: { routes: [...routes, splitted.reverse().join('-')] } });
    }
    else {
        setUserFilters({ airports: { routes: routes } });
    }

    previousRoutesLength = store.filter.airports!.routes!.length;
};
</script>

<style scoped lang="scss">
.filter {

}
</style>
