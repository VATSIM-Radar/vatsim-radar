<template>
    <div
        class="flight-info"
        :style="{ '--percent': `${ !distance?.toGoPercent || distance?.toGoPercent < 0 ? pilot.status === 'arrTaxi' ? 100 : 0 : distance?.toGoPercent }%` , '--status-color': radarColors[getStatus.color] }"
    >
        <ui-data-container>
            <template #icon>
                <user-icon/>
            </template>

            <ui-data-list
                circle-divider
                :items="[
                    { key: 'name', text: pilot.name },
                    { key: 'cid', text: pilot.cid },
                    { key: 'comment', text: friend?.comment },
                    { key: 'stats', text: 'stats' },
                    { key: 'favorite', text: Number(!!store.user) },
                ]"
            >
                <template #item-name="{ item }">
                    <ui-spoiler type="pilot">
                        {{item.text}}
                    </ui-spoiler>
                </template>
                <template #item-cid="{ item }">
                    <ui-spoiler
                        is-cid
                        type="pilot"
                    >
                        <ui-bubble
                            text-type="caption"
                            type="primary-flat"
                        >
                            {{item.text}}
                        </ui-bubble>
                    </ui-spoiler>
                </template>
                <template #item-favorite>
                    <settings-favorite-list
                        :cid="pilot.cid"
                        class="flight-info_self_favorite"
                        :icon-size="12"
                        is-popup
                        :name="pilot.name"
                    />
                </template>
                <template #item-stats>
                    <ui-button
                        :href="`https://stats.vatsim.net/stats/${ pilot.cid }`"
                        icon-width="14"
                        target="_blank"
                        type="link"
                    >
                        <template #icon>
                            <stats-icon width="14"/>
                        </template>
                    </ui-button>
                </template>
            </ui-data-list>

            <ui-data-list
                circle-divider
                class="flight-info__secondary"
                gap="0px 16px"
                :items="[
                    ...usePilotRating(pilot, false, true).map(x => ({ text: x })),
                    { key: 'hours', text: stats?.pilot },
                    { key: 'atc-hours', text: stats?.atc },
                ]"
            >
                <template #item-hours="{ item }">
                    <span class="flight-info__chip">
                        Flight Hours: <ui-chip text-type="3b-medium-alt">{{numberFormatter.format(+item.text!)}}</ui-chip>
                    </span>
                </template>
                <template #item-atc-hours="{ item }">
                    <span class="flight-info__chip">
                        ATC Hours: <ui-chip text-type="3b-medium-alt">{{numberFormatter.format(+item.text!)}}</ui-chip>
                    </span>
                </template>
            </ui-data-list>
        </ui-data-container>
        <ui-data-container v-if="airline">
            <template #icon>
                <airline-icon/>
            </template>

            <div class="flight-info__columns">
                <template v-if="airline">
                    <ui-data-list-item>
                        {{airline.name}}

                        <ui-data-list
                            circle-divider
                            class="flight-info__secondary"
                            :items="[{ text: airline.icao }, { text: airline.callsign }, { key: 'virtual', text: Number(!!airline.virtual) }]"
                        >
                            <template #item-virtual>
                                <ui-text
                                    :href="airline.website ?? undefined"
                                    target="_blank"
                                    type="caption-light"
                                >
                                    <ui-bubble
                                        text-type="caption-light"
                                        type="primary-flat"
                                    >
                                        <span :class="airline.website ? '__link' : ''">
                                            VIRTUAL
                                        </span>
                                    </ui-bubble>
                                </ui-text>
                            </template>
                        </ui-data-list>
                    </ui-data-list-item>
                    <ui-separator
                        dashed
                        distance="0"
                        full
                    />
                </template>
            </div>
        </ui-data-container>
        <div class="flight-info__progress">
            <ui-text
                class="flight-info__progress_title"
                type="caption"
            >
                {{getStatus.title}}
            </ui-text>
            <div class="flight-info__progress_line">
                <ui-text
                    class="flight-info__progress_line_airport"
                    :class="{ 'flight-info__progress_line_airport--disabled': !depAirport }"
                    type="h5"
                    @click="depAirport && mapStore.addAirportOverlay(depAirport.icao)"
                >
                    {{depAirport?.icao ?? 'ZZZZ'}}
                </ui-text>
                <div class="flight-info__progress__line">
                    <div class="flight-info__progress__line_svg">
                        <span
                            v-if="svg"
                            v-html="reColorSvg(svg, 'neutral')"
                        />
                        <aircraft-icon v-else/>
                    </div>
                </div>
                <ui-text
                    class="flight-info__progress_line_airport"
                    :class="{ 'flight-info__progress_line_airport--disabled': !arrAirport }"
                    type="h5"
                    @click="arrAirport && mapStore.addAirportOverlay(arrAirport.icao)"
                >
                    {{arrAirport?.icao ?? 'ZZZZ'}}
                </ui-text>
            </div>
            <ui-text
                class="flight-info__progress_footer"
                type="caption"
            >
                <div
                    class="flight-info__progress_footer_section flight-info__progress_footer_section--initial"
                >
                    <template v-if="departedAt || distance?.depDist && pilot.status !== 'depTaxi' && pilot.status !== 'depGate'">
                        <div class="flight-info__progress_footer__item">
                            <ui-chip>
                                {{departedAt ? `${ datetime.format(new Date(departedAt)) }z` : `${ Math.round(distance!.depDist ?? 0) } NM`}}
                            </ui-chip>
                        </div>
                        <ui-separator
                            distance="0"
                            horizontal
                        />
                    </template>
                    <div class="flight-info__progress_footer__item">
                        Online
                        <ui-chip>
                            {{ getLogonTime }}
                        </ui-chip>
                    </div>
                    <ui-separator
                        v-if="(distance?.toGoTime || distance?.toGoDist || arrivedAt)"
                        distance="0"
                        horizontal
                    />
                    <div
                        v-if="distance?.toGoTime || distance?.toGoDist || arrivedAt"
                        class="flight-info__progress_footer__item"
                    >
                        <ui-chip>
                            <template v-if="arrivedAt">
                                {{datetime.format(new Date(arrivedAt))}}z
                            </template>
                            <template v-else-if="pilot.status === 'depTaxi' || pilot.status === 'depGate' || !distance?.toGoTime">
                                {{Math.round(distance?.toGoDist ?? 0)}} NM
                            </template>
                            <template v-else>
                                {{ datetime.format(new Date(distance?.toGoTime! || 0))?.toUpperCase() }}z
                            </template>
                        </ui-chip>
                    </div>
                </div>
                <div
                    v-if="!isPilotOnGround(pilot)"
                    class="flight-info__progress_footer_section flight-info__progress_footer_section--additional"
                >
                    <template v-if="distance?.depDist && pilot.status !== 'depTaxi' && pilot.status !== 'depGate'">
                        <div class="flight-info__progress_footer__item">
                            <ui-chip>
                                {{`${ Math.round(distance!.depDist ?? 0) } NM`}}
                            </ui-chip>
                        </div>
                        <ui-separator
                            distance="0"
                            horizontal
                        />
                    </template>
                    <div
                        v-if="distance?.toGoDist"
                        class="flight-info__progress_footer__item"
                    >
                        <ui-chip>
                            {{Math.round(distance.toGoDist)}} NM
                        </ui-chip>
                    </div>
                    <ui-separator
                        v-if="distance?.toGoTime && pilot.status !== 'depTaxi' && pilot.status !== 'depGate'"
                        distance="0"
                        horizontal
                    />
                    <div
                        v-if="distance?.toGoTime && pilot.status !== 'depTaxi' && pilot.status !== 'depGate'"
                        class="flight-info__progress_footer__item"
                    >
                        <ui-chip>
                            {{ getTimeRemains(new Date(distance.toGoTime!)) }}
                        </ui-chip>
                    </div>
                </div>
            </ui-text>
        </div>
        <ui-data-container>
            <template #icon>
                <aircraft-icon/>
            </template>
            <ui-data-list
                :grid-columns="pilot.vertical_speed ? 4 : 3"
                :items="[
                    { title: pilot.vertical_speed ? 'GS' : 'Ground Speed', text: `${ pilot.groundspeed ?? 0 } kts` },
                    { title: 'Altitude', text: `${ numberFormatter.format(getPilotTrueAltitude(pilot)) } ft` },
                    { title: 'Heading', text: `${ pilot.heading }°` },
                    { title: !pilot.vertical_speed ? undefined : 'VS', tooltip: 'Vertical Speed', text: !pilot.vertical_speed ? undefined : `${ pilot.vertical_speed > 0 ? '↑' : '↓' } ${ Math.round(Math.abs(pilot.vertical_speed ?? 0) / 100) }00` },
                ]"
            />
            <ui-data-list
                :grid-columns="ctaf && !pilot.frequencies.some(x => x === ctaf) && pilot.frequencies.length >= 2 ? 4 : 3"
                :items="[
                    { key: 'squawk', title: 'Squawk' },
                    { key: 'ctaf', title: ctaf && !pilot.frequencies.some(x => x === ctaf) ? 'CTAF' : undefined },
                    { title: pilot.frequencies[0] ? 'COM1' : undefined, text: pilot.frequencies[0] },
                    { title: pilot.frequencies[1] ? 'COM2' : undefined, text: pilot.frequencies[1] },
                ]"
            >
                <template #item-squawk>
                    <ui-data-list
                        circle-divider
                        :items="[{ text: pilot.transponder ?? '' }, { text: canShowRightTransponder ? pilot.flight_plan?.assigned_transponder : undefined }]"
                    />
                </template>
                <template #item-ctaf>
                    {{ctaf}}
                </template>
            </ui-data-list>
        </ui-data-container>
    </div>
