<template>
    <div
        v-if="airport"
        class="aircraft"
        :class="{ 'aircraft--simple': simpleMode }"
    >
        <airport-aircraft-filter
            v-if="!filterRelativeToAircraft"
            v-model="aircraftGroundMode"
            v-model:opened="aircraftGroundFilterOpened"
        />

        <div
            v-if="!simpleMode"
            class="aircraft_nav"
        >
            <div
                class="aircraft_nav_item"
                :class="{ 'aircraft_nav_item--active': aircraftMode === 'ground' }"
                @click="aircraftMode = 'ground'"
            >
                <ground-icon/>
            </div>
            <div
                class="aircraft_nav_item"
                :class="{ 'aircraft_nav_item--active': aircraftMode === 'departed' }"
                @click="aircraftMode = 'departed'"
            >
                <departing-icon/>
            </div>
            <div
                class="aircraft_nav_item"
                :class="{ 'aircraft_nav_item--active': aircraftMode === 'arriving' }"
                @click="aircraftMode = 'arriving'"
            >
                <arriving-icon/>
            </div>
        </div>
        <div
            :key="aircraftMode"
            class="aircraft_list"
        >
            <template v-if="!simpleMode">
                <common-toggle v-model="showPilotStats">
                    Show pilots stats
                </common-toggle>
                <common-block-title class="aircraft_list_title">
                    <template v-if="aircraftMode === 'ground'">
                        On Ground
                    </template>
                    <template v-else-if="aircraftMode === 'departed'">
                        Departed
                    </template>
                    <template v-else-if="aircraftMode === 'arriving'">
                        Arriving
                    </template>
                    <template #bubble>
                        <common-bubble type="secondary">
                            {{ displayedAircraft.length }}
                        </common-bubble>
                    </template>
                    <template
                        v-if="aircraftMode === 'ground'"
                        #append
                    >
                        <div
                            class="aircraft_list__filter"
                            :class="{ 'aircraft_list__filter--active': aircraftGroundFilterOpened }"
                            @click="aircraftGroundFilterOpened = true"
                        >
                            <filter-icon/>

                            <airport-aircraft-filter
                                v-if="filterRelativeToAircraft"
                                v-model="aircraftGroundMode"
                                v-model:opened="aircraftGroundFilterOpened"
                                is-relative
                            />
                        </div>
                    </template>
                </common-block-title>
            </template>
            <common-info-block
                v-for="pilot in displayedAircraft"
                :key="pilot.cid"
                :bottom-items="[
                    (pilot.departure && pilot.arrival) ? 'destination': '',
                    pilot.aircraft_faa ?? 'No flight plan',
                    (pilot.distance && (aircraftMode !== 'ground' || !pilot.isArrival)) ? `${ Math.round(pilot.distance) }NM ${ aircraftMode !== 'ground' ? 'remains' : '' }` : '',
                    (pilot.eta && getTimeRemains(pilot.eta)) ? `in ${ getTimeRemains(pilot.eta) }` : '',
                    (pilot.eta && aircraftMode !== 'ground') ? `ETA ${ datetime.format(pilot.eta) }Z` : '',

                ]"
                class="aircraft__pilot"
                :class="{ 'aircraft__pilot--selected': simpleMode && selected === pilot.cid }"
                is-button
                @click="inDashboard ? selected = pilot.cid : ((aircraftMode === 'ground' && aircraftGroundMode === 'prefiles') ? mapStore.addPrefileOverlay(pilot.cid.toString()) : mapStore.addPilotOverlay(pilot.cid.toString()))"
            >
                <template #top>
                    <div
                        ref="pilots"
                        class="aircraft__pilot_header"
                        :class="{ '--has-stats': stats.some(x => x.cid === pilot.cid) }"
                        :data-cid="pilot.cid"
                    >
                        <div class="aircraft__pilot_header_title">
                            {{ pilot.callsign }}

                            <div
                                v-if="stats.find(x => x.cid === pilot.cid)"
                                class="aircraft__pilot_header_title_stats"
                            >
                                {{ stats.find(x => x.cid === pilot.cid)!.stats }}h
                            </div>

                            <common-bubble
                                v-if="'frequencies' in pilot && pilot.frequencies.length >= 1"
                                class="aircraft__pilot_header_title_frequency"
                                type="primary-flat"
                            >
                                {{ pilot.frequencies[0] }}
                            </common-bubble>
                        </div>
                        <div
                            v-if="!simpleMode"
                            class="aircraft__pilot_header_status"
                            :style="{ '--color': `rgb(var(--${ getLocalPilotStatus(pilot).color }))` }"
                        >
                            {{ getLocalPilotStatus(pilot).title }}
                        </div>
                    </div>
                </template>
                <template #bottom="{ item }">
                    <div
                        v-if="item === 'destination' && pilot.departure && pilot.arrival"
                        ref="pilots"
                        class="aircraft__pilot_route"
                    >
                        from <strong>{{ pilot.departure }}</strong> to <strong>{{ pilot.arrival }}</strong>
                    </div>
                    <template v-else>
                        {{ item }}
                    </template>
                </template>
            </common-info-block>
        </div>
    </div>
