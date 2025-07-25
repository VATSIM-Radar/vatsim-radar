<template>
    <div
        ref="container"
        class="search"
        :class="{ 'search--opened': isOpened || opened }"
    >
        <div class="search_container">
            <common-input-text
                ref="input"
                v-model="search"
                class="search_input"
                height="40px"
                placeholder="Search"
                @update:focused="$event && ([opened = true, filtersEnabled = false])"
            >
                <template #icon>
                    <search-icon width="16"/>
                </template>
            </common-input-text>
            <transition
                name="search_filters--appear"
            >
                <common-button
                    v-if="opened"
                    class="search_filters"
                    :type="filtersEnabled ? 'primary' : 'secondary'"
                    @click="filtersEnabled = !filtersEnabled"
                >
                    <template #icon>
                        <filter-icon/>

                        <div
                            v-if="filtersCount"
                            class="search_filters_badge"
                        >
                            {{ filtersCount }}
                        </div>
                    </template>
                </common-button>
            </transition>
        </div>
        <transition name="search_window--appear">
            <div
                v-if="isOpened"
                class="search_window"
            >
                <template v-if="filtersEnabled">
                    <common-block-title remove-margin>
                        Search Filters

                        <template #append>
                            <common-button
                                type="link"
                                @click="setUserLocalSettings({ traffic: { searchBy: []} })"
                            >
                                Reset
                            </common-button>
                        </template>
                    </common-block-title>

                    <div class="__section-group __section-group--even">
                        <common-button
                            size="S"
                            :type="canSearchBy('atc') ? 'primary' : 'secondary'"
                            @click="toggleSearchBy('atc')"
                        >
                            ATC
                        </common-button>
                        <common-button
                            size="S"
                            :type="canSearchBy('airports') ? 'primary' : 'secondary'"
                            @click="toggleSearchBy('airports')"
                        >
                            Airports
                        </common-button>
                        <common-button
                            size="S"
                            :type="canSearchBy('flights') ? 'primary' : 'secondary'"
                            @click="toggleSearchBy('flights')"
                        >
                            Flights
                        </common-button>
                    </div>

                    <common-select
                        :items="[
                            { value: 5 },
                            { value: 10 },
                            { value: 25 },
                            { value: 50 },
                            { value: 75 },
                        ]"
                        :model-value="searchLimit"
                        :placeholder="`Max items per category (${ searchLimit })`"
                        show-placeholder
                        @update:modelValue="setUserLocalSettings({ traffic: { searchLimit: $event as number } })"
                    />
                </template>
                <div
                    v-else
                    class="__info-sections"
                    :class="{ 'search__results-airports-match': exactAirportsMatch }"
                >
                    <div
                        v-if="searchResults.flights && canSearchBy('flights')"
                        class="__info-sections search__results search__results--flights"
                    >
                        <common-block-title
                            :bubble="searchResults.flights.length"
                            :collapsed="collapsedData.flights ?? false"
                            remove-margin
                            @update:collapsed="collapsedData.flights = $event ?? false"
                        >
                            Flights
                        </common-block-title>
                        <template v-if="!collapsedData.flights">
                            <common-info-block
                                v-for="flight in searchResults.flights.slice(0, searchLimit)"
                                :key="flight.cid"
                                :bottom-items="[flight.aircraft_short?.split('/')[0], flight.departure]"
                                is-button
                                :top-items="[flight.callsign]"
                                @click="['status' in flight ? mapStore.addPilotOverlay(flight.cid.toString(), true) : mapStore.addPrefileOverlay(flight.cid.toString()), opened = false]"
                            >
                                <template #top>
                                    <div class="search_window__flight">
                                        <div class="search_window__flight_name">
                                            {{ flight.callsign }}
                                        </div>
                                        <div
                                            v-if="'status' in flight && flight.status"
                                            class="search_window__flight_status"
                                            :style="{ '--color': getAircraftStatusColor(getFlightStatus(flight), flight.cid) }"
                                        />
                                    </div>
                                </template>
                                <template
                                    #bottom="{ item, index }"
                                >
                                    <template v-if="index === 1">
                                        from <strong>{{ flight.departure }}</strong> to <strong>{{ flight.arrival }}</strong>
                                    </template>
                                    <template v-else>
                                        {{ item }}
                                    </template>
                                </template>
                            </common-info-block>
                        </template>
                    </div>
                    <div
                        v-if="searchResults.airports && canSearchBy('airports')"
                        class="__info-sections search__results search__results--airports"
                    >
                        <common-block-title
                            :bubble="searchResults.airports.length"
                            :collapsed="collapsedData.airports ?? false"
                            remove-margin
                            @update:collapsed="collapsedData.airports = $event ?? false"
                        >
                            Airports
                        </common-block-title>
                        <template v-if="!collapsedData.airports">
                            <common-info-block
                                v-for="airport in searchResults.airports.slice(0, searchLimit)"
                                :key="airport.icao"
                                :bottom-items="[airport.name]"
                                is-button
                                :top-items="[airport.icao, getAirportCountry(airport.icao)?.country]"
                                @click="[mapStore.addAirportOverlay(airport.icao), showAirportOnMap(airport, map), opened = false]"
                            />
                        </template>
                    </div>
                    <div
                        v-if="searchResults.atc && canSearchBy('atc')"
                        class="__info-sections search__results search__results--atc"
                    >
                        <common-block-title
                            :bubble="searchResults.atc.length"
                            :collapsed="collapsedData.atc ?? false"
                            remove-margin
                            @update:collapsed="collapsedData.atc = $event ?? false"
                        >
                            ATC
                        </common-block-title>
                        <template v-if="!collapsedData.atc">
                            <common-controller-info
                                :controllers=" searchResults.atc.slice(0, searchLimit)"
                                is-button
                                max-height="auto"
                                show-facility
                                small
                                @overlay="opened = false"
                            />
                        </template>
                    </div>
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
import SearchIcon from '@/assets/icons/kit/search.svg?component';
import FilterIcon from '@/assets/icons/kit/filter.svg?component';
import CommonInputText from '~/components/common/basic/CommonInputText.vue';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import type { VatSpyAirports } from '~/types/data/vatspy';
import type { SearchFilter, SearchResults } from '~/types/map';
import { useStore } from '~/store';
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';
import type { PartialRecord } from '~/types';
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';
import { useMapStore } from '~/store/map';
import CommonControllerInfo from '~/components/common/vatsim/CommonControllerInfo.vue';
import type { VatsimShortenedAircraft } from '~/types/data/vatsim';
import type { MapAircraftStatus } from '~/composables/pilots';
import CommonSelect from '~/components/common/basic/CommonSelect.vue';
import { showAirportOnMap } from '~/composables/atc';
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';

