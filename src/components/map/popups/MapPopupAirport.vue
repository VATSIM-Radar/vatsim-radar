<template>
    <common-info-popup
        class="airport"
        collapsible
        v-model:collapsed="overlay.collapsed"
        model-value
        @update:modelValue="!$event ? mapStore.overlays = mapStore.overlays.filter(x => x.id !== overlay.id) : undefined"
        max-height="100%"
        :header-actions="(store.config.airport === props.overlay.data.icao && overlay.sticky) ? ['counts'] : ['counts', 'sticky']"
        :tabs
        v-if="airport"
        :disabled="store.config.airport === props.overlay.data.icao"
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
        <template #metar v-if="data?.metar && metar">
            <div class="airport__sections">
                <common-copy-info-block :text="data?.metar"/>
                <!-- TODO: refactor those duplicates -->
                <div class="airport__info-section" v-if="metar.hour">
                    <div class="airport__info-section_title">
                        Issued
                    </div>
                    <common-info-block class="airport__info-section_content">
                        <template #top>
                            {{ `0${ metar.hour }`.slice(-2) }}:{{ `0${ metar.minute }`.slice(-2) }}Z
                        </template>
                    </common-info-block>
                </div>
                <div class="airport__info-section" v-if="metar.wind">
                    <div class="airport__info-section_title">
                        Wind
                    </div>
                    <common-info-block class="airport__info-section_content">
                        <template #top>
                            {{ metar.wind.degrees }}° at {{ metar.wind.speed }} MPS
                        </template>
                    </common-info-block>
                </div>
                <div class="airport__info-section" v-if="metar.temperature">
                    <div class="airport__info-section_title">
                        Temp
                    </div>
                    <common-info-block class="airport__info-section_content">
                        <template #top>
                            {{ metar.temperature }}° C / Dew Point {{ metar.dewPoint }}° C
                        </template>
                    </common-info-block>
                </div>
                <div class="airport__info-section" v-if="metar.altimeter">
                    <div class="airport__info-section_title">
                        QNH
                    </div>
                    <common-info-block class="airport__info-section_content">
                        <template #top>
                            {{ metar.altimeter.value }} {{
                                metar.altimeter.unit === AltimeterUnit.HPa ? 'hPa' : 'inHG'
                            }}
                        </template>
                    </common-info-block>
                </div>
                <div class="airport__info-section" v-if="metar.visibility">
                    <div class="airport__info-section_title">
                        Visibility
                    </div>
                    <common-info-block class="airport__info-section_content">
                        <template #top>
                            <template v-if="metar.visibility.indicator">
                                <template v-if="metar.visibility.indicator === ValueIndicator.GreaterThan">
                                    Min
                                </template>
                                <template v-else>
                                    Max
                                </template>
                            </template>
                            {{ metar.visibility.value }} {{ metar.visibility.unit }}
                        </template>
                    </common-info-block>
                </div>
            </div>
        </template>
        <template #taf v-if="data?.taf && taf">
            <div class="airport__sections">
                <common-copy-info-block :text="data?.taf"/>
                <div class="airport__sections" v-for="(tafMetar, index) in taf.forecast" :key="index">
                    <div class="airport__sections_title">
                        Entry #{{ index + 1 }}
                        <template v-if="tafMetar.type">
                            ({{ tafMetar.type }})
                        </template>
                    </div>
                    <common-copy-info-block :text="tafMetar.raw"/>
                    <div class="airport__info-section" v-if="tafMetar.start">
                        <div class="airport__info-section_title">
                            Valid
                        </div>
                        <common-info-block class="airport__info-section_content">
                            <template #top>
                                {{
                                    `0${ tafMetar.start.getUTCHours() }`.slice(-2)
                                }}:{{ `0${ tafMetar.start.getUTCHours() }`.slice(-2) }}Z to {{
                                    `0${ tafMetar.end.getUTCHours() }`.slice(-2)
                                }}:{{ `0${ tafMetar.end.getUTCHours() }`.slice(-2) }}Z
                            </template>
                        </common-info-block>
                    </div>
                    <div class="airport__info-section" v-if="tafMetar.wind">
                        <div class="airport__info-section_title">
                            Wind
                        </div>
                        <common-info-block class="airport__info-section_content">
                            <template #top>
                                {{ tafMetar.wind.degrees }}° at {{ tafMetar.wind.speed }} MPS
                            </template>
                        </common-info-block>
                    </div>
                    <div class="airport__info-section" v-if="tafMetar.visibility">
                        <div class="airport__info-section_title">
                            Visibility
                        </div>
                        <common-info-block class="airport__info-section_content">
                            <template #top>
                                <template v-if="tafMetar.visibility.indicator">
                                    <template v-if="tafMetar.visibility.indicator === ValueIndicator.GreaterThan">
                                        Min
                                    </template>
                                    <template v-else>
                                        Max
                                    </template>
                                </template>
                                {{ tafMetar.visibility.value }} {{ tafMetar.visibility.unit }}
                            </template>
                        </common-info-block>
                    </div>
                </div>
            </div>
        </template>
        <template #notams v-if="notams?.length">
            <div class="airport__sections airport__sections--notams">
                <common-copy-info-block :text="notams.map(x => x.content).join('\n\n')"/>
                <div v-for="(notam, index) in notams" :key="index">
                    <span class="airport__notam-date" v-if="notam.startDate || notam.endDate">
                        <template v-if="notam.startDate">
                            From <strong>{{ formatDateDime.format(notam.startDate) }}Z</strong>
                        </template>
                        <template v-if="notam.endDate">
                            To <strong>{{ formatDateDime.format(notam.endDate) }}Z</strong>
                        </template>
                    </span>
                    <common-copy-info-block :text="notam.content">
                        {{ notam.title }}<br><br>
                    </common-copy-info-block>
                </div>

            </div>
        </template>
        <template #airport v-if="airportInfo">
            <div class="airport__sections">
                <div class="airport__info-section">
                    <div class="airport__info-section_title">
                        Name
                    </div>
                    <common-info-block
                        class="airport__info-section_content"
                        :top-items="[airportInfo.icao, airportInfo.iata]"
                        :bottom-items="[airportInfo.name]"
                    />
                </div>
                <div class="airport__info-section" v-if="airportInfo.altitude_m">
                    <div class="airport__info-section_title">
                        Elevation
                    </div>
                    <common-info-block
                        class="airport__info-section_content" :top-items="[
                            `${airportInfo.altitude_m} meters`,
                            `${airportInfo.altitude_ft} feet`,
                        ]"
                    />
                </div>
                <div class="airport__info-section" v-if="airportInfo.transition_alt">
                    <div class="airport__info-section_title">
                        Transition
                    </div>
                    <common-info-block
                        class="airport__info-section_content" :top-items="[airportInfo.transition_level?.toString()]"
                        :bottom-items="[
                            airportInfo.transition_level_by_atc ? `Otherwise ${airportInfo.transition_alt }` : ''
                        ]"
                    />
                </div>
                <div class="airport__info-section">
                    <div class="airport__info-section_title">
                        Location
                    </div>
                    <common-info-block
                        class="airport__info-section_content"
                        :top-items="[airportInfo.country, airportInfo.city]"
                        :bottom-items="[`Division ${airportInfo.division_id}`]"
                    />
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
            <div class="airport__aircrafts-toggles">
                <common-toggle v-model="props.overlay.data.showTracks">
                    Show tracks for arriving
                </common-toggle>
            </div>
            <div class="airport__aircrafts">
                <div class="airport__aircrafts_nav">
                    <div
                        class="airport__aircrafts_nav_item"
                        :class="{'airport__aircrafts_nav_item--active': aircraftsMode === 'ground'}"
                        @click="aircraftsMode = 'ground'"
                    >
                        <ground-icon/>
                    </div>
                    <div
                        class="airport__aircrafts_nav_item"
                        :class="{'airport__aircrafts_nav_item--active': aircraftsMode === 'departed'}"
                        @click="aircraftsMode = 'departed'"
                    >
                        <departing-icon/>
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
                    <div class="airport__aircrafts_list_title pilot-header">
                        <div class="pilot-header_title">
                            <template v-if="aircraftsMode === 'ground'">
                                On Ground
                            </template>
                            <template v-else-if="aircraftsMode === 'departed'">
                                Departed
                            </template>
                            <template v-else-if="aircraftsMode === 'arriving'">
                                Arriving
                            </template>
                        </div>
                    </div>
                    <div class="airport__aircrafts_list_filter" v-if="aircraftsMode === 'ground'">
                        <common-radio-group
                            class="airport__ground-toggles"
                            v-model="aircraftsGroundMode"
                            :items="aircraftsGroundSelects"
                            two-cols
                        />
                    </div>
                    <common-info-block
                        class="airport__aircraft" v-for="aircraft in displayedAircrafts" :key="aircraft.cid"
                        :bottom-items="[
                            aircraft.departure,
                            aircraft.aircraft_faa ?? 'No flight plan',
                            (aircraft.distance && (aircraftsMode !== 'ground' || !aircraft.isArrival)) ? `${Math.round(aircraft.distance)}NM ${aircraftsMode !== 'ground' ? 'remains' : ''}` : '',
                            (aircraft.eta && aircraftsMode !== 'ground') ? `ETA ${datetime.format(aircraft.eta)}Z` : '',
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
                            <template v-if="index === 0 && aircraft.departure">
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
import type { InfoPopupContent } from '~/components/common/CommonInfoPopup.vue';
import type { VatsimAirportData } from '~/server/routes/data/vatsim/airport/[icao]';
import type { RadioItemGroup } from '~/components/common/CommonRadioGroup.vue';
import DepartingIcon from '@/assets/icons/airport/departing.svg?component';
import GroundIcon from '@/assets/icons/airport/ground.svg?component';
import ArrivingIcon from '@/assets/icons/airport/landing.svg?component';
import { getPilotStatus } from '../../../composables/pilots';
import { AltimeterUnit, parseMetar, parseTAFAsForecast, ValueIndicator } from 'metar-taf-parser';
import { useStore } from '~/store';
import { calculateArrivalTime, calculateDistanceInNauticalMiles } from '~/utils/shared/flight';
import { toLonLat } from 'ol/proj';

