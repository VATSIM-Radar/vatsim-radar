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
            <common-block-title :bubble="isCtafOnly ? '' : atc.length">
                <template v-if="!isCtafOnly">
                    {{ section.title }}
                </template>
                <template v-else>
                    CTAF frequency
                </template>
            </common-block-title>
        </template>
        <template #aircraftTitle>
            <common-block-title :bubble="aircraftCount">
                Aircraft
            </common-block-title>
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
            v-if="vatInfo"
            #airport
        >
            <airport-info/>
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
                v-if="vatAirport?.aircraft.arrivals?.length"
                class="airport__aircraft-toggles"
            >
                <common-toggle
                    :model-value="!!props.overlay.data.showTracks"
                    @update:modelValue="props.overlay.data.showTracks = $event"
                >
                    Show tracks for arriving
                </common-toggle>
            </div>
            <airport-aircraft/>
        </template>
    </common-info-popup>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { useMapStore } from '~/store/map';
import type { StoreOverlayAirport } from '~/store/map';
import MapPopupPinIcon from '~/components/map/popups/MapPopupPinIcon.vue';
import { useDataStore } from '#imports';
import type {
    VatsimShortenedAircraft,
    VatsimShortenedController, VatsimShortenedPrefile,
} from '~/types/data/vatsim';
import CommonInfoPopup from '~/components/common/popup/CommonInfoPopup.vue';
import type { InfoPopupContent } from '~/components/common/popup/CommonInfoPopup.vue';
import type { VatsimAirportData } from '~/server/routes/data/vatsim/airport/[icao]';
import DepartingIcon from '@/assets/icons/airport/departing.svg?component';
import GroundIcon from '@/assets/icons/airport/ground.svg?component';
import ArrivingIcon from '@/assets/icons/airport/landing.svg?component';
import { getPilotStatus } from '../../../composables/pilots';
import { useStore } from '~/store';
import { provideAirport } from '~/composables/airport';
import AirportMetar from '~/components/views/airport/AirportMetar.vue';
import AirportTaf from '~/components/views/airport/AirportTaf.vue';
import AirportNotams from '~/components/views/airport/AirportNotams.vue';
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import AirportInfo from '~/components/views/airport/AirportInfo.vue';
import CommonControllerInfo from '~/components/common/vatsim/CommonControllerInfo.vue';
import CommonBlueBubble from '~/components/common/basic/CommonBubble.vue';
import AirportAircraft from '~/components/views/airport/AirportAircraft.vue';
import type { MapAirport } from '~/types/map';
import { toLonLat } from 'ol/proj';
import { calculateArrivalTime, calculateDistanceInNauticalMiles } from '~/utils/shared/flight';
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';

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

const aircraftCount = computed(() => Object.values(vatAirport.value?.aircraft ?? {}).reduce((acc, items) => acc + items.length, 0));

export type AirportPopupPilotStatus = (VatsimShortenedAircraft | VatsimShortenedPrefile) & {
    isArrival: boolean;
    distance: number;
    flown: number;
    eta: Date | null;
};

export type AirportPopupPilotList = Record<keyof MapAirport['aircraft'], Array<AirportPopupPilotStatus>>;

const aircraft = computed(() => {
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

provide('aircraft', aircraft);

const tabs = computed<InfoPopupContent>(() => {
    const list: InfoPopupContent = {
        atc: {
            title: 'ATC & Aircraft',
            sections: [],
        },
        info: {
            title: 'Info & Weather',
            sections: [],
        },
    };

    if (vatInfo.value) {
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
            collapsedDefault: !!vatInfo.value,
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

    if (aircraftCount.value) {
        list.atc.sections.push({
            title: 'Aircraft',
            collapsible: true,
            key: 'aircraft',
        });
    }

    if (!list.info.sections.length) delete list.info;

    return list;
});

const vatInfo = computed(() => {
    return data.value?.vatInfo;
});

watch(dataStore.vatsim.updateTimestamp, async () => {
    props.overlay.data.airport = {
        ...props.overlay.data.airport,
        ...await $fetch<VatsimAirportData>(`/data/vatsim/airport/${ props.overlay.key }?requestedDataType=2`),
    };
});

onMounted(() => {
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
