<template>
    <map-overlay
        v-if="!hide && (aircraft.groundDep?.length || aircraft.groundArr?.length || aircraft.prefiles?.length)"
        :active-z-index="21"
        persistent
        :popup="!!aircraftHoveredType"
        :settings="{ position: [airport.lon, airport.lat], offset, stopEvent: !!aircraftHoveredType, positioning: 'center-left' }"
        :z-index="15"
        @update:popup="!$event ? aircraftHoveredType = null : undefined"
    >
        <div
            class="airport-counts"
            @mouseleave="aircraftHoveredType = null"
        >
            <div
                v-for="(item, key) in getAircraftCounters"
                :key
                class="airport-counts_item"
                :class="[`airport-counts_item--${ key }`, { 'airport-counts_item--hidden': !item?.length }]"
                @mouseover="$nextTick(() => aircraftHoveredType = key as any)"
            >
                {{ item?.length ?? 0 }}
            </div>
            <common-popup-block
                v-if="hoveredAircraft.length"
                class="airport-counts__airplanes"
            >
                <template #title>
                    <div
                        class="airport-counts__airplanes_title"
                        :class="[`airport-counts__airplanes_title--${ aircraftHoveredType }`]"
                    >
                        {{ airport.icao }}
                        <template v-if="aircraftHoveredType === 'groundDep'">
                            Departures
                        </template>
                        <template v-else-if="aircraftHoveredType === 'groundArr'">
                            Arrivals
                        </template>
                        <template v-else-if="aircraftHoveredType === 'training'">
                            Training (same arrival)
                        </template>
                        <template v-else-if="aircraftHoveredType === 'prefiles'">
                            Flightplan Prefiles
                        </template>
                    </div>
                </template>
                <div class="airport-counts__airplanes_list">
                    <common-info-block
                        v-for="pilot in hoveredAircraft"
                        :key="pilot.cid"
                        is-button
                        :top-items="[
                            pilot.callsign,
                            pilot.aircraft_faa ?? 'No flight plan',
                            (aircraftHoveredType === 'groundArr' ? pilot.departure : pilot.arrival) || null,
                            pilot.name,
                        ]"
                        @click="aircraftHoveredType !== 'prefiles' ? mapStore.addPilotOverlay(pilot.cid.toString()) : mapStore.addPrefileOverlay(pilot.cid.toString())"
                    >
                        <template #top="{ item, index }">
                            <div
                                v-if="index === 0"
                                class="airport-counts__popup-callsign"
                            >
                                {{ item }}
                            </div>
                            <template v-else-if="index === 2 && pilot.departure">
                                <span class="airport-counts__popup-info">
                                    <template v-if="aircraftHoveredType === 'groundArr'">
                                        from
                                    </template>
                                    <template v-else>
                                        to
                                    </template>
                                </span>
                                {{ item }}
                            </template>
                            <div
                                v-else
                                class="airport-counts__popup-info"
                            >
                                {{ item }}
                            </div>
                        </template>
                    </common-info-block>
                </div>
            </common-popup-block>
        </div>
    </map-overlay>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { MapAircraft, MapAircraftKeys } from '~/types/map';
import type { VatSpyData } from '~/types/data/vatspy';
import { useMapStore } from '~/store/map';
import MapOverlay from '~/components/map/MapOverlay.vue';
import CommonPopupBlock from '~/components/common/popup/CommonPopupBlock.vue';
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';
import type { PartialRecord } from '~/types';
import type { VatsimShortenedAircraft, VatsimShortenedPrefile } from '~/types/data/vatsim';
import { useStore } from '~/store';

const props = defineProps({
    airport: {
        type: Object as PropType<VatSpyData['airports'][0]>,
        required: true,
    },
    aircraft: {
        type: Object as PropType<MapAircraft>,
        required: true,
    },
    hide: {
        type: Boolean,
        default: false,
    },
    offset: {
        type: Array as PropType<number[]>,
        default: () => [25, 0],
    },
});

type AircraftType = MapAircraftKeys | 'training';

const store = useStore();
const mapStore = useMapStore();
const aircraftHoveredType = ref<AircraftType | null>(null);

