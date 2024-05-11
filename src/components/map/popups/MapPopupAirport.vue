<template>
    <common-info-popup
        class="airport"
        collapsible
        v-model:collapsed="overlay.collapsed"
        model-value
        @update:modelValue="!$event ? mapStore.overlays = mapStore.overlays.filter(x => x.id !== overlay.id) : undefined"
        max-height="100%"
        :header-actions="['counts', 'sticky']"
        :sections
        v-if="airport"
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
                    :style="{'--color': `rgb(var(--${getPilotStatus('depTaxi').color}))`}"
                >
                    <departing-icon class="airport__counts_counter_icon"/>
                    <div class="airport__counts_counter_icon_text">
                        {{ aircrafts?.departures.length ?? 0 }}
                    </div>
                </div>
                <div class="airport__counts_counter" :style="{'--color': `rgb(var(--neutral150))`}">
                    <ground-icon class="airport__counts_counter_icon"/>
                    <div class="airport__counts_counter_icon_text">
                        {{ (aircrafts?.groundArr.length ?? 0) + (aircrafts?.groundDep.length ?? 0) }}
                    </div>
                </div>
                <div
                    class="airport__counts_counter"
                    :style="{'--color': `rgb(var(--${getPilotStatus('arrTaxi').color}))`}"
                >
                    <arriving-icon class="airport__counts_counter_icon"/>
                    <div class="airport__counts_counter_icon_text">
                        {{ (aircrafts?.arrivals.length ?? 0) }}
                    </div>
                </div>
            </div>
        </template>
        <template #atcTitle="{section}">
            <div class="airport__section-title">
                <div class="airport__section-title_counter" v-if="!isCtafOnly">
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
        <template #aircraftsTitle>
            <div class="airport__section-title">
                <div class="airport__section-title_counter">
                    {{ displayedAircrafts.length }}
                </div>
                <div class="airport__section-title_text">
                    Aircrafts
                </div>
            </div>
        </template>
        <template #atc>
            <common-toggle v-model="showAtis" v-if="!isCtafOnly">
                Show ATIS
            </common-toggle>
            <common-button
                type="link" v-else target="_blank"
                href="https://my.vatsim.net/learn/frequently-asked-questions/section/140"
            >
                Learn more about CTAF trial
            </common-button>
            <common-controller-info small :controllers="atc" show-facility :show-atis="showAtis" max-height="170px"/>
        </template>
        <template #aircrafts>
            <common-radio-group
                class="airport__ground-toggles"
                :class="{'airport__ground-toggles--hidden': aircraftsMode !== 'ground'}"
                v-model="aircraftsGroundMode"
                :items="aircraftsGroundSelects"
                two-cols
            />

            <div class="airport__aircrafts">
                <div class="airport__aircrafts_nav">
                    <div
                        class="airport__aircrafts_nav_item"
                        :class="{'airport__aircrafts_nav_item--active': aircraftsMode === 'departed'}"
                        @click="aircraftsMode = 'departed'"
                    >
                        <departing-icon/>
                    </div>
                    <div
                        class="airport__aircrafts_nav_item"
                        :class="{'airport__aircrafts_nav_item--active': aircraftsMode === 'ground'}"
                        @click="aircraftsMode = 'ground'"
                    >
                        <ground-icon/>
                    </div>
                    <div
                        class="airport__aircrafts_nav_item"
                        :class="{'airport__aircrafts_nav_item--active': aircraftsMode === 'arriving'}"
                        @click="aircraftsMode = 'arriving'"
                    >
                        <arriving-icon/>
                    </div>
                </div>
                <div class="airport__aircrafts_list" :key="aircraftsMode">
                    <common-info-block
                        class="airport__aircraft" v-for="aircraft in displayedAircrafts" :key="aircraft.cid"
                        :bottom-items="[
                            aircraft.departure,
                            aircraft.aircraft_faa
                        ]"
                        is-button
                        @click="(aircraftsMode === 'ground' && aircraftsGroundMode === 'prefiles') ? mapStore.addPrefileOverlay(aircraft.cid.toString()) : mapStore.addPilotOverlay(aircraft.cid.toString())"
                    >
                        <template #top>
                            <div class="airport__aircraft_header">
                                <div class="airport__aircraft_header_title">
                                    {{ aircraft.callsign }}
                                </div>
                                <div
                                    class="airport__aircraft_header_status"
                                    :style="{'--color': `rgb(var(--${getLocalPilotStatus(aircraft).color}))`}"
                                >
                                    {{ getLocalPilotStatus(aircraft).title }}
                                </div>
                            </div>
                        </template>
                        <template #bottom="{item, index}">
                            <template v-if="index === 0">
                                <template v-if="!aircraft.isArrival">
                                    to
                                </template>
                                <template v-else>
                                    from
                                </template>

                                <strong>
                                    <template v-if="!aircraft.isArrival">
                                        {{ aircraft.arrival }}
                                    </template>
                                    <template v-else>
                                        {{ aircraft.departure ?? airport.icao }}
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
import type { InfoPopupSection } from '~/components/common/CommonInfoPopup.vue';
import type { VatsimAirportData } from '~/server/routes/data/vatsim/airport/[icao]';
import type { RadioItemGroup } from '~/components/common/CommonRadioGroup.vue';
import DepartingIcon from '@/assets/icons/airport/departing.svg?component';
import GroundIcon from '@/assets/icons/airport/ground.svg?component';
import ArrivingIcon from '@/assets/icons/airport/landing.svg?component';
import { getPilotStatus } from '../../../composables/pilots';

