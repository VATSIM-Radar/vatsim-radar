<template>
    <common-info-popup
        class="pilot"
        collapsible
        v-model:collapsed="overlay.collapsed"
        model-value
        @update:modelValue="!$event ? store.overlays = store.overlays.filter(x => x.id !== overlay.id) : undefined"
        :header-actions="overlay.collapsed ? ['sticky', 'track'] : []"
        max-height="100%"
        :sections="sections"
    >
        <template #title>
            <div class="pilot_header">
                {{ pilot.callsign }}
            </div>
        </template>
        <template #atc>
            <common-toggle v-model="showAtc">
                Show ATC
            </common-toggle>
        </template>
        <template #flight>
            <div class="pilot__content">
                <div class="pilot__self">
                    <div>Pilot</div>
                    <common-info-block
                        class="pilot__card"
                        :top-items="[pilot.name, pilot.cid]"
                        :bottom-items="[...usePilotRating(pilot), stats?.pilot ? `${Math.floor(stats.pilot)}h total time` : undefined]"
                    />
                </div>
                <common-info-block class="pilot__card">
                    <template #top>
                        <div class="pilot__card_route">
                            <div class="pilot__card_route_header">
                                <div class="pilot__card_route_header_airport pilot__card_route_header_airport--dep">
                                    {{
                                        (pilot.flight_plan?.departure || ((pilot.status === 'depTaxi' || pilot.status === 'depGate') && pilot.airport)) || ''
                                    }}
                                </div>
                                <div
                                    class="pilot__card_route_header_status"
                                    :style="{'--color': radarColors[getStatus.color]}"
                                >
                                    {{ getStatus.title }}
                                </div>
                                <div class="pilot__card_route_header_airport pilot__card_route_header_airport--arr">
                                    {{ pilot.flight_plan?.arrival || '' }}
                                </div>
                            </div>
                            <div
                                class="pilot__card_route_line"
                                :class="{
                                    'pilot__card_route_line--start': pilot.toGoPercent < 10,
                                    'pilot__card_route_line--end': pilot.toGoPercent > 90,
                                }"
                                :style="{'--percent': `${ pilot.toGoPercent}%`}"
                                v-if="pilot.toGoPercent"
                            >
                                <component :is="svg"/>
                            </div>
                            <div class="pilot__card_route_footer">
                                <div class="pilot__card_route_footer_left">
                                    {{ pilot.depDist && pilot.status !== 'depTaxi' && pilot.status !== 'depGate' ? `${ pilot.depDist.toFixed(1) } NM,` : '' }} Online
                                    {{ getHoursAndMinutes(new Date(pilot.logon_time).getTime()) }}
                                </div>
                                <div class="pilot__card_route_footer_right" v-if="pilot.toGoDist && pilot.toGoTime">
                                    {{ pilot.toGoDist.toFixed(1) }} NM in {{
                                        datetime.format(new Date(pilot.toGoTime!))
                                    }}Z
                                </div>
                            </div>
                        </div>
                    </template>
                </common-info-block>
                <div class="pilot__cols">
                    <common-info-block
                        class="pilot__card"
                        :top-items="['Speed']"
                        :bottom-items="[`${pilot.groundspeed ?? 0} kts`]"
                        text-align="center"
                    />
                    <common-info-block
                        class="pilot__card"
                        :top-items="['Altitude']"
                        :bottom-items="[`${getPilotTrueAltitude(pilot)} ft`]"
                        :title="pilot.altitude"
                        text-align="center"
                    />
                    <common-info-block
                        class="pilot__card"
                        :top-items="['Heading']"
                        :bottom-items="[`${pilot.heading}°`]"
                        text-align="center"
                    />
                </div>
            </div>
        </template>
        <template #flightplan>
            <div class="pilot__content" v-if="pilot.flight_plan">
                <template v-if="pilot.flight_plan.departure && pilot.flight_plan.arrival">
                    <div class="pilot__cols">
                        <div class="pilot__title">
                            Departure
                        </div>
                        <div class="pilot__title">
                            Arrival
                        </div>
                    </div>
                    <div class="pilot__cols">
                        <common-info-block
                            text-align="center"
                            is-button
                            class="pilot__card"
                            :top-items="[pilot.flight_plan.departure]"
                            :bottom-items="[depAirport?.name]"
                        />
                        <common-info-block
                            text-align="center"
                            is-button
                            class="pilot__card"
                            :top-items="[pilot.flight_plan.arrival]"
                            :bottom-items="[arrAirport?.name]"
                        />
                    </div>
                    <div class="pilot__cols">
                        <common-info-block
                            text-align="center"
                            class="pilot__card"
                            :top-items="['Aircraft Type']"
                            :bottom-items="[pilot.flight_plan.aircraft_faa]"
                        />
                        <common-info-block
                            text-align="center"
                            class="pilot__card"
                            :top-items="['Ground Speed']"
                            :bottom-items="[`${pilot.groundspeed} kts`]"
                        />
                        <common-info-block
                            v-if="!pilot.cruise?.min && !pilot.cruise?.max"
                            text-align="center"
                            class="pilot__card"
                            :top-items="['Cruise Altitude']"
                            :bottom-items="[`${pilot.cruise?.planned} ft`]"
                        />
                    </div>
                    <div class="pilot__cols" v-if="pilot.cruise?.min || pilot.cruise?.max">
                        <common-info-block
                            text-align="center"
                            class="pilot__card"
                            :top-items="['Stepclimbs', 'Min to max']"
                            :bottom-items="[pilot.cruise?.min, pilot.cruise?.planned, pilot.cruise?.max]"
                        />
                    </div>
                </template>
                <div class="pilot__info" v-if="pilot.flight_plan.route">
                    <div class="pilot__info_left">
                        <div class="pilot__info__title">
                            Route
                        </div>
                        <common-button type="link" class="pilot__info__copy" @click="copyText(pilot.flight_plan.route)">
                            Copy
                        </common-button>
                    </div>
                    <textarea :value="pilot.flight_plan.route" readonly class="pilot__info_textarea"/>
                </div>
                <div class="pilot__info" v-if="pilot.flight_plan.remarks">
                    <div class="pilot__info_left">
                        <div class="pilot__info__title">
                            Remarks
                        </div>
                        <common-button
                            type="link"
                            class="pilot__info__copy"
                            @click="copyText(pilot.flight_plan.remarks)"
                        >
                            Copy
                        </common-button>
                    </div>
                    <textarea :value="pilot.flight_plan.remarks" readonly class="pilot__info_textarea"/>
                </div>
            </div>
        </template>
    </common-info-popup>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { StoreOverlayPilot } from '~/store';