</template>

<script setup lang="ts">
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';
import DepartingIcon from '@/assets/icons/airport/departing.svg?component';
import GroundIcon from '@/assets/icons/airport/ground.svg?component';
import ArrivingIcon from '@/assets/icons/airport/landing.svg?component';
import { getAircraftForAirport, injectAirport } from '~/composables/airport';
import type { AirportPopupPilotStatus } from '~/composables/airport';
import { useDataStore } from '~/composables/data';
import { getPilotStatus, getTimeRemains, useShowPilotStats } from '~/composables/pilots';
import { useMapStore } from '~/store/map';
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';
import CommonBubble from '~/components/common/basic/CommonBubble.vue';
import FilterIcon from '@/assets/icons/kit/filter.svg?component';
import AirportAircraftFilter from '~/components/views/airport/AirportAircraftFilter.vue';
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import type { MapAircraftKeys } from '~/types/map';
import type { PropType } from 'vue';

const props = defineProps({
    filterRelativeToAircraft: {
        type: Boolean,
        default: false,
    },
    inDashboard: {
        type: Boolean,
        default: false,
    },
    simpleMode: {
        type: String as PropType<MapAircraftKeys | null>,
        default: null,
    },
    navOffset: {
        type: String,
        default: '0',
    },
});

const selected = defineModel<number | null>('selected', { type: Number, default: null });

const data = injectAirport();
const dataStore = useDataStore();
const mapStore = useMapStore();
const pilots = ref<HTMLDivElement[] | HTMLDivElement>([]);
const pilotsRefs = computed<HTMLDivElement[]>(() => {
    if (Array.isArray(pilots.value)) return pilots.value;
    if (pilots.value) return [pilots.value];
    return [];
});

const showPilotStats = useShowPilotStats();

const datetime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
});

export type AircraftGroundMode = 'depArr' | 'dep' | 'arr' | 'prefiles';

const aircraftMode = ref<'departed' | 'ground' | 'arriving'>('ground');
const aircraftGroundMode = ref<AircraftGroundMode>('depArr');
const aircraftGroundFilterOpened = ref(false);

const airport = computed(() => dataStore.vatspy.value?.data.airports.find(x => x.icao === data.value.icao));

const aircraft = getAircraftForAirport(data, computed(() => props.simpleMode));

watch(() => props.simpleMode, val => {
    if (!val) return;
    if (val === 'departures') aircraftMode.value = 'departed';
    if (val === 'arrivals') aircraftMode.value = 'arriving';
    if (val === 'groundDep') {
        aircraftMode.value = 'ground';
        aircraftGroundMode.value = 'dep';
    }
    if (val === 'groundArr') {
        aircraftMode.value = 'ground';
        aircraftGroundMode.value = 'arr';
    }
    if (val === 'prefiles') {
        aircraftMode.value = 'ground';
        aircraftGroundMode.value = 'prefiles';
    }
}, {
    immediate: true,
});

const displayedAircraft = computed((): AirportPopupPilotStatus[] => {
    if (aircraftMode.value === 'departed' || props.simpleMode === 'departures') {
        return aircraft.value?.departures.slice().sort((a, b) => a.flown - b.flown) ?? [];
    }
    if (aircraftMode.value === 'arriving' || props.simpleMode === 'arrivals') {
        return aircraft.value?.arrivals.slice().sort((a, b) => a.distance - b.distance) ?? [];
    }

    switch (props.simpleMode || aircraftGroundMode.value) {
        case 'depArr':
            return [
                ...aircraft.value?.groundDep ?? [],
                ...aircraft.value?.groundArr ?? [],
            ];
        case 'dep':
        case 'groundDep':
            return aircraft.value?.groundDep ?? [];
        case 'arr':
        case 'groundArr':
            return aircraft.value?.groundArr ?? [];
        case 'prefiles':
            return aircraft.value?.prefiles ?? [];
    }

    return [];
});