const getAircraftCounters = computed<PartialRecord<AircraftType, VatsimShortenedPrefile[]>>(() => {
    const list: PartialRecord<AircraftType, VatsimShortenedPrefile[]> = {};

    const departuresMode = store.mapSettings.airportsCounters?.departuresMode ?? 'ground';
    const arrivalsMode = store.mapSettings.airportsCounters?.syncDeparturesArrivals ? departuresMode : store.mapSettings.airportsCounters?.arrivalsMode ?? 'ground';
    const prefilesMode = store.mapSettings.airportsCounters?.horizontalCounter ?? 'prefiles';

    let departures: VatsimShortenedAircraft[] = [];
    let arrivals: VatsimShortenedAircraft[] = [];
    let prefiles: Array<VatsimShortenedPrefile | VatsimShortenedAircraft> = [];
    let training: VatsimShortenedAircraft[] = [];

    let groundDep = props.aircraft.groundDep;

    if (!store.mapSettings.airportsCounters?.disableTraining) {
        training = props.aircraft?.groundDep?.filter(x => x.departure && x.departure === x.arrival) ?? [];
        if (groundDep) groundDep = groundDep.filter(x => !training.some(y => y.cid === x.cid));
    }

    if (departuresMode !== 'hide') {
        switch (departuresMode) {
            case 'total':
                departures = [
                    ...groundDep ?? [],
                    ...props.aircraft.departures ?? [],
                ];
                break;
            case 'totalMoving':
                departures = [
                    ...groundDep?.filter(x => x.groundspeed > 0) ?? [],
                    ...props.aircraft.departures?.filter(x => x.groundspeed > 0) ?? [],
                ];
                break;
            case 'airborne':
                departures = props.aircraft.departures?.filter(x => x.groundspeed > 0) ?? [];
                break;
            case 'airborneDeparting':
                // TODO: rework this + namings, consider if really needed
                departures = [
                    ...groundDep?.filter(x => x.groundspeed > 0) ?? [],
                    ...props.aircraft.departures?.filter(x => x.groundspeed > 0) ?? [],
                ];
                break;
            case 'ground':
                departures = groundDep ?? [];
                break;
            case 'groundMoving':
                departures = groundDep?.filter(x => x.groundspeed > 0) ?? [];
                break;
        }
    }

    if (arrivalsMode !== 'hide') {
        switch (arrivalsMode) {
            case 'total':
                arrivals = [
                    ...props.aircraft.groundArr ?? [],
                    ...props.aircraft.arrivals ?? [],
                ];
                break;
            case 'totalMoving':
                arrivals = [
                    ...props.aircraft.groundArr?.filter(x => x.groundspeed > 0) ?? [],
                    ...props.aircraft.arrivals?.filter(x => x.groundspeed > 0) ?? [],
                ];
                break;
            case 'airborne':
                arrivals = props.aircraft.arrivals?.filter(x => x.groundspeed > 0) ?? [];
                break;
            case 'airborneDeparting':
                arrivals = [
                    ...props.aircraft.groundArr?.filter(x => x.groundspeed > 0) ?? [],
                    ...props.aircraft.arrivals?.filter(x => x.groundspeed > 0) ?? [],
                ];
                break;
            case 'ground':
                arrivals = props.aircraft.groundArr ?? [];
                break;
            case 'groundMoving':
                arrivals = props.aircraft.groundArr?.filter(x => x.groundspeed > 0) ?? [];
                break;
        }
    }

    if (prefilesMode !== 'hide') {
        switch (prefilesMode) {
            case 'total':
                prefiles = [
                    ...groundDep ?? [],
                    ...props.aircraft.departures ?? [],
                    ...props.aircraft.groundArr ?? [],
                    ...props.aircraft.arrivals ?? [],
                ];
                break;
            case 'prefiles':
                prefiles = props.aircraft.prefiles ?? [];
                break;
            case 'ground':
                prefiles = [
                    ...groundDep ?? [],
                    ...props.aircraft.groundArr ?? [],
                ];
                break;
            case 'groundMoving':
                prefiles = [
                    ...groundDep?.filter(x => x.groundspeed > 0) ?? [],
                    ...props.aircraft.groundArr?.filter(x => x.groundspeed > 0) ?? [],
                ];
                break;
        }
    }

    list.groundDep = departures;
    if (training.length) list.training = training;
    if (prefiles.length) list.prefiles = prefiles;
    list.groundArr = arrivals;

    return list;
});

const hoveredAircraft = computed(() => {
    return getAircraftCounters.value[aircraftHoveredType.value ?? 'departures'] ?? [];
});
</script>

<style scoped lang="scss">
.airport-counts {
    user-select: none;
    position: relative;
    display: flex;
    flex-direction: column;

    .airport-counts_item, .airport-counts__airplanes_title {
        &--groundDep {
            color: $success500;
        }

        &--prefiles {
            color: $lightgray200;
        }

        &--training {
            color: $info500;
        }

        &--groundArr {
            color: $error500;
        }
    }

    &__popup-callsign {
        color: $primary500
    }

    &__popup-info {
        font-weight: 400;
    }

    &_item {
        cursor: pointer;

        display: flex;
        gap: 4px;
        align-items: center;

        font-size: 11px;
        line-height: 100%;

        &::before {
            content: '';
            position: relative;
            display: block;
        }

        &--hidden {
            visibility: hidden;
            opacity: 0;
        }

        &--groundDep {
            &::before {
                top: -2px;

                border-top: 6px solid transparent;
                border-right: 6px solid transparent;
                border-bottom: 6px solid currentColor;
                border-left: 6px solid transparent;
            }
        }

        &--prefiles {
            &::before {
                width: 12px;
                height: 5px;
                background: currentColor;
            }
        }

        &--training {
            &::before {
                width: 12px;
                height: 5px;
                background: currentColor;
                border-radius: 10px;
            }
        }

        &--groundArr {
            &::before {
                top: 2px;

                border-top: 6px solid currentColor;
                border-right: 6px solid transparent;
                border-bottom: 6px solid transparent;
                border-left: 6px solid transparent;
            }
        }
    }

    &__airplanes {
        position: absolute;
        top: 0;
        left: 100%;
        width: max-content;

        &_list {
            overflow: auto;
            display: flex;
            flex-direction: column;
            gap: 4px;

            max-height: 360px;
        }
    }
}
</style>