</template>

<script setup lang="ts">
import UiButton from '~/components/ui/buttons/UiButton.vue';
import {
    fetchAircraftSvgIcon,
    getAircraftDistance,
    getPilotStatus,
    reColorSvg,
} from '~/composables/vatsim/pilots';
import StatsIcon from 'assets/icons/kit/stats.svg?component';
import type { VatsimExtendedPilot } from '~/types/data/vatsim';
import type { PropType } from 'vue';
import { getHoursAndMinutes } from '~/utils';
import { useMapStore } from '~/store/map';
import UserIcon from '~/assets/icons/kit/user.svg?component';
import AirlineIcon from '~/assets/icons/kit/airline.svg?component';
import AircraftIcon from '~/assets/icons/kit/aircraft.svg?component';
import SettingsFavoriteList from '~/components/features/settings/SettingsFavoriteList.vue';
import { getAirlineFromCallsign } from '~/composables';
import UiBubble from '~/components/ui/data/UiBubble.vue';
import { useStore } from '~/store';
import type { RadarDataAirline } from '~/utils/server/storage';
import UiDataList from '~/components/ui/data/UiDataList.vue';
import UiDataContainer from '~/components/ui/data/UiDataContainer.vue';
import UiChip from '~/components/ui/text/UiChip.vue';
import UiDataListItem from '~/components/ui/data/UiDataListItem.vue';
import UiSeparator from '~/components/ui/data/UiSeparator.vue';
import UiText from '~/components/ui/text/UiText.vue';
import { getPilotTrueAltitude } from '~/utils/shared/vatsim';
import UiSpoiler from '~/components/ui/text/UiSpoiler.vue';

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
    ctaf: {
        type: String as PropType<string | null | undefined>,
        default: null,
    },
});

