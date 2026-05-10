<template>
    <div class="flight-plan">
        <template v-if="flightPlan?.departure && flightPlan.arrival">
            <div class="flight-plan__airports">
                <div class="flight-plan__airports_left">
                    <div class="flight-plan__airports_left_icon">
                        <airport-icon/>
                    </div>
                    <div class="flight-plan__airports_left_icon">
                        <airport-icon/>
                    </div>
                </div>
                <div class="flight-plan__airports_right">
                    <div
                        class="flight-plan__airports__airport"
                        :class="{ 'flight-plan__airports__airport--exists': depAirport }"
                        @click="depAirport && mapStore.addAirportOverlay(depAirport.icao)"
                    >
                        <ui-text type="3b-medium">
                            {{depAirport?.icao ?? flightPlan?.departure ?? 'ZZZZ'}}
                        </ui-text>
                        <ui-text
                            v-if="depAirport?.name"
                            type="caption-light"
                        >
                            {{depAirport?.name}}
                        </ui-text>
                    </div>
                    <div
                        v-if="flightPlan?.diverted_origin"
                        class="flight-plan__airports__airport flight-plan__airports__airport--orig"
                        :class="{ 'flight-plan__airports__airport--exists': divOrgAirport }"
                        @click="divOrgAirport && mapStore.addAirportOverlay(divOrgAirport.icao)"
                    >
                        <ui-text type="3b-medium">
                            {{divOrgAirport?.icao ?? flightPlan?.diverted_origin ?? 'ZZZZ'}}
                        </ui-text>
                        <ui-text
                            v-if="divOrgAirport?.name"
                            type="caption-light"
                        >
                            {{divOrgAirport?.name}}
                        </ui-text>
                    </div>
                    <div
                        class="flight-plan__airports__airport"
                        :class="{ 'flight-plan__airports__airport--exists': arrAirport }"
                        @click="arrAirport && mapStore.addAirportOverlay(arrAirport.icao)"
                    >
                        <ui-text type="3b-medium">
                            {{arrAirport?.icao ?? flightPlan?.arrival ?? 'ZZZZ'}}
                        </ui-text>
                        <ui-text
                            v-if="arrAirport?.name"
                            type="caption-light"
                        >
                            {{arrAirport?.name}}
                        </ui-text>
                    </div>
                </div>
            </div>

            <ui-button
                v-if="depAirport || arrAirport"
                size="S"
                text-align="left"
                type="link"
                @click="store.metarRequest = (!status || status?.startsWith('dep')) ? [flightPlan.departure, flightPlan.arrival] : [flightPlan.arrival]"
            >
                <ui-text type="caption-light">
                    Weather Request
                </ui-text>
            </ui-button>

            <ui-separator
                dashed
                distance="0"
                full
                horizontal
                width="100%"
            />

            <ui-data-container>
                <ui-data-list
                    :grid-columns="4"
                    :items="[
                        { title: 'EOBT', text: `${ convertTime(flightPlan.deptime ?? '') }z`, hide: (status !== 'depGate' && status !== 'depTaxi') || !flightPlan.deptime },
                        { title: 'Time Enroute', text: `${ convertTime(flightPlan.enroute_time ?? '') }`, hide: (status !== 'depGate' && status !== 'depTaxi') || !flightPlan.enroute_time },
                        { title: 'Fuel Time', text: `${ convertTime(flightPlan.fuel_time ?? '') }`, hide: (status !== 'depGate' && status !== 'depTaxi') || !flightPlan.fuel_time },
                        { title: 'Aircraft Type', text: flightPlan.aircraft_faa, hide: !flightPlan.aircraft_faa },
                        { title: 'Cruise TAS', text: `${ flightPlan.cruise_tas } kts`, hide: !flightPlan.cruise_tas },
                        { title: 'Cruise Altitude', text: `${ numberFormatter.format(flightPlan.altitude ? +flightPlan.altitude : 0) } ft`, hide: !flightPlan.altitude },
                        { title: 'Registration', text: registration, hide: !registration },
                        { title: 'Alternate', text: alternates.alt, hide: !alternates.alt },
                        { title: 'Voice Rules', text: commType, hide: commType === 'Voice' },
                        ...alternates.takeoff?.map(x => ({ title: 'Takeoff Alternate', text: x })) ?? [],
                        ...alternates.enroute?.map(x => ({ title: 'Enroute Alternate', text: x })) ?? [],
                    ]"
                />
            </ui-data-container>

            <template v-if="stepclimbs?.length">
                <ui-separator
                    dashed
                    distance="0"
                    full
                    horizontal
                    width="100%"
                />

                <ui-text type="2b-medium">
                    Stepclimbs
                </ui-text>

                <ui-data-container>
                    <ui-data-list
                        circle-divider
                        :items="stepclimbs?.map(x => ({ title: `${ x.measurement === 'M' ? 'S' : 'FL' }${ x.level }`, text: x.waypoint })) ?? []"
                    />
                </ui-data-container>
            </template>
        </template>
        <ui-notification
            v-else
            type="error"
        >
            No flight plan uploaded
        </ui-notification>
        <ui-copy-info
            v-if="flightPlan?.route"
            auto-expand
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
            auto-expand
            :rows="3"
            :text="flightPlan.remarks"
        >
            Remarks

            <template
                v-if="selcal"
                #prepend
            >
                <ui-text
                    class="flight-plan__selcal"
                    type="caption-light"
                >
                    SELCAL: {{selcal}}
                </ui-text>
            </template>
        </ui-copy-info>
    </div>
