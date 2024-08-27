<template>
    <div
        class="airport-card"
        :class="{ 'airport-card--no-index': typeof position !== 'number' }"
        @click="mapStore.addAirportOverlay(airport.airport.icao)"
    >
        <div
            v-if="typeof position === 'number'"
            class="airport-card_index"
        >
            {{ position }}
        </div>
        <div class="airport-card_icao">
            {{ airport.airport.icao }}
        </div>
        <common-info-block
            class="airport-card_info"
            :top-items="[ country?.country, airport.airport.name ]"
        >
            <template #top="{ item }">
                <span :title="String(item)">
                    {{ item }}
                </span>
            </template>
        </common-info-block>
        <div class="airport-card_data">
            <div class="airport-card_data_counts">
                <div class="airport-card_data_counts_counter">
                    <departing-icon class="airport-card_data_counts_counter_icon"/>
                    <div class="airport-card_data_counts_counter_text">
                        {{ (airport.aircraftList.groundDep?.length ?? 0) + (airport.aircraftList.departures?.length ?? 0) }}
                    </div>
                </div>
                <div class="airport-card_data_counts_counter">
                    <arriving-icon class="airport-card_data_counts_counter_icon"/>
                    <div class="airport-card_data_counts_counter_text">
                        {{ (airport.aircraftList.groundArr?.length ?? 0) + (airport.aircraftList.arrivals?.length ?? 0) }}
                    </div>
                </div>
            </div>
            <div class="airport-card_data_positions __section-group">
                <div
                    v-for="controller in controllers"
                    :key="controller.facility"
                    class="airport-card_data_positions_position"
                    :style="{ '--color': controller.color }"
                >
                    {{ controller.text }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';
import DepartingIcon from '@/assets/icons/airport/departing.svg?component';
import ArrivingIcon from '@/assets/icons/airport/landing.svg?component';
import { getControllerPositionColor, useFacilitiesIds } from '~/composables/atc';
import type { AirportsList } from '~/components/map/airports/MapAirportsList.vue';
import { useMapStore } from '~/store/map';

const props = defineProps({
    airport: {
        type: Object as PropType<AirportsList>,
        required: true,
    },
    position: {
        type: Number,
    },
});

// eslint-disable-next-line vue/no-setup-props-reactivity-loss
const country = getAirportCountry(props.airport.airport.icao);
const ids = useFacilitiesIds();

const mapStore = useMapStore();

interface Controller {
    facility: number;
    text: string;
    color: string;
    isATIS: boolean;
}

const controllers = computed<Controller[]>(() => {
    const list: Controller[] = [];

    for (const controller of [...props.airport.localAtc, ...props.airport!.arrAtc]) {
        if (list.some(x => controller.isATIS ? x.isATIS : x.facility === controller.facility) || controller.facility === ids.FSS || controller.facility === ids.CTR) continue;

        list.push({
            facility: controller.facility,
            color: getControllerPositionColor(controller),
            text: '',
            isATIS: controller.isATIS || controller.facility === ids.ATIS || !!controller.atis_code,
        });
    }

    for (const controller of list) {
        if (controller.isATIS) {
            if (list.length <= 2) controller.text = 'ATIS';
            else controller.text = 'A';
            continue;
        }

        switch (controller.facility) {
            case ids.TWR:
                if (list.length <= 2) controller.text = 'TWR';
                else controller.text = 'T';
                break;
            case ids.DEL:
                if (list.length <= 2) controller.text = 'DEL';
                else controller.text = 'D';
                break;
            case ids.GND:
                if (list.length <= 2) controller.text = 'GND';
                else controller.text = 'G';
                break;
            case ids.APP:
                if (list.length <= 2) controller.text = 'APP';
                else controller.text = 'A';
                break;
        }
    }

    return sortControllersByPosition(list);
});
</script>

<style scoped lang="scss">
.airport-card {
    cursor: pointer;

    display: grid;
    grid-template-columns: 40px 40px 200px 88px;
    gap: 16px;
    align-items: center;
    justify-content: space-between;

    min-height: 52px;
    padding: 8px;

    background: $darkgray900;
    border-radius: 4px;

    transition: 0.3s;

    @include hover {
        &:hover {
            background: $darkgray875;
        }
    }

    &--no-index {
        grid-template-columns: 40px 200px 88px;
    }

    &_index {
        display: flex;
        align-items: center;
        justify-content: center;

        height: 100%;
        min-height: 36px;
        max-height: 40px;

        font-size: 14px;
        font-weight: 600;
        line-height: 100%;

        background: varToRgba('darkgray850', 0.5);
        border-radius: 4px;
    }

    &_icao {
        font-size: 14px;
        font-weight: 600;
    }

    & &_info {
        background: transparent;

        :deep(.info-block__content) {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;

            &:first-child {
                min-width: 30px;
                max-width: 40%;
            }
        }

        :deep(.info-block_top) {
            flex-wrap: nowrap;
        }
    }

    &_data {
        display: flex;
        flex-direction: column;
        gap: 2px;
        justify-content: center;

        &_counts {
            display: grid;
            grid-template-columns: repeat(2, 49%);
            justify-content: space-between;

            &_counter {
                display: flex;
                gap: 4px;
                font-size: 14px;
                font-weight: 700;

                &:last-child {
                    justify-content: flex-end;
                }

                &_icon {
                    width: 16px;
                }
            }
        }

        & &_positions {
            overflow: hidden;
            gap: 0;
            border-radius: 2px;

            &_position {
                display: flex;
                align-items: center;
                justify-content: center;

                height: 16px;

                font-size: 12px;
                font-weight: 600;
                line-height: 100%;
                color: $lightgray0Orig;
                text-align: center;

                background: var(--color);
            }
        }
    }
}
</style>
