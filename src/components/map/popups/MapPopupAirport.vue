<template>
    <common-info-popup
        v-if="airport"
        v-model:collapsed="overlay.collapsed"
        class="airport"
        collapsible
        :disabled="store.config.airport === props.overlay.data.icao"
        :header-actions="(store.config.airport === props.overlay.data.icao && overlay.sticky) ? ['counts'] : ['counts', 'sticky']"
        max-height="100%"
        model-value
        :tabs
        @update:modelValue="!$event ? mapStore.overlays = mapStore.overlays.filter(x => x.id !== overlay.id) : undefined"
    >
        <template #title>
            <div class="pilot-header">
                <div class="pilot-header_title">
                    {{ props.overlay.data.icao }}
                </div>
            </div>
        </template>
        <template #action-sticky>
            <map-popup-pin-icon :overlay="overlay"/>
        </template>
        <template #action-counts>
            <div class="airport__counts">
                <div
                    class="airport__counts_counter"
                    :style="{ '--color': `rgb(var(--${ getPilotStatus('depTaxi').color }))` }"
                >
                    <departing-icon class="airport__counts_counter_icon"/>
                    <div class="airport__counts_counter_icon_text">
                        {{ aircraft?.departures.length ?? 0 }}
                    </div>
                </div>
                <div
                    class="airport__counts_counter"
                    :style="{ '--color': `rgb(var(--neutral150))` }"
                >
                    <ground-icon class="airport__counts_counter_icon"/>
                    <div class="airport__counts_counter_icon_text">
                        {{ (aircraft?.groundArr.length ?? 0) + (aircraft?.groundDep.length ?? 0) }}
                    </div>
                </div>
                <div
                    class="airport__counts_counter"
                    :style="{ '--color': `rgb(var(--${ getPilotStatus('arrTaxi').color }))` }"
                >
                    <arriving-icon class="airport__counts_counter_icon"/>
                    <div class="airport__counts_counter_icon_text">
                        {{ (aircraft?.arrivals.length ?? 0) }}
                    </div>
                </div>
            </div>
        </template>
        <template #atcTitle="{ section }">
            <div class="airport__section-title">
                <div
                    v-if="!isCtafOnly"
                    class="airport__section-title_counter"
                >
                    {{ atc.length }}
                </div>
                <div class="airport__section-title_text">
                    <template v-if="!isCtafOnly">
                        {{ section.title }}
                    </template>
                    <template v-else>
                        CTAF frequency
                    </template>
                </div>
            </div>
        </template>
        <template #aircraftTitle>
            <div class="airport__section-title">
                <div class="airport__section-title_counter">
                    {{ displayedAircraft.length }}
                </div>
                <div class="airport__section-title_text">
                    Aircraft
                </div>
            </div>
        </template>
        <template
            v-if="data?.metar"
            #metar
        >
            <airport-metar/>
        </template>
        <template
            v-if="data?.taf"
            #taf
        >
            <airport-taf/>
        </template>
        <template
            v-if="notams?.length"
            #notams
        >
            <airport-notams/>
        </template>
        <template
            v-if="airportInfo"
            #airport
        >
            <views-airport-info/>
        </template>
        <template #atc>
            <common-toggle
                v-if="!isCtafOnly"
                v-model="showAtis"
            >
                Show ATIS
            </common-toggle>
            <common-button
                v-else
                href="https://my.vatsim.net/learn/frequently-asked-questions/section/140"
                target="_blank"
                type="link"
            >
                Learn more about CTAF trial
            </common-button>
            <common-controller-info
                :controllers="atc"
                max-height="170px"
                :show-atis="showAtis"
                show-facility
                small
            />
        </template>
        <template #aircraft>
            <div
                v-if="aircraft?.arrivals.length"
                class="airport__aircraft-toggles"
            >
                <common-toggle v-model="props.overlay.data.showTracks">
                    Show tracks for arriving
                </common-toggle>
            </div>
            <div class="airport__aircraft">
                <div class="airport__aircraft_nav">
                    <div
                        class="airport__aircraft_nav_item"
                        :class="{ 'airport__aircraft_nav_item--active': aircraftMode === 'ground' }"
                        @click="aircraftMode = 'ground'"
                    >
                        <ground-icon/>
                    </div>
                    <div
                        class="airport__aircraft_nav_item"
                        :class="{ 'airport__aircraft_nav_item--active': aircraftMode === 'departed' }"
                        @click="aircraftMode = 'departed'"
                    >
                        <departing-icon/>
                    </div>
                    <div
                        class="airport__aircraft_nav_item"
                        :class="{ 'airport__aircraft_nav_item--active': aircraftMode === 'arriving' }"
                        @click="aircraftMode = 'arriving'"
                    >
                        <arriving-icon/>
                    </div>
                </div>
                <div
                    :key="aircraftMode"
                    class="airport__aircraft_list"
                >
                    <div class="airport__aircraft_list_title pilot-header">
                        <div class="pilot-header_title">
                            <template v-if="aircraftMode === 'ground'">
                                On Ground
                            </template>
                            <template v-else-if="aircraftMode === 'departed'">
                                Departed
                            </template>
                            <template v-else-if="aircraftMode === 'arriving'">
                                Arriving
                            </template>
                        </div>
                    </div>
                    <div
                        v-if="aircraftMode === 'ground'"
                        class="airport__aircraft_list_filter"
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
                        class="airport__pilot"
                        is-button
                        @click="(aircraftMode === 'ground' && aircraftGroundMode === 'prefiles') ? mapStore.addPrefileOverlay(pilot.cid.toString()) : mapStore.addPilotOverlay(pilot.cid.toString())"
                    >
                        <template #top>
                            <div class="airport__pilot_header">
                                <div class="airport__pilot_header_title">
                                    {{ pilot.callsign }}
                                </div>
                                <div
                                    class="airport__pilot_header_status"
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
    </common-info-popup>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { useMapStore } from '~/store/map';