import { useStore } from '~/store';
import type { InfoPopupSection } from '~/components/common/CommonInfoPopup.vue';
import type { ColorsList } from '~/modules/styles';
import { copyText, getHoursAndMinutes } from '../../../utils';
import { getPilotTrueAltitude } from '~/utils/shared/vatsim';
import type { VatsimExtendedPilot } from '~/types/data/vatsim';

const props = defineProps({
    overlay: {
        type: Object as PropType<StoreOverlayPilot>,
        required: true,
    },
});

const store = useStore();

const datetime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
});

const pilot = computed(() => props.overlay.data.pilot);
const stats = computed(() => props.overlay.data.stats);
const showAtc = ref(pilot.value.cid.toString() === store.user?.cid);
const svg = shallowRef<null | any>(null);
const dataStore = useDataStore();

const depAirport = computed(() => {
    return dataStore.vatspy.value?.data.airports.find(x => x.icao === pilot.value.flight_plan?.departure);
});

const arrAirport = computed(() => {
    return dataStore.vatspy.value?.data.airports.find(x => x.icao === pilot.value.flight_plan?.arrival);
});

async function loadAirlineSvg() {
    svg.value = await import((`../../../assets/icons/aircrafts/${ getAircraftIcon(pilot.value).icon }.svg?component`));
}

loadAirlineSvg();

const sections = computed<InfoPopupSection[]>(() => {
    const sections: InfoPopupSection[] = [
        {
            key: 'atc',
        },
        {
            key: 'flight',
            title: 'Current Flight Details',
            collapsible: true,
        },
    ];

    if (pilot.value.flight_plan) {
        sections.push({
            key: 'flightplan',
            title: 'Flight Plan',
            collapsible: true,
        });
    }

    sections.push({
        key: 'buttons',
    });

    return sections;
});

const getStatus = computed<{ color: ColorsList, title: string }>(() => {
    switch (pilot.value.status) {
        case 'depGate':
            return {
                color: 'success500',
                title: 'Departing | At gate',
            };
        case 'depTaxi':
            return {
                color: 'success500',
                title: 'Departing | Taxi',
            };
        case 'departed':
            return {
                color: 'warning500',
                title: 'Departed',
            };
        case 'enroute':
            return {
                color: 'primary500',
                title: 'Enroute',
            };
        case 'cruising':
            return {
                color: 'primary500',
                title: 'Cruising',
            };
        case 'climbing':
            return {
                color: 'primary400',
                title: 'Climbing',
            };
        case 'descending':
            return {
                color: 'primary600',
                title: 'Descending',
            };
        case 'arriving':
            return {
                color: 'warning600',
                title: 'Arriving',
            };
        case 'arrTaxi':
            return {
                color: 'error500',
                title: 'Arrived | Taxi',
            };
        case 'arrGate':
            return {
                color: 'error500',
                title: 'Arrived | At gate',
            };
        default:
            return {
                color: 'neutral1000',
                title: 'Status unknown',
            };
    }
});

watch(dataStore.vatsim.updateTimestamp, async () => {
    props.overlay.data.pilot = await $fetch<VatsimExtendedPilot>(`/data/vatsim/pilot/${ props.overlay.key }`);
});
</script>

<style scoped lang="scss">
.pilot {
    &_header {
        font-family: $openSansFont;
        color: $primary500;
        font-size: 17px;
        font-weight: 700;
    }

    &__content {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    &__self {
        display: flex;
        align-items: center;
        gap: 16px;
        font-size: 13px;
        font-weight: 700;

        .pilot__card {
            width: 100%;
        }
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
                    color: var(--color);
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

    &__cols {
        display: flex;
        gap: 8px;

        > * {
            width: 100%;
        }
    }

    &__title {
        text-align: center;
        font-weight: 600;
        font-size: 13px;
    }

    &__info {
        display: grid;
        grid-template-columns: 20% 75%;
        justify-content: space-between;

        &_left {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        &__title {
            font-weight: 600;
            font-size: 12px;
        }

        &_textarea {
            appearance: none;
            box-shadow: none;
            outline: none;
            border: none;
            border-radius: 4px;
            background: $neutral950;
            font-size: 11px;
            color: $neutral150;
            resize: vertical;
            padding: 8px;
            scrollbar-gutter: stable;
        }
    }
}
</style>
