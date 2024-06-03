<template>
    <div
        v-if="airport"
        class="aircraft"
    >
        <common-control-block
            v-model="aircraftGroundFilterOpened"
            center-by="start"
            center-by-offset="5%"
            close-by-click-outside
            location="top"
            width="90%"
        >
            <template #title>
                Filter ground aircraft
            </template>
            <common-radio-group
                v-model="aircraftGroundMode"
                class="airport__ground-toggles"
                :items="aircraftGroundSelects"
            />
        </common-control-block>

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
                    <div
                        class="aircraft_list__filter"
                        :class="{ 'aircraft_list__filter--active': aircraftGroundFilterOpened }"
                        @click.capture.stop="aircraftGroundFilterOpened = true"
                    >
                        <filter-icon/>
                    </div>
                </template>
            </common-block-title>
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
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';
import CommonBubble from '~/components/common/basic/CommonBubble.vue';
import FilterIcon from '@/assets/icons/kit/filter.svg?component';
import CommonControlBlock from '~/components/common/blocks/CommonControlBlock.vue';
import { toLonLat } from 'ol/proj';
import { calculateArrivalTime, calculateDistanceInNauticalMiles } from '~/utils/shared/flight';
import type { VatsimShortenedAircraft, VatsimShortenedPrefile } from '~/types/data/vatsim';
import type { MapAirport } from '~/types/map';

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
        text: 'Departing & Arrived',
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
const vatAirport = computed(() => dataStore.vatsim.data.airports.value.find(x => x.icao === data.value.icao));

export type AirportPopupPilotStatus = (VatsimShortenedAircraft | VatsimShortenedPrefile) & {
    isArrival: boolean;
    distance: number;
    flown: number;
    eta: Date | null;
};

export type AirportPopupPilotList = Record<keyof MapAirport['aircraft'], Array<AirportPopupPilotStatus>>;

const aircraft = computed<AirportPopupPilotList | null>(() => {
    if (!vatAirport.value) return null;

    const list = {
        groundDep: [] as AirportPopupPilotStatus[],
        groundArr: [] as AirportPopupPilotStatus[],
        prefiles: [] as AirportPopupPilotStatus[],
        departures: [] as AirportPopupPilotStatus[],
        arrivals: [] as AirportPopupPilotStatus[],
    } satisfies AirportPopupPilotList;

    for (const pilot of dataStore.vatsim.data.pilots.value) {
        let distance = 0;
        let flown = 0;
        let eta: Date | null = null;

        const arrivalAirport = dataStore.vatspy.value?.data.airports.find(x => x.icao === pilot.arrival!);

        if (arrivalAirport) {
            const pilotCoords = toLonLat([pilot.longitude, pilot.latitude]);
            const depCoords = toLonLat([airport.value?.lon ?? 0, airport.value?.lat ?? 0]);
            const arrCoords = toLonLat([arrivalAirport.lon, arrivalAirport.lat]);

            distance = calculateDistanceInNauticalMiles(pilotCoords, arrCoords);
            flown = calculateDistanceInNauticalMiles(pilotCoords, depCoords);
            if (pilot.groundspeed) {
                eta = calculateArrivalTime(pilotCoords, arrCoords, pilot.groundspeed);
            }
        }

        const truePilot: AirportPopupPilotStatus = {
            ...pilot,
            distance,
            eta,
            flown,
            isArrival: true,
        };

        if (vatAirport.value.aircraft.departures?.includes(pilot.cid)) {
            list.departures.push({ ...truePilot, isArrival: false });
        }
        if (vatAirport.value.aircraft.arrivals?.includes(pilot.cid)) {
            list.arrivals.push(truePilot);
        }
        if (vatAirport.value.aircraft.groundDep?.includes(pilot.cid)) {
            list.groundDep.push({ ...truePilot, isArrival: false });
        }
        if (vatAirport.value.aircraft.groundArr?.includes(pilot.cid)) list.groundArr.push(truePilot);
    }

    for (const pilot of dataStore.vatsim.data.prefiles.value) {
        if (vatAirport.value.aircraft.prefiles?.includes(pilot.cid)) {
            list.prefiles.push({
                ...pilot,
                distance: 0,
                flown: 0,
                eta: null,
                isArrival: false,
            });
        }
    }

    return list;
});

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

defineExpose({
    aircraft,
});
</script>

<style scoped lang="scss">
.aircraft {
    position: relative;
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
        --block-title-background: #{$neutral950};
        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;

        max-height: 200px;
        padding: 8px;

        background: $neutral950;
        border-radius: 8px;

        &__filter {
            cursor: pointer;

            position: relative;

            padding: 0 8px;

            color: $primary500;

            background: $neutral950;

            svg {
                width: 16px;
                min-width: 16px;
            }

            &--active {
                color: $success500;
            }
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
