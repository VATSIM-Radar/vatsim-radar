<template>
    <div class="flight-plan">
        <template v-if="flightPlan?.departure && flightPlan.arrival">
            <ui-button
                size="S"
                text-align="left"
                type="secondary"
                @click="store.metarRequest = (!status || status?.startsWith('dep')) ? [flightPlan.departure, flightPlan.arrival] : [flightPlan.arrival]"
            >
                <template #icon>
                    <ground-icon/>
                </template>
                Weather Request
            </ui-button>

            <vatsim-pilot-destination
                :pilot="{
                    departure: flightPlan.departure,
                    arrival: flightPlan.arrival,
                    diverted: flightPlan.diverted,
                    diverted_arrival: flightPlan.diverted_arrival,
                    diverted_origin: flightPlan.diverted_origin,
                }"
            />
            <div
                v-if="(flightPlan.deptime || flightPlan.enroute_time) && (!status || status === 'depGate' || status === 'depTaxi')"
                class="flight-plan__cols"
            >
                <ui-text-block
                    v-if="flightPlan.deptime"
                    :bottom-items="[`${ convertTime(flightPlan.deptime) }z`]"
                    class="flight-plan__card"
                    text-align="center"
                    :top-items="['Planned EOBT']"
                />
                <ui-text-block
                    v-if="flightPlan.enroute_time"
                    :bottom-items="[convertTime(flightPlan.enroute_time)]"
                    class="flight-plan__card"
                    text-align="center"
                    :top-items="['Planned Enroute']"
                />
            </div>
            <div class="flight-plan__cols">
                <ui-text-block
                    :bottom-items="[flightPlan.aircraft_faa]"
                    class="flight-plan__card"
                    text-align="center"
                    :top-items="['Aircraft Type']"
                />
                <ui-text-block
                    :bottom-items="[`${ flightPlan.cruise_tas } kts`]"
                    class="flight-plan__card"
                    text-align="center"
                    :top-items="['True Air Speed']"
                />
                <ui-text-block
                    :bottom-items="[`${ flightPlan.altitude } ft`]"
                    class="flight-plan__card"
                    text-align="center"
                    :top-items="['Cruise Altitude']"
                />
            </div>
            <div
                v-if="registration || alternates.alt || commType !== 'Voice'"
                class="flight-plan__cols"
            >
                <ui-text-block
                    v-if="registration"
                    :bottom-items="[registration]"
                    class="flight-plan__card"
                    text-align="center"
                    :top-items="['Registration']"
                />
                <ui-text-block
                    v-if="alternates.alt"
                    :bottom-items="[alternates.alt]"
                    class="flight-plan__card"
                    text-align="center"
                    :top-items="['Alternate']"
                />
                <ui-text-block
                    v-if="commType !== 'Voice'"
                    :bottom-items="[commType]"
                    class="flight-plan__card"
                    text-align="center"
                    :top-items="['Voice Rules']"
                />
            </div>
            <div
                v-if="stepclimbs?.length"
                class="flight-plan__cols"
            >
                <ui-text-block
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
                </ui-text-block>
            </div>
        </template>
        <ui-notification v-else>
            No flight plan uploaded
        </ui-notification>
        <ui-copy-info
            v-if="flightPlan?.route"
            :text="flightPlan.route"
        >
            Route

            <template #actions>
                <ui-bubble
                    v-if="flightPlan?.locked"
                    size="S"
                    type="secondary"
                >
                    Locked by ATC
                </ui-bubble>
            </template>
        </ui-copy-info>
        <ui-copy-info
            v-if="flightPlan?.remarks"
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
        </ui-copy-info>
        <ui-text-block
            v-if="alternates.takeoff?.length"
            :bottom-items="alternates.takeoff"
            class="flight-plan__card"
            text-align="center"
            :top-items="['Takeoff alternates']"
        />
        <ui-text-block
            v-if="alternates.enroute?.length"
            :bottom-items="alternates.enroute"
            class="flight-plan__card"
            text-align="center"
            :top-items="['Enroute alternates']"
        />
    </div>
</template>

<script setup lang="ts">
import type { VatsimExtendedPilot, VatsimPilotFlightPlan } from '~/types/data/vatsim';
import type { PropType } from 'vue';
import UiCopyInfo from '~/components/ui/text/UiCopyInfo.vue';
import VatsimPilotDestination from '~/components/features/vatsim/pilots/VatsimPilotDestination.vue';
import UiNotification from '~/components/ui/data/UiNotification.vue';
import UiTextBlock from '~/components/ui/text/UiTextBlock.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import GroundIcon from '~/assets/icons/kit/mountains.svg?component';
import { useStore } from '~/store';
import UiBubble from '~/components/ui/data/UiBubble.vue';

const props = defineProps({
    flightPlan: {
        type: Object as PropType<VatsimPilotFlightPlan | null>,
        default: null,
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

const store = useStore();

const convertTime = (time: string) => {
    const hours = time.slice(0, 2);
    const minutes = time.slice(2, 4);

    return `${ hours }:${ minutes }`;
};

function getFlightPlanParam(param: string) {
    if (!props.flightPlan?.remarks) return null;

    const result = new RegExp(`( |^)${ param }\/(?<val>.+?)( [A-Z]+\/.*|$)`).exec(props.flightPlan.remarks);
    return result?.groups?.val || null;
}

const selcal = computed<string | null>(() => {
    return getFlightPlanParam('SEL');
});

const registration = computed<string | null>(() => {
    return getFlightPlanParam('REG');
});

const commType = computed<'Voice' | 'Receive Voice' | 'Text Only'>(() => {
    if (props.flightPlan?.remarks?.includes('/V/')) return 'Voice';
    if (props.flightPlan?.remarks?.includes('/R/')) return 'Receive Voice';
    if (props.flightPlan?.remarks?.includes('/T/')) return 'Text Only';

    return 'Voice';
});

const alternates = computed(() => {
    const TALT = getFlightPlanParam('TALT')?.split(' ')?.filter(x => !x.startsWith('/') && !x.endsWith('/'));
    const RALT = getFlightPlanParam('RALT')?.split(' ')?.filter(x => !x.startsWith('/') && !x.endsWith('/'));

    return {
        alt: props.flightPlan?.alternate ?? null,
        takeoff: TALT,
        enroute: RALT,
    };
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
                    border-radius: 4px;

                    background: $darkgray850;
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