const props = defineProps({
    overlay: {
        type: Object as PropType<StoreOverlayAirport>,
        required: true,
    },
});

const mapStore = useMapStore();
const dataStore = useDataStore();
const showAtis = ref(false);

const aircraftsMode = ref<'departed' | 'ground' | 'arriving'>('ground');
const aircraftsGroundMode = ref<'depArr' | 'dep' | 'arr' | 'prefiles'>('depArr');

const aircraftsGroundSelects: RadioItemGroup<typeof aircraftsGroundMode['value']>[] = [
    {
        text: 'Dep. & Arr.',
        value: 'depArr',
    },
    {
        text: 'Departing',
        value: 'dep',
    },
    {
        text: 'Arriving',
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

const aircrafts = computed(() => {
    if (!vatAirport.value) return null;

    const list = {
        groundDep: [] as VatsimShortenedAircraft[],
        groundArr: [] as VatsimShortenedAircraft[],
        prefiles: [] as VatsimShortenedPrefile[],
        departures: [] as VatsimShortenedAircraft[],
        arrivals: [] as VatsimShortenedAircraft[],
    } satisfies Record<keyof MapAirport['aircrafts'], Array<VatsimShortenedAircraft | VatsimShortenedPrefile>>;

    for (const pilot of dataStore.vatsim.data.pilots.value) {
        if (vatAirport.value.aircrafts.departures?.includes(pilot.cid)) list.departures.push(pilot);
        if (vatAirport.value.aircrafts.arrivals?.includes(pilot.cid)) list.arrivals.push(pilot);
        if (vatAirport.value.aircrafts.groundDep?.includes(pilot.cid)) list.groundDep.push(pilot);
        if (vatAirport.value.aircrafts.groundArr?.includes(pilot.cid)) list.groundArr.push(pilot);
    }

    for (const pilot of dataStore.vatsim.data.prefiles.value) {
        if (vatAirport.value.aircrafts.prefiles?.includes(pilot.cid)) list.prefiles.push(pilot);
    }

    return list;
});

type LocalArrivalStatus = (VatsimShortenedAircraft | VatsimShortenedPrefile) & { isArrival: boolean }

function getLocalPilotStatus(pilot: LocalArrivalStatus): ReturnType<typeof getPilotStatus> {
    if (aircraftsMode.value !== 'ground') return getPilotStatus('enroute');

    switch (aircraftsGroundMode.value) {
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

const displayedAircrafts = computed((): LocalArrivalStatus[] => {
    if (aircraftsMode.value === 'departed') {
        return aircrafts.value?.departures.map(x => ({
            ...x,
            isArrival: false,
        })) ?? [];
    }
    if (aircraftsMode.value === 'arriving') {
        return aircrafts.value?.arrivals.map(x => ({
            ...x,
            isArrival: true,
        })) ?? [];
    }

    switch (aircraftsGroundMode.value) {
        case 'depArr':
            return [
                ...aircrafts.value?.groundDep.map(x => ({
                    ...x,
                    isArrival: false,
                })) ?? [],
                ...aircrafts.value?.groundArr.map(x => ({
                    ...x,
                    isArrival: true,
                })) ?? [],
            ];
        case 'dep':
            return aircrafts.value?.groundDep.map(x => ({
                ...x,
                isArrival: true,
            })) ?? [];
        case 'arr':
            return aircrafts.value?.groundArr.map(x => ({
                ...x,
                isArrival: false,
            })) ?? [];
        case 'prefiles':
            return aircrafts.value?.prefiles.map(x => ({
                ...x,
                isArrival: false,
            })) ?? [];
    }

    return [];
});

const sections = computed<InfoPopupSection[]>(() => {
    const list: InfoPopupSection[] = [];

    if (atc.value.length) {
        list.push({
            title: 'Active Controllers',
            collapsible: true,
            key: 'atc',
        });
    }

    if (aircrafts.value && Object.values(aircrafts.value).some(x => x.length)) {
        list.push({
            title: 'Aircrafts',
            collapsible: true,
            key: 'aircrafts',
        });
    }

    return list;
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
            opacity: 0.2;
            pointer-events: none;
        }
    }

    &__counts {
        display: flex;
        gap: 6px;
        align-items: center;
        font-weight: 700;
        font-size: 12px;
        line-height: 100%;
        cursor: initial;

        &_counter {
            display: flex;
            align-items: center;
            gap: 3px;
            color: var(--color);

            &_icon {
                width: 16px;
            }
        }
    }

    &__section-title {
        display: flex;
        align-items: center;
        gap: 16px;

        &_text {
            background: $neutral1000;
            padding: 0 4px;
        }

        &_counter {
            background: $primary500;
            color: $neutral150Orig;
            border-radius: 4px;
            padding: 0 4px;
            min-width: 24px;
            font-size: 11px;
            font-weight: 600;
            text-align: center;
        }
    }

    &__aircrafts {
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
                transition: 0.3s;
                width: 40px;
                height: 40px;
                display: flex;
                justify-content: center;
                align-items: center;
                background: $neutral900;
                border-radius: 8px;
                cursor: pointer;

                svg {
                    width: 18px;
                }

                &--active {
                    background: $primary500;
                    color: $neutral150Orig;
                    cursor: default;
                }
            }
        }

        &_list {
            background: $neutral950;
            padding: 8px;
            border-radius: 8px;
            gap: 8px;
            display: flex;
            flex-direction: column;
            max-height: 200px;
            overflow: auto;
        }
    }

    & &__aircraft {
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
