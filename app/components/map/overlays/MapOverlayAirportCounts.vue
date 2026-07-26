<template>
    <div
        class="airport-counts airport-counts--root"
        :class="{ 'airport-counts--ground_departures': listGroundDepartures }"
    >
        <ui-tooltip
            location="bottom"
            :open-method="(overlay.collapsed || departureCountTooltipSeen) ? 'disabled' : 'mouseOver'"
            width="120px"
            @click="departureCountTooltipSeen = true"
        >
            <template #activator>
                <div
                    class="airport-counts_counter"
                    :style="{ '--color': `rgb(var(--${ getPilotStatus('depTaxi').color }))` }"
                    @click="setSettingByKey('map.preferences.airports.departuresCountInOverlay', !listGroundDepartures)"
                >
                    <template v-if="!listGroundDepartures">
                        <departing-icon
                            class="airport-counts_counter_icon"
                        />
                        <div
                            class="airport-counts_counter_icon_text"
                        >
                            {{ aircraft?.departures.length ?? 0 }}
                        </div>
                    </template>
                    <template v-else>
                        <ground-icon
                            class="airport-counts_counter_icon"
                        />
                        <div
                            class="airport-counts_counter_icon_text"
                        >
                            {{ aircraft?.groundDep.length ?? 0 }}
                        </div>
                    </template>
                </div>
            </template>
            With a click you can switch between "already airborne departures", which is the default, and "departures on the ground".
        </ui-tooltip>
        <ui-tooltip
            class="airport-counts-detailed"
            :class="{ 'airport-counts-detailed--ground_departures': listGroundDepartures }"
            :close-method="arrivalCountTooltipCloseMethod"
            location="bottom"
            :open-method="overlay.collapsed ? 'disabled' : 'mouseOver'"
            @click="arrivalCountTooltipCloseMethod = arrivalCountTooltipCloseMethod === 'mouseLeave' ? 'click' : 'mouseLeave'"
        >
            <template #activator>
                <div
                    class="airport-counts"
                >
                    <div
                        v-if="!listGroundDepartures"
                        class="airport-counts_counter"
                        :style="{ '--color': `rgb(var(--lightGray500))` }"
                    >
                        <ground-icon class="airport-counts_counter_icon"/>
                        <div class="airport-counts_counter_icon_text">
                            {{ (aircraft?.groundArr.length ?? 0) + (aircraft?.groundDep.length ?? 0) }}
                        </div>
                    </div>
                    <div
                        class="airport-counts_counter"
                        :style="{ '--color': `rgb(var(--${ getPilotStatus('arrTaxi').color }))` }"
                    >
                        <arriving-icon class="airport-counts_counter_icon"/>
                        <div class="airport-counts_counter_icon_text">
                            {{ (aircraft?.arrivals.length ?? 0) }}
                        </div>
                    </div>
                </div>
            </template>
            <div
                class="airport-counts-tooltip_column airport-counts-tooltip_column--first"
            >
                <div class="airport-counts-tooltip_column_counts">

                    <div
                        class="airport-counts-tooltip_counts airport-counts-tooltip_counts--groundDep"
                    >
                        {{ aircraft?.groundDep?.length ?? 0 }}
                    </div>
                    <div
                        class="airport-counts-tooltip_counts airport-counts-tooltip_counts--prefiles"
                    >
                        {{ aircraft?.prefiles?.length ?? 0 }}
                    </div>
                    <div
                        class="airport-counts-tooltip_counts airport-counts-tooltip_counts--groundArr"
                    >
                        {{ aircraft?.groundArr?.length ?? 0 }}
                    </div>
                    <ui-tooltip
                        class="airport-counts-tooltip_question"
                        location="bottom"
                        width="150px"
                    >
                        <template #activator>
                            <div>
                                <question-icon width="14"/>
                            </div>
                        </template>
                        - The left column shows the aircraft on the ground.<br>- The right column shows the expected arrivals in 15-minute intervals from top to bottom.
                    </ui-tooltip>
                </div>
            </div>
            <div
                class="airport-counts-tooltip_column"
            >
                <vatsim-traffic-rate
                    :aircraft="aircraft"
                    :icon-color="radarColors.lightGray600"
                    :text-color="radarColors.red500"
                    use-opacity
                />
            </div>
        </ui-tooltip>
    </div>
