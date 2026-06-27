<template>
    <map-html-overlay
        is-interaction
        model-value
        :settings="{
            //position: payload.coordinate,
            position: coordinate,
            offset: [getOffsetX, 5],
            stopEvent: true,
            positioning: 'center-left',
        }"
        :z-index="20"
        @id="$emit('id', $event)"
        @pointermove.stop
        @update:overlay="!$event && emit('close')"
    >
        <popup-map-info
            v-if="properties.aircraft?.length"
            class="airport-counts"
            open-from="center-left"
        >
            <template #title>
                <div
                    class="airport-counts_title"
                    :class="[`airport-counts_title--${ properties.counterType }`]"
                >
                    {{ properties.icao }}
                    {{title}}
                </div>
            </template>
            <div class="airport-counts_list">
                <ui-text-block
                    v-for="pilot in properties.aircraft"
                    :key="pilot.cid"
                    class="airport-counts_list_item"
                    is-button
                    :top-items="[
                        pilot.callsign,
                        pilot.aircraft_faa ?? 'No flight plan',
                        (pilot.departure !== properties.icao ? pilot.departure : pilot.arrival) || null,
                        pilot.name,
                    ]"
                    @click="properties.counterType !== 'prefiles' ? mapStore.addPilotOverlay(pilot.cid.toString()) : mapStore.addPrefileOverlay(pilot.cid.toString())"
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
                                <template v-if="pilot.departure !== properties.icao">
                                    from
                                </template>
                                <template v-else>
                                    to
                                </template>
                            </span>
                            {{ item }}
                        </template>
                        <div  v-else-if="item === pilot.name"  class="airport-counts__popup-name">
                            <ui-spoiler
                                type="pilot"
                            >
                                {{ parseEncoding(pilot.name) }}
                            </ui-spoiler>
                        </div>
                        <div
                            v-else
                            class="airport-counts__popup-info"
                        >
                            {{ item }}
                        </div>
                    </template>
                </ui-text-block>
            </div>
        </popup-map-info>
    </map-html-overlay>
</template>

<script setup lang="ts">
import type { RadarEventPayload } from '~/composables/vatsim/events';
import type { FeatureAirportCounter } from '~/utils/map/entities';
import MapHtmlOverlay from '~/components/map/MapHtmlOverlay.vue';
import PopupMapInfo from '~/components/popups/PopupMapInfo.vue';
import UiTextBlock from '~/components/ui/text/UiTextBlock.vue';
import { parseEncoding } from '~/utils/data';
import UiSpoiler from '~/components/ui/text/UiSpoiler.vue';
import { getAirportCounterPopupOffsetX } from '~/composables/render/airports/layers/airport-style';
import { getKeyedValueFromSettings } from '~/composables/settings/v2/utils';

const props = defineProps({
    payload: {
        type: Object as PropType<RadarEventPayload<FeatureAirportCounter>>,
        required: true,
    },
});

const emit = defineEmits({
    id(id: string) {
        return true;
    },
    close() {
        return true;
    },
});

const mapStore = useMapStore();
const dataStore = useDataStore();
const properties = computed(() => props.payload.feature.getProperties());
const coordinate = computed(() => {
    return getCurrentWorldCoordinate({
        coordinate: [dataStore.vatspy.value?.data.keyAirports.icao[properties.value.icao]?.lon ?? 0, dataStore.vatspy.value?.data.keyAirports.icao[properties.value.icao]?.lat ?? 0],
        eventCoordinate: props.payload.coordinate,
    });
});

const getOffsetX = computed(() => {
    return getAirportCounterPopupOffsetX({
        icao: properties.value.icao,
        localsLength: properties.value.localsLength,
        counter: properties.value.counter,
    });
});

const title = computed(() => {
    if (properties.value.counterType === 'groundDep') {
        switch (getKeyedValueFromSettings('map.preferences.airports.counters.departuresMode')) {
            case 'total':
                return 'Total Departures';
            case 'totalMoving':
                return 'Total Departures in Move';
            case 'totalLanded':
                return 'Landed Departures';
            case 'airborne':
                return 'Airborne Departrures';
            case 'ground':
                return 'Departures';
            case 'groundMoving':
                return 'Departures in Move';
            default:
                return 'Departures';
        }
    }

    if (properties.value.counterType === 'groundArr') {
        const isSync = getKeyedValueFromSettings('map.preferences.airports.counters.syncDeparturesArrivals');
        const value = isSync ? getKeyedValueFromSettings('map.preferences.airports.counters.departuresMode') : getKeyedValueFromSettings('map.preferences.airports.counters.arrivalsMode');

        switch (value) {
            case 'total':
                return 'Total Arrivals';
            case 'totalMoving':
                return 'Total Arrivals in Move';
            case 'totalLanded':
                return 'Not Parked Arrivals';
            case 'airborne':
                return 'Airborne Arrivals';
            case 'ground':
                return 'Landed';
            case 'groundMoving':
                return 'Landed in Move';
            default:
                return 'Arrivals';
        }
    }

    if (properties.value.counterType === 'prefiles') {
        switch (getKeyedValueFromSettings('map.preferences.airports.counters.horizontalCounter')) {
            case 'total':
                return 'Total Traffic';
            case 'prefiles':
                return 'Prefiles';
            case 'ground':
                return 'Ground Traffic';
            case 'groundMoving':
                return 'Ground In Move';
            default:
                return 'Prefiles';
        }
    }

    if (properties.value.counterType === 'training') {
        return 'Locals';
    }

    return 'Default';
});
</script>

<style lang="scss" scoped>
.airport-counts {
    max-width: 400px;

    .airport-counts_item, .airport-counts_title {
        &--groundDep {
            color: $green500;
        }

        &--prefiles {
            color: $lightGray600;
        }

        &--training {
            color: $purple500;
        }

        &--groundArr {
            color: $red500;
        }
    }

    &__popup-callsign {
        color: $blue500
    }

    &__popup-info {
        font-weight: 400;
    }

    &_list {
        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: 4px;

        max-height: 360px;

        &_item  {
            :deep(.info-block_top) {
                flex-wrap: nowrap;
                white-space: nowrap;

                .airport-counts__popup-name {
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
            }

            :deep(.info-block__content:last-child) {
                overflow: hidden;
            }
        }
    }
}
</style>
