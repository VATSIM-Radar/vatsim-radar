<template>
    <map-overlay
        v-if="!hide && (aircraft.groundDep?.length || aircraft.groundArr?.length || aircraft.prefiles?.length)"
        :popup="!!aircraftHoveredType"
        @update:popup="!$event ? aircraftHoveredType = null : undefined"
        :settings="{position: [airport.lon, airport.lat], offset, stopEvent: !!aircraftHoveredType, positioning: 'center-left'}"
        persistent
        :z-index="15"
        :active-z-index="21"
    >
        <div class="airport-counts" @mouseleave="aircraftHoveredType = null">
            <div
                class="airport-counts_item airport-counts_item--groundDep"
                :class="{'airport-counts_item--hidden': !aircraft.groundDep?.length}"
                @mouseover="$nextTick(() => aircraftHoveredType = 'groundDep')"
            >
                {{ aircraft.groundDep?.length ?? 0 }}
            </div>
            <div
                class="airport-counts_item airport-counts_item--prefiles"
                v-if="aircraft.prefiles?.length"
                @mouseover="$nextTick(() => aircraftHoveredType = 'prefiles')"
            >
                {{ aircraft.prefiles?.length ?? 0 }}
            </div>
            <div
                class="airport-counts_item airport-counts_item--groundArr"
                :class="{'airport-counts_item--hidden': !aircraft.groundArr?.length}"
                @mouseover="$nextTick(() => aircraftHoveredType = 'groundArr')"
            >
                {{ aircraft.groundArr?.length ?? 0 }}
            </div>
            <common-popup-block class="airport-counts__airplanes" v-if="hoveredAircraft.length">
                <template #title>
                    <div
                        class="airport-counts__airplanes_title"
                        :class="[`airport-counts__airplanes_title--${aircraftHoveredType}`]"
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
                        :top-items="[
                            pilot.callsign,
                            pilot.aircraft_faa,
                            (aircraftHoveredType === 'groundArr' ? pilot.departure : pilot.arrival) || null,
                            pilot.name,
                        ]"
                        v-for="pilot in hoveredAircraft"
                        :key="pilot.cid"
                        is-button
                        @click="aircraftHoveredType !== 'prefiles' ? mapStore.addPilotOverlay(pilot.cid.toString()) : mapStore.addPrefileOverlay(pilot.cid.toString())"
                    >
                        <template #top="{item, index}">
                            <div class="airport-counts__popup-callsign" v-if="index === 0">
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
                            <div class="airport-counts__popup-info" v-else>
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
    display: flex;
    flex-direction: column;
    user-select: none;
    position: relative;

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
        font-size: 11px;
        display: flex;
        align-items: center;
        gap: 4px;
        line-height: 100%;
        cursor: pointer;

        &--hidden {
            opacity: 0;
            visibility: hidden;
        }

        &::before {
            content: '';
            display: block;
            position: relative;
        }

        &--groundDep {
            &::before {
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-bottom: 6px solid currentColor;
                border-top: 6px solid transparent;
                top: -2px;
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
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-bottom: 6px solid transparent;
                border-top: 6px solid currentColor;
                top: 2px;
            }
        }
    }

    &__airplanes {
        position: absolute;
        top: 0;
        left: 100%;
        width: max-content;

        &_list {
            max-height: 360px;
            overflow: auto;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
    }
}
</style>