import type { StoreOverlayAirport } from '~/store/map';
import MapPopupPinIcon from '~/components/map/popups/MapPopupPinIcon.vue';
import { useDataStore } from '#imports';
import type { MapAirport } from '~/types/map';
import type {
    VatsimShortenedAircraft,
    VatsimShortenedController,
    VatsimShortenedPrefile,
} from '~/types/data/vatsim';
import type { InfoPopupContent } from '~/components/common/CommonInfoPopup.vue';
import type { VatsimAirportData } from '~/server/routes/data/vatsim/airport/[icao]';
import type { RadioItemGroup } from '~/components/common/CommonRadioGroup.vue';
import DepartingIcon from '@/assets/icons/airport/departing.svg?component';
import GroundIcon from '@/assets/icons/airport/ground.svg?component';
import ArrivingIcon from '@/assets/icons/airport/landing.svg?component';
import { getPilotStatus } from '../../../composables/pilots';
import { useStore } from '~/store';
import { calculateArrivalTime, calculateDistanceInNauticalMiles } from '~/utils/shared/flight';
import { toLonLat } from 'ol/proj';
import { provideAirport } from '~/composables/airport';
import AirportMetar from '~/components/views/airport/AirportMetar.vue';
import AirportTaf from '~/components/views/airport/AirportTaf.vue';
import AirportNotams from '~/components/views/airport/AirportNotams.vue';

const props = defineProps({
    overlay: {
        type: Object as PropType<StoreOverlayAirport>,
        required: true,
    },
});

provideAirport(computed(() => props.overlay.data));

const store = useStore();
const mapStore = useMapStore();
const dataStore = useDataStore();
const showAtis = ref(false);

const datetime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
});

const aircraftMode = ref<'departed' | 'ground' | 'arriving'>('ground');
const aircraftGroundMode = ref<'depArr' | 'dep' | 'arr' | 'prefiles'>('depArr');

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

const airport = computed(() => dataStore.vatspy.value?.data.airports.find(x => x.icao === props.overlay.data.icao));
const vatAirport = computed(() => dataStore.vatsim.data.airports.value.find(x => x.icao === props.overlay.data.icao));
const data = computed(() => props.overlay.data.airport);
const notams = computed(() => props.overlay.data.notams);
const atc = computed((): VatsimShortenedController[] => {
    const list = sortControllersByPosition([
        ...dataStore.vatsim.data.locals.value.filter(x => x.airport.icao === props.overlay.data.icao).map(x => x.atc),
        ...dataStore.vatsim.data.firs.value.filter(x => props.overlay.data.airport?.center?.includes(x.controller.callsign)).map(x => x.controller),
    ]);

    if (!list.length && data.value?.vatInfo?.ctafFreq) {
        return [
            {
                cid: Math.random(),
                callsign: '',
                facility: -1,
                text_atis: null,
                name: '',
                logon_time: '',
                rating: 0,
                visual_range: 0,
                frequency: data.value.vatInfo.ctafFreq,
            },
        ];
    }

    return list;
});

const isCtafOnly = computed(() => {
    return atc.value.length === 1 && atc.value[0].facility === -1;
});

