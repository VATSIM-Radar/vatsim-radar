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
        @close="emit('close')"
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
                    <template v-if="properties.counterType === 'groundDep'">
                        Departures
                    </template>
                    <template v-else-if="properties.counterType === 'groundArr'">
                        Arrivals
                    </template>
                    <template v-else-if="properties.counterType === 'training'">
                        Locals
                    </template>
                    <template v-else-if="properties.counterType === 'prefiles'">
                        {{ horizontalCounter === 'prefiles' ? 'Flightplan Prefiles' : 'Horizontal Counter' }}
                    </template>
                </div>
            </template>
            <div class="airport-counts_list">
                <ui-text-block
                    v-for="pilot in properties.aircraft"
                    :key="pilot.cid"
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
                        <ui-spoiler
                            v-else-if="item === pilot.name"
                            type="pilot"
                        >
                            {{ parseEncoding(pilot.name) }}
                        </ui-spoiler>
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

const horizontalCounter = useSettingValueFromFunc('map.preferences.airports.counters.horizontalCounter');
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
    }
}
</style>