const filtersEnabled = ref(false);
const opened = ref(false);
const search = ref('');
const exactAirportsMatch = ref(false);

const store = useStore();
const dataStore = useDataStore();
const mapStore = useMapStore();

const map = inject<ShallowRef<Map | null>>('map')!;

const collapsedData = reactive<PartialRecord<keyof SearchResults, boolean>>({});
const searchResults = shallowRef<Partial<SearchResults>>({});

const isOpened = computed(() => {
    return (opened.value && Object.values(searchResults.value).some(x => x.length)) || filtersEnabled.value;
});

const filterBy = computed<SearchFilter[]>(() => store.localSettings.traffic?.searchBy?.length ? store.localSettings.traffic?.searchBy : ['atc', 'flights', 'airports']);
const filtersCount = computed(() => (filterBy.value.length === 0 || filterBy.value.length === 3) ? 0 : filterBy.value.length);
const searchLimit = computed(() => store.localSettings.traffic?.searchLimit ?? 10);

const canSearchBy = (filter: SearchFilter): boolean => {
    if (!filtersCount.value) return true;

    return filterBy.value.includes(filter);
};


const toggleSearchBy = (filter: SearchFilter) => {
    let settings = filterBy.value;
    if (!filterBy.value.includes(filter)) settings.push(filter);
    else settings = settings.filter(x => x !== filter);

    setUserLocalSettings({
        traffic: {
            searchBy: toRaw(settings),
        },
    });
};

