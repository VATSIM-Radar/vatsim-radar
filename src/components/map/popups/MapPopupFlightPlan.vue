<template>
    <div class="flight-plan">
        <template v-if="flightPlan.departure && flightPlan.arrival">
            <div class="flight-plan__cols">
                <div class="flight-plan__title">
                    Departure
                </div>
                <div class="flight-plan__title">
                    Arrival
                </div>
            </div>
            <div class="flight-plan__cols">
                <common-info-block
                    :bottom-items="[depAirport?.name, depCountry?.country]"
                    class="flight-plan__card"
                    :is-button="!!depAirport"
                    text-align="center"
                    :top-items="[flightPlan.departure]"
                    @click="mapStore.addAirportOverlay(depAirport?.icao ?? '')"
                />
                <common-info-block
                    :bottom-items="[arrAirport?.name, arrCountry?.country]"
                    class="flight-plan__card"
                    :is-button="!!arrAirport"
                    text-align="center"
                    :top-items="[flightPlan.arrival]"
                    @click="mapStore.addAirportOverlay(arrAirport?.icao ?? '')"
                />
            </div>
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
                    v-if="!cruise?.min && !cruise?.max"
                    :bottom-items="[`${ cruise?.planned || flightPlan.altitude } ft`]"
                    class="flight-plan__card"
                    text-align="center"
                    :top-items="['Cruise Altitude']"
                />
            </div>
            <div
                v-if="cruise?.min || cruise?.max"
                class="flight-plan__cols"
            >
                <common-info-block
                    :bottom-items="[cruise?.min, cruise?.planned, cruise?.max]"
                    class="flight-plan__card"
                    text-align="center"
                    :top-items="['Stepclimbs', 'Min to max']"
                />
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
import { useMapStore } from '~/store/map';
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';
import { getAirportCountry } from '~/composables/airport';

const props = defineProps({
    flightPlan: {
        type: Object as PropType<VatsimPilotFlightPlan>,
        required: true,
    },
    cruise: {
        type: Object as PropType<VatsimExtendedPilot['cruise'] | null>,
        default: null,
    },
    status: {
        type: String as PropType<VatsimExtendedPilot['status'] | null>,
        default: null,
    },
});

const dataStore = useDataStore();
const mapStore = useMapStore();

const convertTime = (time: string) => {
    const hours = time.slice(0, 2);
    const minutes = time.slice(2, 4);

    return `${ hours }:${ minutes }`;
};

const depAirport = computed(() => {
    const iataAirport = dataStore.vatspy.value?.data.airports.find(x => x.iata === props.flightPlan.departure);
    if (iataAirport) {
        return {
            ...iataAirport,
            icao: iataAirport.iata!,
        };
    }

    return dataStore.vatspy.value?.data.airports.find(x => x.icao === props.flightPlan.departure);
});

const arrAirport = computed(() => {
    const iataAirport = dataStore.vatspy.value?.data.airports.find(x => x.iata === props.flightPlan.arrival);
    if (iataAirport) {
        return {
            ...iataAirport,
            icao: iataAirport.iata!,
        };
    }

    return dataStore.vatspy.value?.data.airports.find(x => x.icao === props.flightPlan.arrival);
});

const depCountry = computed(() => {
    return getAirportCountry(depAirport.value?.icao);
});

const arrCountry = computed(() => {
    return getAirportCountry(arrAirport.value?.icao);
});

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

    &__cols {
        display: flex;
        gap: 8px;

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