</template>

<script setup lang="ts">
import type { VatsimExtendedPilot, VatsimPilotFlightPlan } from '~/types/data/vatsim';
import type { PropType } from 'vue';
import UiCopyInfo from '~/components/ui/text/UiCopyInfo.vue';
import UiNotification from '~/components/ui/data/UiNotification.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import { useStore } from '~/store';
import AirportIcon from '~/assets/icons/kit/airport-dest.svg?component';
import UiBubble from '~/components/ui/data/UiBubble.vue';
import UiText from '~/components/ui/text/UiText.vue';
import UiSeparator from '~/components/ui/data/UiSeparator.vue';
import UiDataContainer from '~/components/ui/data/UiDataContainer.vue';
import UiDataList from '~/components/ui/data/UiDataList.vue';
import { getFlightPlanParam } from '~/utils/shared/vatsim';

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

const numberFormatter = new Intl.NumberFormat('ru-RU');

const store = useStore();
const mapStore = useMapStore();
const dataStore = useDataStore();

const convertTime = (time: string) => {
    const hours = time.slice(0, 2);
    const minutes = time.slice(2, 4);

    return `${ hours }:${ minutes }`;
};

const selcal = computed<string | null>(() => {
    return getFlightPlanParam(props.flightPlan?.remarks, 'SEL');
});

const registration = computed<string | null>(() => {
    return getFlightPlanParam(props.flightPlan?.remarks, 'REG');
});

const commType = computed<'Voice' | 'Receive Voice' | 'Text Only'>(() => {
    if (props.flightPlan?.remarks?.includes('/V/')) return 'Voice';
    if (props.flightPlan?.remarks?.includes('/R/')) return 'Receive Voice';
    if (props.flightPlan?.remarks?.includes('/T/')) return 'Text Only';

    return 'Voice';
});

const alternates = computed(() => {
    const TALT = getFlightPlanParam(props.flightPlan?.remarks, 'TALT')?.split(' ')?.filter(x => !x.startsWith('/') && !x.endsWith('/'));
    const RALT = getFlightPlanParam(props.flightPlan?.remarks, 'RALT')?.split(' ')?.filter(x => !x.startsWith('/') && !x.endsWith('/'));

    return {
        alt: props.flightPlan?.alternate ?? null,
        takeoff: TALT,
        enroute: RALT,
    };
});

const depAirport = computed(() => dataStore.vatspy.value?.data.keyAirports.realIcao[props.flightPlan?.departure ?? ''] ?? null);
const arrAirport = computed(() => dataStore.vatspy.value?.data.keyAirports.realIcao[props.flightPlan?.arrival ?? ''] ?? null);
const divOrgAirport = computed(() => dataStore.vatspy.value?.data.keyAirports.realIcao[props.flightPlan?.diverted_origin ?? ''] ?? null);
</script>

<style scoped lang="scss">
.flight-plan {
    position: relative;
    z-index: 0;

    display: flex;
    flex-direction: column;
    gap: 16px;

    &__airports {
        display: flex;
        gap: 16px;

        &_left, &_right {
            display: flex;
            flex-direction: column;
            gap: 8px;
            justify-content: space-between;
        }

        &_left {
            position: relative;
            width: 20px;

            &::before {
                content: '';

                position: absolute;
                top: 20px;
                left: calc(50% - 1px);

                height: calc(100% - 40px);
                border-left: 1px dashed $whiteAlpha12;
            }

            &_icon {
                width: 20px;
                min-width: 20px;
            }
        }

        &_right {
            flex-grow: 1;
            min-height: 64px;
        }

        &__airport {
            display: flex;
            flex-direction: column;
            gap: 4px;

            &:first-child {
                margin-top: -4px;
            }

            &:last-child {
                margin-bottom: -4px;
            }

            &--orig {
                color: $whiteAlpha36;
                text-decoration: line-through;
            }

            &--exists {
                cursor: pointer;

                @include hover {
                    transition: 0.3s;

                    &:hover {
                        color: $blue500;
                    }
                }
            }
        }
    }
}
</style>