</template>

<script setup lang="ts">
import { getPilotStatus } from '~/composables/vatsim/pilots.ts';
import UiTooltip from '~/components/ui/data/UiTooltip.vue';
import type { TooltipCloseMethod } from '~/components/ui/data/UiTooltip.vue';
import VatsimTrafficRate from '~/components/features/vatsim/airport/VatsimTrafficRate.vue';
import { useSettingValueFromFunc } from '~/composables/settings/v2/utils.ts';
import type { PropType } from 'vue';
import type { StoreOverlayAirport } from '~/store/map.ts';
import DepartingIcon from '@/assets/icons/airport/departing.svg?component';
import GroundIcon from '@/assets/icons/airport/ground.svg?component';
import ArrivingIcon from '@/assets/icons/airport/landing.svg?component';
import QuestionIcon from 'assets/icons/basic/question.svg?component';

defineProps({
    overlay: {
        type: Object as PropType<StoreOverlayAirport>,
        required: true,
    },
    aircraft: {
        type: Object as PropType<AirportPopupPilotList | null>,
        default: null,
    },
});

const listGroundDepartures = useSettingValueFromFunc('map.preferences.airports.departuresCountInOverlay');
const departureCountTooltipSeen = useLocalStorage('map-airport-popup-departure-count-seen', false);

const arrivalCountTooltipCloseMethod = ref<TooltipCloseMethod>('mouseLeave');
</script>

<style scoped lang="scss">
.airport-counts {
    display: flex;
    gap: 4px;
    align-items: center;

    font-size: 12px;
    font-weight: 700;
    line-height: 100%;

    @include mobileOnly {
        &--root {
            margin-bottom: 8px;
        }
    }

    &--ground_departures {
        gap: 14px;
    }

    &_counter {
        display: flex;
        gap: 2px;
        align-items: center;
        color: var(--color);

        &_icon {
            width: 16px;
        }
    }
}

:deep(.airport-counts-detailed > .tooltip_container) {
    cursor: initial;
    margin-left: 5px;

    & .tooltip_container_content_text {
        display: flex;
        gap: 15px;
    }
}

:deep(.airport-counts-detailed--ground_departures > .tooltip_container) {
    margin-left: -18px;
}

.airport-counts-detailed.tooltip {
    .airport-counts-tooltip {
        &_column {
            display: flex;
            flex-direction: column;
            gap: 6px;

            width: 35px;

            font-size: 12px;
            font-weight: 700;
            line-height: 100%;

            &--first{
                align-items: flex-end;
            }

            &_counts {
                display: flex;
                flex-direction: column;
                gap: 3px;
            }
        }

        &_question {
            align-self: flex-start;
            margin-top: 3px;
        }

        &_counts {
            display: flex;
            gap: 3px;
            justify-content: space-between;
            font-weight: 600;

            &::before {
                content: '';
                position: relative;
                display: block;
            }

            &--groundDep {
                color: $green500;

                &::before {
                    top: -2px;

                    border-top: 6px solid transparent;
                    border-right: 6px solid transparent;
                    border-bottom: 6px solid currentColor;
                    border-left: 6px solid transparent;
                }
            }

            &--prefiles {
                color: $lightGray600;

                &::before {
                    top: 3px;
                    width: 11px;
                    height: 5px;
                    background: currentColor;
                }
            }

            &--groundArr {
                color: $red300;

                &::before {
                    top: 2px;

                    border-top: 6px solid currentColor;
                    border-right: 6px solid transparent;
                    border-bottom: 6px solid transparent;
                    border-left: 6px solid transparent;
                }
            }
        }
    }
}
</style>