const props = defineProps({
    overlay: {
        type: Object as PropType<StoreOverlayAirport>,
        required: true,
    },
});

const store = useStore();
const mapStore = useMapStore();
const dataStore = useDataStore();
const showAtis = ref(false);

const datetime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
});

const aircraftsMode = ref<'departed' | 'ground' | 'arriving'>('ground');
const aircraftsGroundMode = ref<'depArr' | 'dep' | 'arr' | 'prefiles'>('depArr');

const formatDateDime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    year: '2-digit',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
});

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

const aircrafts = computed(() => {
    if (!vatAirport.value) return null;

    const list = {
        groundDep: [] as LocalArrivalStatus[],
        groundArr: [] as LocalArrivalStatus[],
        prefiles: [] as LocalArrivalStatus[],
        departures: [] as LocalArrivalStatus[],
        arrivals: [] as LocalArrivalStatus[],
    } satisfies Record<keyof MapAirport['aircrafts'], Array<LocalArrivalStatus>>;

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
            if(pilot.groundspeed) {
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

        if (vatAirport.value.aircrafts.departures?.includes(pilot.cid)) {
            list.departures.push({ ...truePilot, isArrival: false });
        }
        if (vatAirport.value.aircrafts.arrivals?.includes(pilot.cid)) {
            list.arrivals.push(truePilot);
        }
        if (vatAirport.value.aircrafts.groundDep?.includes(pilot.cid)) {
            list.groundDep.push({ ...truePilot, isArrival: false });
        }
        if (vatAirport.value.aircrafts.groundArr?.includes(pilot.cid)) list.groundArr.push(truePilot);
    }

    for (const pilot of dataStore.vatsim.data.prefiles.value) {
        if (vatAirport.value.aircrafts.prefiles?.includes(pilot.cid)) {
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
    isArrival: boolean,
    distance: number,
    flown: number,
    eta: Date | null
}

function getLocalPilotStatus(pilot: LocalArrivalStatus): ReturnType<typeof getPilotStatus> {
    if (aircraftsMode.value !== 'ground') {
        if (pilot.isArrival) {
            return getPilotStatus((pilot.distance !== 0 && pilot.distance < 40) ? 'arriving' : 'enroute');
        }
        else {
            return getPilotStatus((pilot.distance !== 0 && pilot.flown < 40) ? 'departed' : 'enroute');
        }
    }

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
        return aircrafts.value?.departures.slice().sort((a,b) => a.flown - b.flown) ?? [];
    }
    if (aircraftsMode.value === 'arriving') {
        return aircrafts.value?.arrivals.slice().sort((a,b) => a.distance - b.distance) ?? [];
    }

    switch (aircraftsGroundMode.value) {
        case 'depArr':
            return [
                ...aircrafts.value?.groundDep ?? [],
                ...aircrafts.value?.groundArr ?? [],
            ];
        case 'dep':
            return aircrafts.value?.groundDep ?? [];
        case 'arr':
            return aircrafts.value?.groundArr ?? [];
        case 'prefiles':
            return aircrafts.value?.prefiles ?? [];
    }

    return [];
});

const metar = computed(() => {
    if (!data.value?.metar) return;
    return parseMetar(data.value.metar, {
        issued: new Date(),
    });
});

const taf = computed(() => {
    if (!data.value?.taf) return;
    return parseTAFAsForecast(data.value.taf, {
        issued: new Date(),
    });
});

const tabs = computed<InfoPopupContent>(() => {
    const list: InfoPopupContent = {
        atc: {
            title: 'ATC & Aircrafts',
            sections: [],
        },
        info: {
            title: 'Airport info',
            sections: [],
        },
    };

    if (airportInfo.value) {
        list.info.sections.push({
            title: 'Vatsim Airport Info',
            collapsible: true,
            key: 'airport',
        });
    }

    if (metar.value) {
        list.info.sections.push({
            title: 'METAR',
            collapsible: true,
            collapsedDefault: !!airportInfo.value,
            collapsedDefaultOnce: true,
            key: 'metar',
        });
    }

    if (taf.value) {
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

    if (aircrafts.value && Object.values(aircrafts.value).some(x => x.length)) {
        list.atc.sections.push({
            title: 'Aircrafts',
            collapsible: true,
            key: 'aircrafts',
        });
    }

    if(!list.info.sections.length) delete list.info;

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
    if (!displayedAircrafts.value.length) {
        aircraftsMode.value = 'arriving';
        if (!displayedAircrafts.value.length) aircraftsMode.value = 'departed';
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
            opacity: 0.2;
            pointer-events: none;
        }
    }

    &__notam-date {
        font-size: 12px;
        line-height: 100%;
        margin-bottom: 4px;
        display: block;
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

    &__sections {
        display: flex;
        flex-direction: column;
        gap: 8px;

        &--notams {
            max-height: 230px;
            overflow: auto;

            > *:not(:first-child) {
                border-top: 1px solid varToRgba('neutral150', 0.15);
                padding-top: 8px;
            }
        }

        &_title {
            font-size: 13px;
            font-weight: 600;
            border-top: 1px solid varToRgba('neutral150', 0.15);
            padding-top: 8px;
        }
    }

    &__info-section {
        display: grid;
        grid-template-columns: 20% 75%;
        justify-content: space-between;
        align-items: center;

        &_title {
            font-weight: 600;
            font-size: 13px;
        }
    }
}
</style>
