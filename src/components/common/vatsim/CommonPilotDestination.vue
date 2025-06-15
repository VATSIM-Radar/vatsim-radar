<template>
    <div
        v-if="pilot.departure && pilot.arrival"
        class="destination_wrap"
    >
        <div class="destination">
            <common-info-block
                :bottom-items="short ? [] : [depAirport?.name]"
                class="destination_card"
                :is-button="!!depAirport"
                text-align="center"
                :top-items="[props.pilot.departure]"
                @click="mapStore.addAirportOverlay(depAirport?.icao ?? '')"
            >
                <template
                    v-if="!short"
                    #bottom="{ item }"
                >
                    <span :title="String(item)">
                        {{ item }}
                    </span>
                </template>
            </common-info-block>
            <div
                class="destination_aircraft-icon"
            >
                <aircraft-icon/>
            </div>
            <div
                v-if="pilot.diverted"
                class="diverted_icon"
            >
                <diverted-icon/>
            </div>
            <common-info-block
                v-if="!pilot.diverted"
                :bottom-items="short ? [] : [arrAirport?.name]"
                class='destination_card'
                :is-button="!!arrAirport"
                text-align="center"
                :top-items="[props.pilot.arrival]"
                @click="mapStore.addAirportOverlay(arrAirport?.icao ?? '')"
            >
                <template
                    v-if="!short"
                    #bottom="{ item }"
                >
                    <span :title="String(item)">
                        {{ item }}
                    </span>
                </template>
            </common-info-block>
            <common-info-block
                v-if="pilot.diverted"
                :bottom-items="short ? [] : [divOrgAirport?.name]"
                class='destination_diverted'
                :is-button="!!divOrgAirport"
                text-align="center"
                :top-items="[props.pilot.diverted_origin]"
                @click="mapStore.addAirportOverlay(divOrgAirport?.icao ?? '')"
            >
                <template
                    v-if="!short"
                    #bottom="{ item }"
                >
                    <span :title="String(item)">
                        {{ item }}
                    </span>
                </template>
            </common-info-block>
        </div>
        <common-info-block
            v-if="pilot.diverted"
            :bottom-items="short ? [] : ['Diverting to ' + divArrAirport?.name]"
            class="diverted"
            :is-button="!!divArrAirport"
            text-align="center"
            :top-items="[props.pilot.diverted_arrival]"
            @click="mapStore.addAirportOverlay(divArrAirport?.icao ?? '')"
        >
            <template
                v-if="!short"
                #bottom="{ item }"
            >
                <span :title="String(item)">
                    {{ item }}
                </span>
            </template>
        </common-info-block>
    </div>
</template>

<script setup lang="ts">
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';
import type { VatsimShortenedAircraft } from '~/types/data/vatsim';
import AircraftIcon from '@/assets/icons/kit/aircraft.svg?component';
import DivertedIcon from '@/assets/icons/kit/diverted.svg?component';
import { useMapStore } from '~/store/map';

const props = defineProps({
    pilot: {
        type: Object as PropType<Partial<VatsimShortenedAircraft> & Pick<VatsimShortenedAircraft, 'arrival' | 'departure'>>,
        required: true,
    },
    short: {
        type: Boolean,
        default: false,
    },
});

const dataStore = useDataStore();
const mapStore = useMapStore();

const depAirport = computed(() => dataStore.vatspy.value?.data.keyAirports.realIcao[props.pilot.departure ?? ''] ?? null);
const arrAirport = computed(() => dataStore.vatspy.value?.data.keyAirports.realIcao[props.pilot.arrival ?? ''] ?? null);
const divArrAirport = computed(() => dataStore.vatspy.value?.data.keyAirports.realIcao[props.pilot.diverted_arrival ?? ''] ?? null);
const divOrgAirport = computed(() => dataStore.vatspy.value?.data.keyAirports.realIcao[props.pilot.diverted_origin ?? ''] ?? null);
</script>

<style scoped lang="scss">
.destination {
    position: relative;
    display: flex;
    gap: 4px;
    justify-content: center;

    > * {
        flex: 1 1 0;
        width: 0;
    }

    &_aircraft-icon {
        position: absolute;
        z-index: 1;
        top: 8px;

        display: flex;
        flex: none;
        gap: 8px;
        align-items: center;
        justify-content: center;

        width: auto;
        padding: 0 4px;

        &::before, &::after {
            content: '';

            width: 2px;
            height: 2px;
            border-radius: 100%;

            background: currentColor;
        }

        svg {
            width: 16px;
        }
    }

    &_diverted {
        color: $divertedTextColor;
    }

    &_wrap {
        display: flex;
        flex-direction: column;
        gap: 4px;
        justify-content: center;
    }

    :deep(.info-block_bottom) {
        @supports(-webkit-line-clamp: 2) {
            overflow: hidden;
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
        }
    }
}

.diverted {
    display: flex;
    justify-content: center;
    padding: 4px;
    background: $divertedBackground;

    &_icon {
        position: absolute;
        z-index: 1;
        bottom: -13px;

        display: flex;
        flex: none;
        align-items: center;
        justify-content: center;

        width: auto;
        padding: 0 4px;

        svg {
            rotate: 90deg;
            width: 30px;
            fill: currentColor;
        }
    }
}
</style>
