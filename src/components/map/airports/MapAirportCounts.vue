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
                class="airport-counts_item airport-counts_item--groundDep"
                :class="{ 'airport-counts_item--hidden': !aircraft.groundDep?.length }"
                @mouseover="$nextTick(() => aircraftHoveredType = 'groundDep')"
            >
                {{ aircraft.groundDep?.length ?? 0 }}
            </div>
            <div
                v-if="aircraft.prefiles?.length"
                class="airport-counts_item airport-counts_item--prefiles"
                @mouseover="$nextTick(() => aircraftHoveredType = 'prefiles')"
            >
                {{ aircraft.prefiles?.length ?? 0 }}
            </div>
            <div
                class="airport-counts_item airport-counts_item--groundArr"
                :class="{ 'airport-counts_item--hidden': !aircraft.groundArr?.length }"
                @mouseover="$nextTick(() => aircraftHoveredType = 'groundArr')"
            >
                {{ aircraft.groundArr?.length ?? 0 }}
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
                            pilot.aircraft_faa,
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
                            <template v-else-if="index === 2">
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
import type { MapAircraft, MapAirport } from '~/types/map';
import type { VatSpyData } from '~/types/data/vatspy';
import { useMapStore } from '~/store/map';
import MapOverlay from '~/components/map/MapOverlay.vue';
import CommonPopupBlock from '~/components/common/popup/CommonPopupBlock.vue';
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';

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

const mapStore = useMapStore();
const aircraftHoveredType = ref<keyof MapAirport['aircraft'] | null>(null);

const hoveredAircraft = computed(() => {
    switch (aircraftHoveredType.value) {
        case 'groundDep':
            return props.aircraft?.groundDep ?? [];
        case 'groundArr':
            return props.aircraft?.groundArr ?? [];
        case 'prefiles':
            return props.aircraft?.prefiles ?? [];
    }

    return [];
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
            color: $neutral200;
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
