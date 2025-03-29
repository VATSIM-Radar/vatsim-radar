<template>
    <div
        class="flight-info"
        :style="{ '--percent': `${ pilot.toGoPercent ?? 0 }%` , '--status-color': radarColors[getStatus.color] }"
    >
        <div class="flight-info_self">
            <div>Pilot</div>
            <common-info-block
                :bottom-items="[...usePilotRating(pilot), stats ? `${ stats }h total time` : undefined]"
                class="flight-info__card"
                :top-items="[parseEncoding(pilot.name), pilot.cid]"
            >
                <template #top="{ item, index }">
                    <common-spoiler
                        :is-cid="index === 1"
                        type="pilot"
                    >
                        {{ item }}
                    </common-spoiler>
                </template>
            </common-info-block>
            <common-button
                v-if="showStats"
                class="flight-info_self_stats"
                :href="`https://stats.vatsim.net/stats/${ pilot.cid }`"
                target="_blank"
                type="link"
            >
                <template #icon>
                    <dashboard-icon/>
                </template>
            </common-button>
            <common-favorite-list
                v-if="store.user"
                :cid="pilot.cid"
                class="flight-info_self_favorite"
                :name="pilot.name"
            />
        </div>
        <div
            v-if="airline"
            class="flight-info_self"
        >
            <div>Airline</div>
            <common-info-block
                :bottom-items="[airline.icao, airline.callsign, airline.virtual ? '1' : null]"
                class="flight-info__card flight-info__card--airline"
                :top-items="[airline.name]"
            >
                <template #top="{ item }">
                    <span :title="item as string">
                        {{ item }}
                    </span>
                </template>
                <template #bottom="{ item, index }">
                    <common-bubble
                        :is="airline.website ? 'a' : 'div'"
                        v-if="index === 2"
                        :href="airline.website"
                        target="_blank"
                    >
                        Virtual Airline
                    </common-bubble>
                    <template v-else>
                        {{ item }}
                    </template>
                </template>
            </common-info-block>
        </div>
        <common-info-block
            :key="dataStore.vatsim.updateTimestamp.value.toString()"
            class="flight-info__card"
        >
            <template #top>
                <div class="flight-info__card_route">
                    <div
                        :key="String(depAirport) + String(arrAirport) + getStatus.title"
                        class="flight-info__card_route_header"
                    >
                        <component
                            :is="(depAirport && !showStats) ? CommonButton : 'div'"
                            class="flight-info__card_route_header_airport flight-info__card_route_header_airport--dep"
                            type="link"
                            @click="depAirport && mapStore.addAirportOverlay(depAirport.icao)"
                        >
                            {{
                                (pilot.flight_plan?.departure || ((pilot.status === 'depTaxi' || pilot.status === 'depGate') && pilot.airport)) || ''
                            }}
                        </component>
                        <div
                            class="flight-info__card_route_header_status"
                        >
                            {{ getStatus.title }}
                        </div>
                        <component
                            :is="(arrAirport && !showStats) ? CommonButton : 'div'"
                            class="flight-info__card_route_header_airport flight-info__card_route_header_airport--arr"
                            type="link"
                            @click="arrAirport && mapStore.addAirportOverlay(arrAirport.icao)"
                        >
                            {{ pilot.flight_plan?.arrival || '' }}
                        </component>
                    </div>
                    <div
                        v-show="pilot.toGoPercent && !pilot.isOnGround && pilot.flight_plan?.aircraft_faa && svg"
                        class="flight-info__card_route_line"
                        :class="{
                            'flight-info__card_route_line--start': pilot.toGoPercent && pilot.toGoPercent < 10,
                            'flight-info__card_route_line--end': pilot.toGoPercent && pilot.toGoPercent > 90,
                        }"
                        v-html="svg ? reColorSvg(svg, 'neutral') : '<div></div>'"
                    />
                    <div class="flight-info__card_route_footer">
                        <div class="flight-info__card_route_footer_left">
                            {{
                                (pilot.depDist && pilot.status !== 'depTaxi' && pilot.status !== 'depGate') ? `${ Math.round(pilot.depDist) } NM,` : ''
                            }} Online
                            <span v-if="pilot.logon_time">
                                {{ getLogonTime }}
                            </span>
                        </div>
                        <div
                            v-if="getDistAndTime"
                            class="flight-info__card_route_footer_right"
                        >
                            {{ getDistAndTime }}
                        </div>
                    </div>
                </div>
            </template>
        </common-info-block>
        <div class="flight-info__cols">
            <common-info-block
                :bottom-items="[`${ pilot.groundspeed ?? 0 } kts`]"
                class="flight-info__card"
                text-align="center"
                title="Ground Speed"
                :top-items="['GS']"
            />
            <common-info-block
                :bottom-items="[`${ getPilotTrueAltitude(pilot) } ft`]"
                class="flight-info__card"
                text-align="center"
                :title="pilot.altitude"
                :top-items="['Altitude']"
            />
            <common-info-block
                :bottom-items="[`${ pilot.heading }°`]"
                class="flight-info__card"
                text-align="center"
                :top-items="['Heading']"
            />
        </div>
        <div
            v-if="pilot.transponder || pilot.flight_plan?.assigned_transponder"
            class="flight-info__cols"
        >
            <common-info-block
                :bottom-items="[
                    `${ pilot.transponder || 'None' }`,
                    canShowRightTransponder ? pilot.flight_plan?.assigned_transponder : undefined,
                ]"
                class="flight-info__card"
                text-align="center"
                :top-items="['Squawk']"
            >
                <template #top>
                    <common-tooltip
                        :location="pilot.frequencies.length ? 'right' : 'bottom'"
                        width="150px"
                    >
                        <template #activator>
                            <div class="flight-info__card_question">
                                Squawk

                                <question-icon width="14"/>
                            </div>
                        </template>

                        The left value is currently set on the aircraft,<br> while the right value was assigned by ATC.

                        <template v-if="!canShowRightTransponder">
                            <br><br>

                            You don't see the right value because it might be the same as the set value or a squawk may not have been assigned.
                        </template>
                    </common-tooltip>
                </template>
            </common-info-block>
            <common-info-block
                v-for="(frequency, index) in pilot.frequencies"
                :key="frequency+index"
                align-items="space-evenly"
                :bottom-items="[frequency]"
                class="flight-info__card"
                text-align="center"
                :top-items="[`COM${ index+1 }`]"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { parseEncoding } from '~/utils/data';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import { fetchAircraftIcon, getPilotStatus, reColorSvg } from '~/composables/pilots';
