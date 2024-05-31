<template>
    <div
        v-if="airport"
        class="aircraft"
    >
        <div class="aircraft_nav">
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
                    <div class="aircraft_list__filter">
                        <filter-icon/>
                    </div>
                </template>
            </common-block-title>
            <div
                v-if="aircraftMode === 'ground'"
                class="aircraft_list_filter"
            >
                <common-radio-group
                    v-model="aircraftGroundMode"
                    class="airport__ground-toggles"
                    :items="aircraftGroundSelects"
                    two-cols
                />
            </div>
            <common-info-block
                v-for="pilot in displayedAircraft"
                :key="pilot.cid"
                :bottom-items="[
                    pilot.departure,
                    pilot.aircraft_faa ?? 'No flight plan',
                    (pilot.distance && (aircraftMode !== 'ground' || !pilot.isArrival)) ? `${ Math.round(pilot.distance) }NM ${ aircraftMode !== 'ground' ? 'remains' : '' }` : '',
                    (pilot.eta && aircraftMode !== 'ground') ? `ETA ${ datetime.format(pilot.eta) }Z` : '',
                ]"
                class="aircraft__pilot"
                is-button
                @click="(aircraftMode === 'ground' && aircraftGroundMode === 'prefiles') ? mapStore.addPrefileOverlay(pilot.cid.toString()) : mapStore.addPilotOverlay(pilot.cid.toString())"
            >
                <template #top>
                    <div class="aircraft__pilot_header">
                        <div class="aircraft__pilot_header_title">
                            {{ pilot.callsign }}
                        </div>
                        <div
                            class="aircraft__pilot_header_status"
                            :style="{ '--color': `rgb(var(--${ getLocalPilotStatus(pilot).color }))` }"
                        >
                            {{ getLocalPilotStatus(pilot).title }}
                        </div>
                    </div>
                </template>
                <template #bottom="{ item, index }">
                    <template v-if="index === 0 && pilot.departure">
                        <template v-if="!pilot.isArrival">
                            to
                        </template>
                        <template v-else>
                            from
                        </template>

                        <strong>
                            <template v-if="!pilot.isArrival">
                                {{ pilot.arrival }}
                            </template>
                            <template v-else>
                                {{ pilot.departure ?? airport.icao }}
                            </template>
                        </strong>
                    </template>
                    <template v-else>
                        {{ item }}
                    </template>
                </template>
            </common-info-block>
        </div>
    </div>
</template>

<script setup lang="ts">
import CommonRadioGroup from '~/components/common/basic/CommonRadioGroup.vue';
import type { RadioItemGroup } from '~/components/common/basic/CommonRadioGroup.vue';
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';
import DepartingIcon from '@/assets/icons/airport/departing.svg?component';
import GroundIcon from '@/assets/icons/airport/ground.svg?component';
import ArrivingIcon from '@/assets/icons/airport/landing.svg?component';
import { injectAirport } from '~/composables/airport';
import { useDataStore } from '~/composables/data';
import { getPilotStatus } from '~/composables/pilots';
import { useMapStore } from '~/store/map';
import type { AirportPopupPilotList, AirportPopupPilotStatus } from '~/components/map/popups/MapPopupAirport.vue';
import type { ComputedRef } from 'vue';
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';
import CommonBubble from '~/components/common/basic/CommonBubble.vue';
import FilterIcon from '@/assets/icons/kit/filter.svg?component';

const data = injectAirport();
const dataStore = useDataStore();
const mapStore = useMapStore();

const datetime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
});

const aircraftMode = ref<'departed' | 'ground' | 'arriving'>('ground');
const aircraftGroundMode = ref<'depArr' | 'dep' | 'arr' | 'prefiles'>('depArr');
const aircraftGroundFilterOpened = ref(false);
const aircraftGroundSelects: RadioItemGroup<typeof aircraftGroundMode['value']>[] = [
    {
        text: 'Dep. & Arr.',
        value: 'depArr',
    },
    {
        text: 'Departing',
        value: 'dep',
    },
    {
        text: 'Arrived',
        value: 'arr',
    },
    {
        text: 'Prefiles',
        value: 'prefiles',
    },
];

const airport = computed(() => dataStore.vatspy.value?.data.airports.find(x => x.icao === data.value.icao));

const aircraft = inject<ComputedRef<AirportPopupPilotList>>('aircraft')!;

const displayedAircraft = computed((): AirportPopupPilotStatus[] => {
    if (aircraftMode.value === 'departed') {
        return aircraft.value?.departures.slice().sort((a, b) => a.flown - b.flown) ?? [];
    }
    if (aircraftMode.value === 'arriving') {
        return aircraft.value?.arrivals.slice().sort((a, b) => a.distance - b.distance) ?? [];
    }

    switch (aircraftGroundMode.value) {
        case 'depArr':
            return [
                ...aircraft.value?.groundDep ?? [],
                ...aircraft.value?.groundArr ?? [],
            ];
        case 'dep':
            return aircraft.value?.groundDep ?? [];
        case 'arr':
            return aircraft.value?.groundArr ?? [];
        case 'prefiles':
            return aircraft.value?.prefiles ?? [];
    }

    return [];
});

function getLocalPilotStatus(pilot: AirportPopupPilotStatus): ReturnType<typeof getPilotStatus> {
    if (aircraftMode.value !== 'ground') {
        if (pilot.isArrival) {
            return getPilotStatus((pilot.distance !== 0 && pilot.distance < 40) ? 'arriving' : 'enroute');
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
                color: 'neutral150',
                title: 'Prefile',
            };
    }
}

onMounted(() => {
    if (!displayedAircraft.value.length) {
        aircraftMode.value = 'arriving';
        if (!displayedAircraft.value.length) aircraftMode.value = 'departed';
    }
});
</script>

<style scoped lang="scss">
.aircraft {
    display: grid;
    grid-template-columns: 13% 85%;
    justify-content: space-between;

    &:not(:first-child) {
        margin-top: 16px;
    }

    &_nav {
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

            background: $neutral900;
            border-radius: 8px;

            transition: 0.3s;

            svg {
                width: 18px;
            }

            &--active {
                cursor: default;
                color: $neutral150Orig;
                background: $primary500;
            }
        }
    }

    &_list {
        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;

        max-height: 200px;
        padding: 8px;

        background: $neutral950;
        border-radius: 8px;

        &__filter {
            min-width: 16px;
            color: $primary500;
        }
    }

    &__pilot {
        background: $neutral900;

        &_header {
            display: flex;
            justify-content: space-between;

            &_status {
                color: var(--color);
            }
        }
    }
}
</style>
