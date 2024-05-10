<template>
    <common-info-popup
        class="airport"
        collapsible
        v-model:collapsed="overlay.collapsed"
        model-value
        @update:modelValue="!$event ? mapStore.overlays = mapStore.overlays.filter(x => x.id !== overlay.id) : undefined"
        max-height="100%"
        :header-actions="['sticky']"
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
        <template #atcTitle="{section}">
            <div class="airport__atc-title">
                <div class="airport__atc-title_counter" v-if="!isCtafOnly">
                    {{ atc.length }}
                </div>
                <div class="airport__atc-title_text">
                    <template v-if="!isCtafOnly">
                        {{ section.title }}
                    </template>
                    <template v-else>
                        CTAF frequency
                    </template>
                </div>
            </div>
        </template>
        <template #atc>
            <common-toggle v-model="showAtis" v-if="!isCtafOnly">
                Show ATIS
            </common-toggle>
            <common-button type="link" v-else target="_blank" href="https://my.vatsim.net/learn/frequently-asked-questions/section/140">
                Learn more about CTAF trial
            </common-button>
            <common-controller-info small :controllers="atc" show-facility :show-atis="showAtis"/>
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
import type { VatsimShortenedAircraft, VatsimShortenedController, VatsimShortenedPrefile } from '~/types/data/vatsim';
import type { InfoPopupSection } from '~/components/common/CommonInfoPopup.vue';

const props = defineProps({
    overlay: {
        type: Object as PropType<StoreOverlayAirport>,
        required: true,
    },
});

const mapStore = useMapStore();
const dataStore = useDataStore();
const showAtis = ref(false);

const airport = computed(() => dataStore.vatspy.value?.data.airports.find(x => x.icao === props.overlay.data.icao));
const data = computed(() => props.overlay.data.airport);
const atc = computed((): VatsimShortenedController[] => {
    const list = sortControllersByPosition([
        ...dataStore.vatsim.data.locals.value.filter(x => x.airport.icao === props.overlay.data.icao).map(x => x.atc),
        ...dataStore.vatsim.data.firs.value.filter(x => props.overlay.data.airport?.center?.includes(x.controller.callsign)).map(x => x.controller),
    ]);

    if(!list.length && data.value?.vatInfo?.ctafFreq) {
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
    const vatAirport = dataStore.vatsim.data.airports.value.find(x => x.icao === props.overlay.data.icao);
    if (!vatAirport) return null;

    const list = {
        groundDep: [] as VatsimShortenedAircraft[],
        groundArr: [] as VatsimShortenedAircraft[],
        prefiles: [] as VatsimShortenedPrefile[],
        departures: [] as VatsimShortenedAircraft[],
        arrivals: [] as VatsimShortenedAircraft[],
    } satisfies Record<keyof MapAirport['aircrafts'], Array<VatsimShortenedAircraft | VatsimShortenedPrefile>>;

    for (const pilot of dataStore.vatsim.data.pilots.value) {
        if (vatAirport.aircrafts.departures?.includes(pilot.cid)) list.departures.push(pilot);
        if (vatAirport.aircrafts.arrivals?.includes(pilot.cid)) list.arrivals.push(pilot);
        if (vatAirport.aircrafts.groundDep?.includes(pilot.cid)) list.groundDep.push(pilot);
        if (vatAirport.aircrafts.groundArr?.includes(pilot.cid)) list.groundArr.push(pilot);
    }

    for (const pilot of dataStore.vatsim.data.prefiles.value) {
        if (vatAirport.aircrafts.prefiles?.includes(pilot.cid)) list.prefiles.push(pilot);
    }

    return list;
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

    if (atc.value.length) {
        list.push({
            title: 'Aircrafts',
            collapsible: true,
            key: 'aircrafts',
        });
    }

    return list;
});
</script>

<style scoped lang="scss">
.airport {
    :deep(.info-popup__section--type-atc) {
        .info-popup__section_separator_title {
            background: transparent;
        }
    }

    &__atc-title {
        display: flex;
        align-items: center;
        gap: 16px;

        &_text {
            background: $neutral1000;
            padding: 0 4px;
        }

        &_counter {
            background: $primary500;
            border-radius: 4px;
            padding: 0 4px;
            min-width: 24px;
            font-size: 11px;
            font-weight: 600;
            text-align: center;
        }
    }
}
</style>