const mapStore = useMapStore();
const store = useStore();

const getLogonTime = computed(() => {
    return getHoursAndMinutes(new Date(props.pilot.logon_time || 0).getTime());
});

const canShowRightTransponder = computed(() => {
    return props.pilot.flight_plan?.assigned_transponder && props.pilot.flight_plan?.assigned_transponder !== props.pilot.transponder && props.pilot.flight_plan?.assigned_transponder !== '0000';
});

const depAirport = computed(() => {
    return getAirportByIcao(props.pilot.flight_plan?.departure ?? props.pilot.airport);
});

const arrAirport = computed(() => {
    return getAirportByIcao(props.pilot.flight_plan?.arrival);
});

const airline = shallowRef<RadarDataAirline | null>(null);
const friend = computed(() => store.friends.find(x => x.cid === props.pilot.cid));

watch(() => `${ props.pilot.callsign }-${ props.pilot?.flight_plan?.remarks }`, async () => {
    airline.value = await getAirlineFromCallsign(props.pilot.callsign, props.pilot.flight_plan?.remarks);
}, {
    immediate: true,
});

const dataStore = useDataStore();

const departedAt = computed(() => props.pilot.flight_plan?.departed_at || dataStore.vatsim.tracksPilotsData.value[props.pilot.cid]?.departedAt);
const arrivedAt = computed(() => props.pilot.flight_plan?.arrived_at || dataStore.vatsim.tracksPilotsData.value[props.pilot.cid]?.arrivedAt);