const getFlightStatus = (pilot: VatsimShortenedAircraft): MapAircraftStatus => {
    switch (pilot.status) {
        case 'arrGate':
        case 'arrTaxi':
            return 'landed';
        case 'arriving':
            return 'arriving';
        case 'depGate':
        case 'depTaxi':
            return 'departing';
        case 'departed':
            return 'green';
        default:
            return 'default';
    }
};

function compareFlightWithSearch(search: string, data: SearchResults['flights']) {
    const dataStore = useDataStore();

    return data.filter(x => {
        const name = x.name.split(' ').filter(x => !dataStore.vatspy.value?.data.keyAirports.realIcao[x] && !dataStore.vatspy.value?.data.keyAirports.realIata[x]).join(' ');

        return x.cid.toString().includes(search) || x.callsign.includes(search) || name.toUpperCase().includes(search) || x.aircraft_short?.includes(search) || x.aircraft_faa?.includes(search);
    });
}

watch([search, opened], async ([val]) => {
    await sleep(500);
    if (search.value !== val) return;

    val = val.trim().toUpperCase();

    if (!val) {
        searchResults.value = {};
        return;
    }

    const results: Partial<SearchResults> = {};

    exactAirportsMatch.value = false;

    if (canSearchBy('airports')) {
        // Search by exact key
        let airports: VatSpyAirports = [dataStore.vatspy.value?.data.keyAirports.realIcao[val], dataStore.vatspy.value?.data.keyAirports.realIata[val]].filter(x => !!x) as VatSpyAirports;

        if (!airports.length) {
            airports = dataStore.vatspy.value?.data.airports.filter(x => !x.isPseudo && (x.icao.includes(val) || x.iata?.includes(val) || x.name.toUpperCase().includes(val))) ?? [];
        }
        else exactAirportsMatch.value = true;

        if (airports.length) {
            airports = airports.sort((a, b) => {
                if ((a.icao.startsWith(val) || a.iata?.startsWith(val)) && !(b.icao.startsWith(val) || b.iata?.startsWith(val))) return -1;
                if (!(a.icao.startsWith(val) || a.iata?.startsWith(val)) && (b.icao.startsWith(val) || b.iata?.startsWith(val))) return 1;
                return 0;
            });

            results.airports = airports;
        }
    }

    if (canSearchBy('atc')) {
        let atc: SearchResults['atc'] = dataStore.vatsim.data.firs.value.filter(x => x.name?.toUpperCase().includes(val) ||
            x.icao?.includes(val) ||
            x.firs.some(x => x.icao.includes(val) || x.callsign?.includes(val)) ||
            x.controller.callsign.includes(val) ||
            x.controller.name.toUpperCase().includes(val) ||
            x.controller.frequency.includes(val) ||
            x.controller.cid.toString().includes(val) ||
            x.controller.text_atis?.includes(val)).map(x => x.controller);

        atc = atc.concat(
            dataStore.vatsim.data.locals.value.filter(x => x.airport.icao.includes(val) ||
                x.airport.iata?.includes(val) ||
                x.atc.callsign.includes(val) ||
                x.atc.name.toUpperCase().includes(val) ||
                x.atc.frequency.includes(val) ||
                x.atc.cid.toString().includes(val) ||
                x.atc.text_atis?.includes(val)).map(x => x.atc),
        );

        if (atc.length) results.atc = atc;
    }

    if (canSearchBy('flights')) {
        let flights: SearchResults['flights'] = compareFlightWithSearch(val, dataStore.vatsim.data.pilots.value);

        flights = flights.concat(compareFlightWithSearch(val, dataStore.vatsim.data.prefiles.value));

        flights = flights.sort((a, b) => a.callsign.localeCompare(b.callsign, undefined, { numeric: true })).sort((a, b) => {
            if (a.callsign.includes(val) && !b.callsign.includes(val)) return -1;
            if (!a.callsign.includes(val) && b.callsign.includes(val)) return 1;
            return 0;
        });

        if (flights.length) results.flights = flights;
    }

    searchResults.value = results;
});

