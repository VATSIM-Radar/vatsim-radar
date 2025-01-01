<template>
    <div class="flight-plan">
        <template v-if="flightPlan.departure && flightPlan.arrival">
            <common-pilot-destination
                :pilot="{
                    departure: flightPlan.departure,
                    arrival: flightPlan.arrival,
                }"
            />
            <div
                v-if="(flightPlan.deptime || flightPlan.enroute_time) && (!status || status === 'depGate' || status === 'depTaxi')"
                class="flight-plan__cols"
            >
                <common-info-block
                    v-if="flightPlan.deptime"
                    :bottom-items="[`${ convertTime(flightPlan.deptime) }z`]"
                    class="flight-plan__card"
                    text-align="center"
                    :top-items="['Planned EOBT']"
                />
                <common-info-block
                    v-if="flightPlan.enroute_time"
                    :bottom-items="[convertTime(flightPlan.enroute_time)]"
                    class="flight-plan__card"
                    text-align="center"
                    :top-items="['Planned Enroute']"
                />
            </div>
            <div class="flight-plan__cols">
                <common-info-block
                    :bottom-items="[flightPlan.aircraft_faa]"
                    class="flight-plan__card"
                    text-align="center"
                    :top-items="['Aircraft Type']"
                />
                <common-info-block
                    :bottom-items="[`${ flightPlan.cruise_tas } kts`]"
                    class="flight-plan__card"
                    text-align="center"
                    :top-items="['True Air Speed']"
                />
                <common-info-block
                    :bottom-items="[`${ flightPlan.altitude } ft`]"
                    class="flight-plan__card"
                    text-align="center"
                    :top-items="['Cruise Altitude']"
                />
            </div>
            <div
                v-if="stepclimbs?.length"
                class="flight-plan__cols"
            >
                <common-info-block
                    :bottom-items="stepclimbs.map(() => 'stepclimb')"
                    class="flight-plan__card"
                    text-align="center"
                >
                    <template #bottom="{ index }">
                        <div class="flight-plan__stepclimb">
                            <strong>{{ stepclimbs[index!].waypoint }}</strong><br>
                            {{ stepclimbs[index!].measurement === 'M' ? 'S' : 'FL' }}{{ stepclimbs[index!].level }}
                        </div>
                    </template>
                </common-info-block>
            </div>
        </template>
        <common-copy-info-block
            v-if="flightPlan.route"
            :text="flightPlan.route"
        >
            Route
        </common-copy-info-block>
        <common-copy-info-block
            v-if="flightPlan.remarks"
            :text="flightPlan.remarks"
        >
            Remarks

            <template
                v-if="selcal"
                #prepend
            >
                <div class="flight-plan__selcal">
                    SELCAL: {{selcal}}
                </div>
            </template>
        </common-copy-info-block>
    </div>
</template>

<script setup lang="ts">
import type { VatsimExtendedPilot, VatsimPilotFlightPlan } from '~/types/data/vatsim';
import type { PropType } from 'vue';
import CommonCopyInfoBlock from '~/components/common/blocks/CommonCopyInfoBlock.vue';
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';
import CommonPilotDestination from '~/components/common/vatsim/CommonPilotDestination.vue';

const props = defineProps({
    flightPlan: {
        type: Object as PropType<VatsimPilotFlightPlan>,
        required: true,
    },
    stepclimbs: {
        type: Object as PropType<VatsimExtendedPilot['stepclimbs'] | null>,
        default: null,
    },
    status: {
        type: String as PropType<VatsimExtendedPilot['status'] | null>,
        default: null,
    },
});

const convertTime = (time: string) => {
    const hours = time.slice(0, 2);
    const minutes = time.slice(2, 4);

    return `${ hours }:${ minutes }`;
};

const selcalRegex = new RegExp(' SEL\\/(?<selcal>.+?) ');

const selcal = computed<string | null>(() => {
    const remarks = props.flightPlan.remarks;
    if (!remarks) return null;
    const result = selcalRegex.exec(remarks);
    return result?.groups?.selcal || null;
});
</script>

<style scoped lang="scss">
.flight-plan {
    position: relative;
    z-index: 0;

    display: flex;
    flex-direction: column;
    gap: 8px;

    &__stepclimb {
        text-align: center;
    }

    &__cols {
        display: flex;
        gap: 4px;

        > * {
            flex: 1 1 0;
            width: 0;
        }
    }

    &__selcal {
        font-size: 12px;
        font-weight: 600;
    }

    &__title {
        font-size: 13px;
        font-weight: 600;
        text-align: center;
    }

    &__card {
        &_route {
            display: flex;
            flex-direction: column;
            gap: 4px;

            &_header {
                display: flex;
                gap: 8px;
                justify-content: space-between;

                font-size: 13px;
                font-weight: 600;

                &_status {
                    font-size: 12px;
                    color: var(--status-color);
                }
            }

            &_line {
                position: relative;
                display: flex;
                align-items: center;
                height: 24px;

                &::before, &::after {
                    content: '';

                    position: absolute;

                    width: 100%;
                    height: 2px;

                    background: $darkgray850;
                    border-radius: 4px;
                }

                &::after {
                    width: var(--percent);
                    background: $primary500;
                }

                svg {
                    position: relative;
                    z-index: 1;
                    left: var(--percent);
                    transform: translateX(-50%) rotate(90deg);

                    height: 24px;

                    :deep(path:last-child:not(:only-child)) {
                        color: $darkgray1000;
                    }
                }

                &--start svg {
                    transform: rotate(90deg);
                }
            }

            &_footer {
                display: flex;
                gap: 8px;
                align-items: center;
                justify-content: space-between;

                font-size: 11px;
                font-weight: 400;
            }
        }
    }
}
</style>