const numberFormatter = new Intl.NumberFormat('ru-RU');

const datetime = computed(() => new Intl.DateTimeFormat('en-GB', {
    hourCycle: getKeyedValueFromSettings('appearance.timeFormat') === '12h' ? 'h12' : 'h23',
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
}));

const distance = computed(() => getAircraftDistance(props.pilot));

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

        svg.value = await fetchAircraftSvgIcon(icon.icon);
    }, {
        immediate: true,
    });
});

// eslint-disable-next-line vue/no-setup-props-reactivity-loss
const { data: stats } = useLazyAsyncData(`stats-pilot-${ props.pilot.cid }`, () => getVATSIMMemberStats(props.pilot, 'both'));
</script>

<style scoped lang="scss">
.flight-info {
    display: flex;
    flex-direction: column;
    gap: 20px;

    &__chip {
        display: flex;
        gap: 4px;
        align-items: center;
    }

    &__secondary :deep(.text) {
        font-weight: normal !important;

        &:not(.bubble, .chip){
            color: $typographySecondary
        }
    }

    &__columns {
        display: flex;
        gap: 20px;
        align-items: center;
    }

    &__progress {
        display: flex;
        flex-direction: column;
        gap: 2px;
        align-items: center;

        margin: 0 calc(var(--horizontal-padding) * -1);
        padding: 8px;
        border: dashed $strokeDefault;
        border-width: 1px 0;

        background: $backgroundLevel1;

        &_title {
            display: flex;
            align-items: center;
            height: 20px;
            color: var(--status-color);
        }

        &_line {
            display: flex;
            gap: 16px;
            align-items: center;
            width: 100%;

            &_airport:not(&--disabled) {
                cursor: pointer;

                @include hover {
                    transition: 0.3s;

                    &:hover {
                        color: $blue500;
                    }
                }
            }
        }

        &__line {
            position: relative;

            display: flex;
            flex-grow: 1;
            align-items: center;

            height: 2px;

            background: $backgroundLevel5;

            &::before {
                content: '';

                position: absolute;
                inset: 0;

                width: var(--percent);
                height: 100%;

                background: $blue500;
            }

            &, &::before {
                border-radius: 9999px;
            }

            &_svg {
                position: absolute;
                left: var(--percent);
                transform: translateX(-50%) rotate(90deg);

                :deep(svg) {
                    width: 16px;
                }
            }
        }

        &_footer {
            overflow: visible;
            height: 20px;
            color: $typographySecondary;

            &_section {
                position: relative;
                top: 0;

                display: flex;
                gap: 8px;
                align-items: center;
                justify-content: center;

                height: 20px;

                transition: 0.3s ease-in-out;

                :deep(.separator) {
                    width: 6px;
                }

                &--additional {
                    z-index: 1;
                    top: 0;
                    visibility: hidden;
                    opacity: 0;
                }
            }

            &:hover, &:active {
                .flight-info__progress_footer_section--initial:not(:only-child) {
                    top: 20px;
                    height: 0;
                    visibility: hidden;
                    opacity: 0;
                }

                .flight-info__progress_footer_section--additional {
                    top: 0;
                    visibility: visible;
                    opacity: 1;
                }
            }

            &__item {
                display: flex;
                gap: 8px;
                align-items: center;
            }
        }
    }
}
</style>