import { getPilotTrueAltitude } from '~/utils/shared/vatsim';
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';
import type { VatsimExtendedPilot } from '~/types/data/vatsim';
import type { PropType } from 'vue';
import { getHoursAndMinutes } from '~/utils';
import { useMapStore } from '~/store/map';
import DashboardIcon from '@/assets/icons/kit/dashboard.svg?component';
import CommonTooltip from '~/components/common/basic/CommonTooltip.vue';
import QuestionIcon from 'assets/icons/basic/question.svg?component';
import CommonSpoiler from '~/components/common/vatsim/CommonSpoiler.vue';
import CommonFavoriteList from '~/components/common/vatsim/CommonFavoriteList.vue';
import { getAirlineFromCallsign } from '~/composables';
import CommonBubble from '~/components/common/basic/CommonBubble.vue';
import { useStore } from '~/store';
import { useError } from '~/composables/errors';

const props = defineProps({
    pilot: {
        type: Object as PropType<VatsimExtendedPilot>,
        required: true,
    },
    isOffline: {
        type: Boolean,
        default: false,
    },
    showStats: {
        type: Boolean,
        default: false,
    },
});

const dataStore = useDataStore();
const mapStore = useMapStore();
const store = useStore();

const getLogonTime = computed(() => {
    return getHoursAndMinutes(new Date(props.pilot.logon_time || 0).getTime());
});

const canShowRightTransponder = computed(() => {
    return props.pilot.flight_plan?.assigned_transponder && props.pilot.flight_plan?.assigned_transponder !== props.pilot.transponder && props.pilot.flight_plan?.assigned_transponder !== '0000';
});

const depAirport = computed(() => {
    return getAirportByIcao(props.pilot.flight_plan?.departure);
});

const arrAirport = computed(() => {
    return getAirportByIcao(props.pilot.flight_plan?.arrival);
});

const airline = computed(() => getAirlineFromCallsign(props.pilot.callsign, props.pilot.flight_plan?.remarks));

const datetime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
});

const getDistAndTime = computed(() => {
    try {
        if (!props.pilot.toGoDist || !props.pilot.toGoTime) return null;

        const dist = Math.round(props.pilot.toGoDist);
        const goTime = new Date(props.pilot.toGoTime!);
        const date = datetime.format(goTime);

        return `${ dist } NM at ${ date }Z in ${ getTimeRemains(goTime) }`;
    }
    catch (e) {
        useError(e);
        return null;
    }
});

const getStatus = computed(() => {
    return getPilotStatus(props.pilot.status, props.isOffline);
});

const svg = shallowRef<string | null>(null);

onMounted(() => {
    watch(() => props.pilot.flight_plan?.aircraft_short, async val => {
        if (!val) {
            svg.value = null;
            return;
        }

        const icon = getAircraftIcon(props.pilot);
        if (!icon) return;

        svg.value = await fetchAircraftIcon(icon.icon);
    }, {
        immediate: true,
    });
});

// eslint-disable-next-line vue/no-setup-props-reactivity-loss
const { data: stats } = useLazyAsyncData(`stats-pilot-${ props.pilot.cid }`, () => getVATSIMMemberStats(props.pilot, 'pilot'));
</script>

<style scoped lang="scss">
.flight-info {
    &_self {
        display: flex;
        gap: 16px;
        align-items: center;

        font-size: 13px;
        font-weight: 700;

        .flight-info__card {
            flex: 1 1 0;
            width: 0;

            &--airline {
                :deep(.info-block_top) {
                    flex-wrap: nowrap;

                    .info-block__content {
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                }
            }
        }
    }

    &__card {
        &_question {
            display: flex;
            gap: 4px;
            align-items: center;
            justify-content: center;
        }

        &_route {
            display: flex;
            flex-direction: column;
            gap: 4px;

            &_header {
                display: flex;
                gap: 8px;
                justify-content: space-between;

                &, & .button {
                    font-size: 13px;
                    font-weight: 600;
                }

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

                :deep(svg) {
                    position: relative;
                    z-index: 1;
                    left: var(--percent);
                    transform: translateX(-50%) rotate(90deg);

                    height: 24px;
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

    &__cols {
        display: flex;
        gap: 4px;

        > * {
            flex: 1 1 0;
            width: 0;
        }
    }
}
</style>