const container = useTemplateRef('container');
useClickOutside({
    element: container,
    callback: () => {
        opened.value = false;
        filtersEnabled.value = false;
    },
});

watch(() => mapStore.overlays.length, () => {
    store.searchActive = false;
});

const input = useTemplateRef('input');

onMounted(() => {
    async function handleClick(event: KeyboardEvent) {
        if ((event.ctrlKey || event.metaKey) && event.code === 'KeyF') {
            event.preventDefault();
            store.searchActive = true;
            await nextTick();

            input.value?.$el.querySelector('input')?.focus();
        }
    }

    document.addEventListener('keydown', handleClick);

    onBeforeUnmount(() => document.removeEventListener('keydown', handleClick));
});
</script>

<style scoped lang="scss">
.search {
    position: relative;

    @include mobile {
        scrollbar-gutter: stable;

        position: absolute;
        top: 100%;
        left: 0;

        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: center;

        width: 100%;
        height: calc(100vh - 56px);
        padding: 16px;

        background: $darkgray950;
    }

    &_container {
        display: flex;
        gap: 8px;
        width: 100%;

        @include mobile {
            position: sticky;
            bottom: 0;
        }
    }

    @include pc {
        & &_input {
            width: 280px;
        }

        &--opened .search_input {
            width: 240px;
        }
    }

    @include mobile {
        & &_input {
            height: 40px;
        }
    }

    &_filters {
        position: relative;

        &--appear {
            &-enter-active,
            &-leave-active {
                overflow: visible;
                transition: 0.3s;
            }

            &-enter-from,
            &-leave-to {
                width: 0;
                padding: 0;
                visibility: hidden;
                opacity: 0;
            }
        }

        &_badge {
            position: absolute;
            top: -5px;
            left: calc(100% - 8px);

            display: flex;
            align-items: center;

            height:14px;
            padding: 0 4px;
            border: 1px solid $darkgray950;
            border-radius: 4px;

            font-size: 12px;
            font-weight: 600;
            line-height: 100%;

            background: $primary500;
        }
    }

    &_window {
        scrollbar-gutter: stable;

        position: absolute;
        z-index: 10;
        top: 100%;
        left: 0;

        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;

        width: 100%;
        min-height: 320px;
        max-height: 50vh;
        padding: 16px;
        border-bottom-right-radius: 8px;
        border-bottom-left-radius: 8px;

        background: $darkgray1000;

        @include mobile {
            position: relative;
            top: 0;

            min-height: unset;
            max-height: unset;
            border-radius: 8px;
        }

        @include tablet {
            .__info-sections {
                flex-direction: row;
                flex-wrap: wrap;

                .title {
                    width: 100%;
                }
            }
        }

        &--appear {
            &-enter-active,
            &-leave-active {
                transition: 0.3s;
            }

            &-enter-from,
            &-leave-to {
                top: calc(100% - 20px);
                opacity: 0;

                @include mobile {
                    top: -5px;
                }
            }
        }

        :deep(.popup-block) {
            padding: 0 !important;
        }

        &__flight {
            display: flex;
            align-items: center;
            justify-content: space-between;

            &_status {
                width: 8px;
                height: 8px;
                border-radius: 100%;
                background: var(--color);
            }
        }
    }

    &__results {
        &-airports-match {
            .search__results--flights {
                order: 3;
            }

            .search__results--atc {
                order: 2;
            }

            .search__results--airports {
                order: 1;
            }
        }
    }
}
</style>