const aircraft = computed(() => {
    if (!vatAirport.value) return null;

    const list = {
        groundDep: [] as LocalArrivalStatus[],
        groundArr: [] as LocalArrivalStatus[],
        prefiles: [] as LocalArrivalStatus[],
        departures: [] as LocalArrivalStatus[],
        arrivals: [] as LocalArrivalStatus[],
    } satisfies Record<keyof MapAirport['aircraft'], Array<LocalArrivalStatus>>;

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

        const truePilot: LocalArrivalStatus = {
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

type LocalArrivalStatus = (VatsimShortenedAircraft | VatsimShortenedPrefile) & {
    isArrival: boolean;
    distance: number;
    flown: number;
    eta: Date | null;
};

function getLocalPilotStatus(pilot: LocalArrivalStatus): ReturnType<typeof getPilotStatus> {
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

const displayedAircraft = computed((): LocalArrivalStatus[] => {
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

const tabs = computed<InfoPopupContent>(() => {
    const list: InfoPopupContent = {
        atc: {
            title: 'ATC & Aircraft',
            sections: [],
        },
        info: {
            title: 'Airport info',
            sections: [],
        },
    };

    if (airportInfo.value) {
        list.info.sections.push({
            title: 'VATSIM Airport Info',
            collapsible: true,
            key: 'airport',
        });
    }

    if (data.value?.metar) {
        list.info.sections.push({
            title: 'METAR',
            collapsible: true,
            collapsedDefault: !!airportInfo.value,
            collapsedDefaultOnce: true,
            key: 'metar',
        });
    }

    if (data.value?.taf) {
        list.info.sections.push({
            title: 'TAF',
            collapsible: true,
            collapsedDefault: true,
            collapsedDefaultOnce: true,
            key: 'taf',
        });
    }

    if (notams.value?.length) {
        list.info.sections.push({
            title: 'NOTAMS',
            collapsible: true,
            collapsedDefault: true,
            collapsedDefaultOnce: true,
            key: 'notams',
        });
    }

    if (atc.value.length) {
        list.atc.sections.push({
            title: 'Active Controllers',
            collapsible: true,
            key: 'atc',
        });
    }

    if (aircraft.value && Object.values(aircraft.value).some(x => x.length)) {
        list.atc.sections.push({
            title: 'Aircraft',
            collapsible: true,
            key: 'aircraft',
        });
    }

    if (!list.info.sections.length) delete list.info;

    return list;
});

const airportInfo = computed(() => {
    return data.value?.vatInfo;
});

watch(dataStore.vatsim.updateTimestamp, async () => {
    props.overlay.data.airport = {
        ...props.overlay.data.airport,
        ...await $fetch<VatsimAirportData>(`/data/vatsim/airport/${ props.overlay.key }?requestedDataType=2`),
    };
});

onMounted(() => {
    if (!displayedAircraft.value.length) {
        aircraftMode.value = 'arriving';
        if (!displayedAircraft.value.length) aircraftMode.value = 'departed';
    }

    const interval = setInterval(async () => {
        props.overlay.data.airport = {
            ...props.overlay.data.airport,
            ...await $fetch<VatsimAirportData>(`/data/vatsim/airport/${ props.overlay.key }?requestedDataType=1`),
        };
    }, 1000 * 60 * 5);

    onBeforeUnmount(() => {
        clearInterval(interval);
    });
});
</script>

<style scoped lang="scss">
.airport {
    :deep(.info-popup__section--type-atc) {
        .info-popup__section_separator_title {
            background: transparent;
        }
    }

    &__ground-toggles {
        transition: 0.3s ease-in-out;

        &--hidden {
            pointer-events: none;
            opacity: 0.2;
        }
    }

    &__counts {
        cursor: initial;

        display: flex;
        gap: 6px;
        align-items: center;

        font-size: 12px;
        font-weight: 700;
        line-height: 100%;

        &_counter {
            display: flex;
            gap: 3px;
            align-items: center;
            color: var(--color);

            &_icon {
                width: 16px;
            }
        }
    }

    /* TODO: this to component */
    &__section-title {
        display: flex;
        gap: 16px;
        align-items: center;

        &_text {
            padding: 0 4px;
            background: $neutral1000;
        }

        &_counter {
            min-width: 24px;
            padding: 0 4px;

            font-size: 11px;
            font-weight: 600;
            color: $neutral150Orig;
            text-align: center;

            background: $primary500;
            border-radius: 4px;
        }
    }

    &__aircraft {
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
        }
    }

    & &__pilot {
        background: $neutral900;

        &_header {
            display: flex;
            justify-content: space-between;

            &_status {
                color: var(--color);
            }
        }
    }

    &__sections {
        display: flex;
        flex-direction: column;
        gap: 8px;

        &--notams {
            overflow: auto;
            max-height: 230px;

            > *:not(:first-child) {
                padding-top: 8px;
                border-top: 1px solid varToRgba('neutral150', 0.15);
            }
        }

        &_title {
            padding-top: 8px;
            font-size: 13px;
            font-weight: 600;
            border-top: 1px solid varToRgba('neutral150', 0.15);
        }
    }

    &__info-section {
        display: grid;
        grid-template-columns: 20% 75%;
        align-items: center;
        justify-content: space-between;

        &_title {
            font-size: 13px;
            font-weight: 600;
        }
    }
}
</style>