function getLocalPilotStatus(pilot: AirportPopupPilotStatus): ReturnType<typeof getPilotStatus> {
    if (aircraftMode.value !== 'ground') {
        if (pilot.isArrival) {
            return getPilotStatus((pilot.distance !== 0 && pilot.distance < 40) ? 'arriving' : pilot.flown < 5 ? 'depTaxi' : 'enroute');
        }
        else {
            return getPilotStatus((pilot.distance !== 0 && pilot.flown < 40) ? 'departed' : 'enroute');
        }
    }

    switch (aircraftGroundMode.value) {
        case 'depArr':
            return pilot.isArrival ? getPilotStatus('arrTaxi') : getPilotStatus('depTaxi');
        case 'dep':
            return getPilotStatus('depTaxi');
        case 'arr':
            return getPilotStatus('arrTaxi');
        case 'prefiles':
            return {
                color: 'lightgray150',
                title: 'Prefile',
            };
    }
}

const stats = ref<{
    cid: number;
    stats: number;
}[]>([]);

const observer = new IntersectionObserver(async entries => {
    if (!showPilotStats.value) return;

    for (const entry of entries.filter(x => x.isIntersecting && !x.target.classList.contains('--has-stats'))) {
        const cid = +((entry.target as HTMLDivElement).dataset.cid ?? '0');

        stats.value.push({
            cid,
            stats: await getVATSIMMemberStats(cid, 'pilot'),
        });
    }
});

onBeforeUnmount(() => {
    observer.disconnect();
});

onMounted(() => {
    if (!displayedAircraft.value.length && !props.simpleMode) {
        aircraftMode.value = 'arriving';
        if (!displayedAircraft.value.length) aircraftMode.value = 'departed';
    }

    for (const ref of pilotsRefs.value) {
        observer.observe(ref);
    }
});

watch(showPilotStats, val => {
    if (!val) {
        stats.value = [];
    }
    else {
        for (const ref of pilotsRefs.value) {
            observer.unobserve(ref);
        }

        for (const ref of pilotsRefs.value) {
            observer.observe(ref);
        }
    }
});

onUpdated(() => {
    for (const ref of pilotsRefs.value) {
        observer.observe(ref);
    }
});

defineExpose({
    aircraft,
});
</script>

<style scoped lang="scss">
.aircraft {
    position: relative;

    display: grid;
    grid-template-columns: 40px calc(100% - 40px - 8px);
    align-items: flex-start;
    justify-content: space-between;

    &:not(:first-child) {
        margin-top: 16px;
    }

    &_nav {
        position: sticky;
        top: v-bind(navOffset);

        display: flex;
        flex-direction: column;
        gap: 8px;

        &_item {
            cursor: pointer;

            display: flex;
            align-items: center;
            justify-content: center;

            width: 40px;
            height: 40px;

            background: $darkgray900;
            border-radius: 8px;

            transition: 0.3s;

            svg {
                width: 18px;
            }

            &--active {
                cursor: default;
                color: $lightgray150Orig;
                background: $primary500;
            }
        }
    }

    &_list {
        --block-title-background: #{$darkgray950};
        display: flex;
        flex-direction: column;
        gap: 8px;

        padding: 8px;

        background: $darkgray950;
        border-radius: 8px;

        &__filter {
            cursor: pointer;

            position: relative;

            padding: 0 8px;

            color: $primary500;

            background: $darkgray950;

            svg {
                width: 16px;
                min-width: 16px;
            }

            &--active {
                color: $success500;
            }
        }
    }

    &--simple {
        grid-template-columns: 100%;

        .aircraft_list {
            flex-direction: row;
            flex-wrap: wrap;
        }
    }

    &__pilot {
        background: $darkgray900;
        border: 2px solid transparent;
        transition: 0.3s;

        &_header {
            display: flex;
            justify-content: space-between;
            line-height: 100%;

            &_title {
                display: flex;
                gap: 8px;
                align-items: center;

                &_stats, &_frequency {
                    padding-left: 8px;
                    border-left: 1px solid varToRgba('lightgray150', 0.15)
                }
            }

            &_status {
                color: var(--color);
            }
        }

        &--selected {
            border-color: $primary600;

            .aircraft__pilot_header_title {
                color: $primary500
            }
        }
    }
}
</style>
