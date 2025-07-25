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
        <common-button
            :disabled="!map"
            size="S"
            type="secondary-875"
            @click.stop="showAirportOnMap(airport.airport, map)"
        >
            <template #icon>
                <location-icon width="14"/>
            </template>
        </common-button>
        <div class="airport-card_icao">
            {{ airport.airport.icao }}
        </div>
        <common-info-block
            v-if="!isMobile"
            :bottom-items="[ country?.country, airport.airport.name ]"
            class="airport-card_info"
        >
            <template #bottom="{ item }">
                <span :title="String(item)">
                    {{ item }}
                </span>
            </template>
        </common-info-block>
        <div v-else/>
        <div class="airport-card_data">
            <div class="airport-card_data_counts">
                <div class="airport-card_data_counts_counter">
                    <departing-icon class="airport-card_data_counts_counter_icon"/>
                    <div class="airport-card_data_counts_counter_text">
                        <template v-if="store.localSettings.traffic?.showTotalDeparturesInFeaturedAirports">
                            {{ (airport.aircraftList.groundDep?.length ?? 0) + (airport.aircraftList.departures?.length ?? 0) }}
                        </template>
                        <template v-else>
                            {{ airport.aircraftList.groundDep?.length ?? 0 }}
                        </template>
                    </div>
                </div>
                <div class="airport-card_data_counts_counter">
                    <arriving-icon class="airport-card_data_counts_counter_icon"/>
                    <div class="airport-card_data_counts_counter_text">
                        {{ airport.aircraftList.arrivals?.length ?? 0 }}
                    </div>
                </div>
            </div>
            <div
                class="airport-card_data_positions __section-group"
                :class="{ 'airport-card_data_positions--short': controllers.length > 2 }"
            >
                <div
                    v-for="controller in controllers"
                    :key="controller.facility"
                    class="airport-card_data_positions_position"
                    :class="{ 'airport-card_data_positions_position--atis': controller.isATIS }"
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
import { getControllerPositionColor, showAirportOnMap, useFacilitiesIds } from '~/composables/atc';
import type { AirportsList } from '~/components/map/airports/MapAirportsList.vue';
import { useMapStore } from '~/store/map';
import { useStore } from '~/store';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import LocationIcon from '@/assets/icons/kit/location.svg?component';
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';

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
const store = useStore();
const map = inject<ShallowRef<Map | null>>('map')!;
const isMobile = useIsMobile();

interface Controller {
    facility: number;
    text: string;
    color: string;
    isATIS: boolean;
}

const controllers = computed<Controller[]>(() => {
    const list: Controller[] = [];

    for (const controller of [...props.airport.localAtc, ...props.airport!.arrAtc]) {
        if (controller.booking) continue;
        if (list.some(x => controller.isATIS ? x.isATIS : x.facility === controller.facility) || controller.facility === ids.FSS || controller.facility === ids.CTR) continue;

        list.push({
            facility: controller.facility,
            color: getControllerPositionColor(controller),
            text: '',
            isATIS: controller.isATIS || controller.facility === ids.ATIS || !!controller.atis_code,
        });
    }

    for (const controller of list) {
        let length = list.length;
        if (!list.some(x => x.isATIS)) length++;

        if (controller.isATIS) {
            if (length <= 3) controller.text = 'ATIS';
            else controller.text = 'A';
            continue;
        }

        switch (controller.facility) {
            case ids.TWR:
                if (length <= 3) controller.text = 'TWR';
                else controller.text = 'T';
                break;
            case ids.DEL:
                if (length <= 3) controller.text = 'DEL';
                else controller.text = 'D';
                break;
            case ids.GND:
                if (length <= 3) controller.text = 'GND';
                else controller.text = 'G';
                break;
            case ids.APP:
                if (length <= 3) controller.text = 'APP';
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
    grid-template-columns: 24px 32px 40px 200px 88px;
    gap: 8px;
    align-items: center;
    justify-content: space-between;

    min-height: 52px;
    padding: 8px;
    border-radius: 4px;

    background: $darkgray900;

    transition: 0.3s;

    @include mobileOnly {
        grid-template-columns: 24px 32px 40px 1fr 88px;
        justify-content: space-between;
    }

    @include hover {
        &:hover {
            background: $darkgray875;
        }
    }

    &_index {
        display: flex;
        align-items: center;
        justify-content: center;

        height: 100%;
        min-height: 36px;
        max-height: 40px;
        border-radius: 4px;

        font-size: 14px;
        font-weight: 600;
        line-height: 100%;
    }

    &_icao {
        font-size: 14px;
        font-weight: 600;
    }

    & &_info {
        padding: 0 !important;
        background: transparent;

        :deep(.info-block__content) {
            overflow: hidden;
            width: 50%;
            text-overflow: ellipsis;
            white-space: nowrap;

            @supports (display: -webkit-box) and (-webkit-line-clamp: 2) {
                display: -webkit-box;
                -webkit-box-orient: vertical;
                -webkit-line-clamp: 2;

                text-align: center;
                overflow-wrap: anywhere;
                white-space: unset;
            }
        }

        :deep(.info-block_bottom) {
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

            &--short .airport-card_data_positions_position--atis {
                width: 8px;
                max-width: 8px;
                font-size: 0;
            }
        }
    }
}
</style>
