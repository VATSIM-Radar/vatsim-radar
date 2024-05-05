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
                    text-align="center"
                    is-button
                    class="flight-plan__card"
                    :top-items="[flightPlan.departure]"
                    :bottom-items="[depAirport?.name, depCountry?.country]"
                />
                <common-info-block
                    text-align="center"
                    is-button
                    class="flight-plan__card"
                    :top-items="[flightPlan.arrival]"
                    :bottom-items="[arrAirport?.name, arrCountry?.country]"
                />
            </div>
            <div class="flight-plan__cols">
                <common-info-block
                    text-align="center"
                    class="flight-plan__card"
                    :top-items="['Aircraft Type']"
                    :bottom-items="[flightPlan.aircraft_faa]"
                />
                <common-info-block
                    text-align="center"
                    class="flight-plan__card"
                    :top-items="['True Air Speed']"
                    :bottom-items="[`${flightPlan.cruise_tas} kts`]"
                />
                <common-info-block
                    v-if="!cruise?.min && !cruise?.max"
                    text-align="center"
                    class="flight-plan__card"
                    :top-items="['Cruise Altitude']"
                    :bottom-items="[`${cruise?.planned || flightPlan.altitude} ft`]"
                />
            </div>
            <div class="flight-plan__cols" v-if="cruise?.min || cruise?.max">
                <common-info-block
                    text-align="center"
                    class="flight-plan__card"
                    :top-items="['Stepclimbs', 'Min to max']"
                    :bottom-items="[cruise?.min, cruise?.planned, cruise?.max]"
                />
            </div>
        </template>
        <common-copy-info-block v-if="flightPlan.route" :text="flightPlan.route">
            Route
        </common-copy-info-block>
        <common-copy-info-block v-if="flightPlan.remarks" :text="flightPlan.remarks">
            Remarks
        </common-copy-info-block>
    </div>
</template>

<script setup lang="ts">
import type { VatsimExtendedPilot, VatsimPilotFlightPlan } from '~/types/data/vatsim';
import type { PropType } from 'vue';
import CommonCopyInfoBlock from '~/components/common/CommonCopyInfoBlock.vue';

const props = defineProps({
    flightPlan: {
        type: Object as PropType<VatsimPilotFlightPlan>,
        required: true,
    },
    cruise: {
        type: Object as PropType<VatsimExtendedPilot['cruise'] | null>,
        default: null,
    },
});

const dataStore = useDataStore();

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
    return dataStore.vatspy.value?.data.countries.find(x => x.code === depAirport?.value?.icao.slice(0, 2));
});

const arrCountry = computed(() => {
    return dataStore.vatspy.value?.data.countries.find(x => x.code === arrAirport?.value?.icao.slice(0, 2));
});
</script>

<style scoped lang="scss">
.flight-plan {
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
    z-index: 0;

    &__cols {
        display: flex;
        gap: 8px;

        > * {
            width: 0;
            flex: 1 1 0;
        }
    }

    &__title {
        text-align: center;
        font-weight: 600;
        font-size: 13px;
    }

    &__card {
        &_route {
            display: flex;
            flex-direction: column;
            gap: 4px;

            &_header {
                display: flex;
                font-weight: 600;
                font-size: 13px;
                justify-content: space-between;
                gap: 8px;

                &_status {
                    color: var(--status-color);
                    font-size: 12px;
                }
            }

            &_line {
                height: 24px;
                display: flex;
                align-items: center;
                position: relative;

                &::before, &::after {
                    content: '';
                    position: absolute;
                    height: 2px;
                    border-radius: 4px;
                    background: $neutral850;
                    width: 100%;
                }

                &::after {
                    background: $primary500;
                    width: var(--percent);
                }

                svg {
                    height: 24px;
                    position: relative;
                    z-index: 1;
                    transform: translateX(-50%) rotate(90deg);
                    left: var(--percent);

                    :deep(path:last-child:not(:only-child)) {
                        color: $neutral1000;
                    }
                }

                &--start svg {
                    transform: rotate(90deg);
                }
            }

            &_footer {
                display: flex;
                justify-content: space-between;
                gap: 8px;
                align-items: center;
                font-size: 11px;
                font-weight: 400;
            }
        }
    }
}
</style>
