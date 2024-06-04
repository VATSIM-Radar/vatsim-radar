<template>
    <common-info-popup
        v-if="overlay?.data?.pilot"
        v-model:collapsed="overlay.collapsed"
        class="pilot"
        collapsible
        :header-actions="store.config.airports ? ['sticky'] : ['sticky', 'track']"
        max-height="100%"
        model-value
        :style="{ '--percent': `${ pilot.toGoPercent ?? 0 }%`, '--status-color': radarColors[getStatus.color] }"
        :tabs="{
            info: {
                title: 'Info',
                sections,
            },
            atc: {
                title: 'ATC',
                sections: atcSections,
                disabled: !atcSections.length,
            },
        }"
        @update:modelValue="!$event ? mapStore.overlays = mapStore.overlays.filter(x => x.id !== overlay.id) : undefined"
    >
        <template #title>
            <div class="pilot-header pilot_header">
                <div class="pilot-header_title">
                    {{ pilot.callsign }}
                </div>
                <common-blue-bubble
                    v-if="pilot.flight_plan?.flight_rules !== 'I'"
                    class="pilot-header_type"
                    size="M"
                >
                    VFR
                </common-blue-bubble>
                <div
                    v-if="overlay.collapsed"
                    class="pilot_header_status"
                    :class="{ 'pilot_header_status--offline': isOffline }"
                />
                <div
                    v-if="overlay.collapsed"
                    class="pilot_header_line"
                />
            </div>
        </template>
        <template #action-sticky>
            <map-popup-pin-icon :overlay="overlay"/>
        </template>
        <template #action-track>
            <div
                title="Track aircraft"
                @click="props.overlay.data.tracked = !props.overlay.data.tracked"
            >
                <track-icon
                    class="pilot__track"
                    :class="{ 'pilot__track--tracked': props.overlay?.data.tracked }"
                    width="16"
                />
            </div>
        </template>
        <template
            v-for="i in ['center', 'atis', 'app', 'ground', 'ctaf']"
            :key="i"
            #[`atc-${i}`]="{ section }"
        >
            <div class="pilot__content">
                <!-- @vue-ignore -->
                <common-controller-info
                    :controllers="section.controllers"
                    show-atis
                    :show-facility="section.type === 'ground'"
                    small
                />
                <common-button
                    v-if="i === 'ctaf'"
                    href="https://my.vatsim.net/learn/frequently-asked-questions/section/140"
                    target="_blank"
                    type="link"
                >
                    Learn more about CTAF trial
                </common-button>
            </div>
        </template>
        <template #flight>
            <div class="pilot__content">
                <div class="pilot__self">
                    <div>Pilot</div>
                    <common-info-block
                        :bottom-items="[...usePilotRating(pilot), stats?.pilot ? `${ Math.floor(stats.pilot) }h total time` : undefined]"
                        class="pilot__card"
                        :top-items="[parseEncoding(pilot.name), pilot.cid]"
                    />
                </div>
                <common-info-block class="pilot__card">
                    <template #top>
                        <div class="pilot__card_route">
                            <div class="pilot__card_route_header">
                                <component
                                    :is="depAirport ? CommonButton : 'div'"
                                    class="pilot__card_route_header_airport pilot__card_route_header_airport--dep"
                                    type="link"
                                    @click="depAirport && mapStore.addAirportOverlay(depAirport.icao)"
                                >
                                    {{
                                        (pilot.flight_plan?.departure || ((pilot.status === 'depTaxi' || pilot.status === 'depGate') && pilot.airport)) || ''
                                    }}
                                </component>
                                <div
                                    class="pilot__card_route_header_status"
                                >
                                    {{ getStatus.title }}
                                </div>
                                <component
                                    :is="arrAirport ? CommonButton : 'div'"
                                    class="pilot__card_route_header_airport pilot__card_route_header_airport--arr"
                                    type="link"
                                    @click="arrAirport && mapStore.addAirportOverlay(arrAirport.icao)"
                                >
                                    {{ pilot.flight_plan?.arrival || '' }}
                                </component>
                            </div>
                            <div
                                v-show="pilot.toGoPercent && !pilot.isOnGround && pilot.flight_plan?.aircraft_faa && svg"
                                class="pilot__card_route_line"
                                :class="{
                                    'pilot__card_route_line--start': pilot.toGoPercent && pilot.toGoPercent < 10,
                                    'pilot__card_route_line--end': pilot.toGoPercent && pilot.toGoPercent > 90,
                                }"
                                v-html="svg ? reColorSvg(svg, 'neutral') : ''"
                            />
                            <common-button
                                class="pilot__card_route_open"
                                type="link"
                                @click="viewRoute"
                            >
                                View route
                            </common-button>
                            <div class="pilot__card_route_footer">
                                <div class="pilot__card_route_footer_left">
                                    {{
                                        (pilot.depDist && pilot.status !== 'depTaxi' && pilot.status !== 'depGate') ? `${ Math.round(pilot.depDist) } NM,` : ''
                                    }} Online
                                    <span v-if="pilot.logon_time">
                                        {{ getLogonTime }}
                                    </span>
                                </div>
                                <div
                                    v-if="getDistAndTime"
                                    class="pilot__card_route_footer_right"
                                >
                                    {{ getDistAndTime }}
                                </div>
                            </div>
                        </div>
                    </template>
                </common-info-block>
                <div
                    v-if="pilot.transponder || pilot.flight_plan?.assigned_transponder"
                    class="pilot__cols"
                >
                    <common-info-block
                        :bottom-items="[pilot.transponder || 'None']"
                        class="pilot__card"
                        text-align="center"
                        :top-items="['Squawk set']"
                    />
                    <common-info-block
                        :bottom-items="[pilot.flight_plan?.assigned_transponder || 'None']"
                        class="pilot__card"
                        text-align="center"
                        :top-items="['Squawk assigned']"
                    />
                </div>
                <div class="pilot__cols">
                    <common-info-block
                        :bottom-items="[`${ pilot.groundspeed ?? 0 } kts`]"
                        class="pilot__card"
                        text-align="center"
                        title="Ground Speed"
                        :top-items="['GS']"
                    />
                    <common-info-block
                        :bottom-items="[`${ getPilotTrueAltitude(pilot) } ft`]"
                        class="pilot__card"
                        text-align="center"
                        :title="pilot.altitude"
                        :top-items="['Altitude']"
                    />
                    <common-info-block
                        :bottom-items="[`${ pilot.heading }°`]"
                        class="pilot__card"
                        text-align="center"
                        :top-items="['Heading']"
                    />
                </div>
            </div>
        </template>
        <template #flightplan>
            <map-popup-flight-plan
                v-if="pilot.flight_plan"
                class="pilot__content"
                :cruise="pilot.cruise"
                :flight-plan="pilot.flight_plan"
                :status="pilot.status ?? null"
            />
        </template>
        <template #buttons>
            <common-button-group>
                <common-button
                    :disabled="store.config.hideAllExternal"
                    @click="overlay.data.tracked = !overlay.data.tracked"
                >
                    <template #icon>
                        <track-icon
                            class="pilot__track pilot__track--in-action"
                            :class="{ 'pilot__track--tracked': props.overlay?.data.tracked }"
                        />
                    </template>
                    Track
                </common-button>
                <common-button
                    :disabled="overlay.data.tracked || store.config.hideAllExternal"
                    @click="showOnMap"
                >
                    <template #icon>
                        <map-icon/>
                    </template>
                    Focus
                </common-button>
                <common-button
                    :href="`https://stats.vatsim.net/stats/${ pilot.cid }`"
                    target="_blank"
                >
                    <template #icon>
                        <stats-icon/>
                    </template>
                    Stats
                </common-button>
                <common-button @click="copy.copy(`${ config.public.DOMAIN }/?pilot=${ pilot.cid }`)">
                    <template #icon>
                        <share-icon/>
                    </template>
                    <template v-if="copy.copyState.value">
                        Copied!
                    </template>
                    <template v-else>
                        Link
                    </template>
                </common-button>
            </common-button-group>
        </template>
    </common-info-popup>
</template>

<script setup lang="ts">
import type { PropType, ShallowRef } from 'vue';
import { useStore } from '~/store';
import CommonInfoPopup from '~/components/common/popup/CommonInfoPopup.vue';
import type { InfoPopupSection } from '~/components/common/popup/CommonInfoPopup.vue';
import { getHoursAndMinutes } from '../../../utils';
import { getPilotTrueAltitude } from '~/utils/shared/vatsim';
import type { VatsimExtendedPilot, VatsimShortenedController } from '~/types/data/vatsim';
import TrackIcon from 'assets/icons/kit/track.svg?component';
import MapIcon from '@/assets/icons/kit/map.svg?component';
import StatsIcon from '@/assets/icons/kit/stats.svg?component';
import ShareIcon from '@/assets/icons/kit/share.svg?component';
import type { Map } from 'ol';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { IFetchError } from 'ofetch';
import { fetchAircraftIcon, sortControllersByPosition, useFacilitiesIds } from '#imports';
import { getPilotStatus, reColorSvg, showPilotOnMap } from '~/composables/pilots';
import type { StoreOverlayPilot } from '~/store/map';
import { useMapStore } from '~/store/map';
import MapPopupFlightPlan from '~/components/map/popups/MapPopupFlightPlan.vue';
import { boundingExtent, getCenter } from 'ol/extent';
import MapPopupPinIcon from '~/components/map/popups/MapPopupPinIcon.vue';
import { useCopyText } from '~/composables';
import { parseEncoding } from '~/utils/data';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import CommonButtonGroup from '~/components/common/basic/CommonButtonGroup.vue';
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';
import CommonControllerInfo from '~/components/common/vatsim/CommonControllerInfo.vue';
import CommonBlueBubble from '~/components/common/basic/CommonBubble.vue';
import type { VatsimAirportInfo } from '~/utils/backend/vatsim';

const props = defineProps({
    overlay: {
        type: Object as PropType<StoreOverlayPilot>,
        required: true,
    },
});

const map = inject<ShallowRef<Map | null>>('map')!;
const copy = useCopyText();

const store = useStore();
const dataStore = useDataStore();
const mapStore = useMapStore();
const config = useRuntimeConfig();

const datetime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
});

const pilot = computed(() => props.overlay.data.pilot);
const stats = computed(() => props.overlay.data.stats);
const airportInfo = computed(() => {
    return props.overlay.data.airport;
});
const isOffline = ref(false);

const svg = shallowRef<string | null>(null);

const depAirport = computed(() => {
    return dataStore.vatspy.value?.data.airports.find(x => x.icao === pilot.value.flight_plan?.departure);
});

const arrAirport = computed(() => {
    return dataStore.vatspy.value?.data.airports.find(x => x.icao === pilot.value.flight_plan?.arrival);
});

const getDistAndTime = computed(() => {
    try {
        if (!pilot.value.toGoDist || !pilot.value.toGoTime) return null;

        const dist = Math.round(pilot.value.toGoDist);
        const date = datetime.format(new Date(pilot.value.toGoTime!));

        return `${ dist } NM in ${ date }Z`;
    }
    catch (e) {
        console.error(e);
        return null;
    }
});

const getLogonTime = computed(() => {
    return getHoursAndMinutes(new Date(pilot.value.logon_time || 0).getTime());
});

const showOnMap = () => {
    showPilotOnMap(pilot.value, map.value);
};

const viewRoute = () => {
    if (!depAirport.value || !arrAirport.value) return;
    const extent = boundingExtent([
        [depAirport.value.lon, depAirport.value.lat],
        [arrAirport.value.lon, arrAirport.value.lat],
    ]);

    props.overlay.data.tracked = false;

    const view = map.value?.getView();

    view?.animate({
        center: getCenter(extent),
        resolution: view?.getResolutionForExtent(extent) * 1.8,
    });
};

const atcSections = computed<InfoPopupSection[]>(() => {
    return getAtcList.value;
});

const sections = computed<InfoPopupSection[]>(() => {
    const sections: InfoPopupSection[] = [
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

type AtcPopupSection = InfoPopupSection & {
    type: 'center' | 'app' | 'ground' | 'atis';
    controllers: VatsimShortenedController[];
};

const facilities = useFacilitiesIds();

const getAtcList = computed<AtcPopupSection[]>(() => {
    const sections: AtcPopupSection[] = [];

    const center = pilot.value.firs
        ? dataStore.vatsim.data.firs.value.filter(x => pilot.value.firs!.includes(x.controller?.callsign ?? '')).map(x => x.controller!)
        : null;

    if (center?.length) {
        sections.push({
            type: 'center',
            controllers: center,
            title: 'Area Control',
            key: 'atc-center',
            collapsible: true,
            collapsedDefault: true,
            collapsedDefaultOnce: true,
        });
    }

    const controls = pilot.value.airport ? dataStore.vatsim.data.locals.value.filter(x => x.airport.icao === pilot.value.airport) : null;

    if (controls?.length) {
        const atis = controls.filter(x => x.isATIS).map(x => x.atc);
        let ground = controls.filter(x => !x.isATIS && x.atc.facility !== facilities.APP).map(x => x.atc);
        ground = sortControllersByPosition(ground);

        const app = controls.filter(x => !x.isATIS && x.atc.facility === facilities.APP).map(x => x.atc);

        if (atis.length) {
            sections.push({
                type: 'atis',
                controllers: atis,
                title: 'ATIS',
                key: 'atc-atis',
                collapsible: true,
                collapsedDefault: true,
                collapsedDefaultOnce: true,
            });
        }

        if (ground.length) {
            sections.push({
                type: 'ground',
                controllers: ground,
                title: 'Local Control',
                key: 'atc-ground',
                collapsible: true,
                collapsedDefault: true,
                collapsedDefaultOnce: true,
            });
        }

        if (app.length) {
            sections.push({
                type: 'app',
                controllers: app,
                title: 'Approach / Departure',
                key: 'atc-app',
                collapsible: true,
                collapsedDefault: true,
                collapsedDefaultOnce: true,
            });
        }
    }

    sections.sort((a, b) => {
        if (pilot.value.airport) {
            if (!pilot.value.isOnGround) {
                if (a.type === 'app' && b.type === 'app') return 0;
                if (a.type === 'app') return -1;
                if (b.type === 'app') return 1;
            }

            if (pilot.value.status === 'departed') {
                if (a.type === 'center' && b.type === 'center') return 0;
                if (a.type === 'center') return -1;
                if (b.type === 'center') return 1;
            }

            if ((a.type === 'ground' || a.type === 'atis') && (b.type === 'ground' || b.type === 'atis')) return 0;
            if (a.type === 'ground' || a.type === 'atis') return -1;
            if (b.type === 'ground' || b.type === 'atis') return 1;

            if (a.type === 'app' && b.type === 'app') return 0;
            return a.type === 'app' ? -1 : 1;
        }

        return 0;
    });

    if (!sections.length && airportInfo?.value?.ctafFreq) {
        return [{
            type: 'ground',
            controllers: [
                {
                    cid: Math.random(),
                    callsign: '',
                    facility: -1,
                    text_atis: null,
                    name: '',
                    logon_time: '',
                    rating: 0,
                    visual_range: 0,
                    frequency: airportInfo.value?.ctafFreq,
                },
            ],
            title: 'CTAF',
            key: 'atc-ctaf',
            collapsible: false,
        }];
    }

    return sections;
});

const getStatus = computed(() => {
    return getPilotStatus(pilot.value.status, isOffline.value);
});

watch(dataStore.vatsim.updateTimestamp, async () => {
    try {
        props.overlay.data.pilot = await $fetch<VatsimExtendedPilot>(`/api/data/vatsim/pilot/${ props.overlay.key }`);
        isOffline.value = false;
    }
    catch (e: IFetchError | any) {
        if (e) {
            isOffline.value = e.status === 404;
        }
    }
});

function handleMouseMove() {
    if (!props.overlay.data.tracked) return;
    map.value?.getView().animate({
        center: [pilot.value.longitude, pilot.value.latitude],
        duration: 300,
    });
}

watch(() => pilot.value.last_updated, handleMouseMove);
watch(() => props.overlay.data.tracked, val => {
    handleMouseMove();
    if (val) {
        mapStore.overlays.filter(x => x.type === 'pilot' && x.data.tracked && x.key !== pilot.value.cid.toString()).forEach(x => {
            (x as StoreOverlayPilot).data.tracked = false;
        });
    }
});

function handlePointerDrag() {
    props.overlay.data.tracked = false;
}

onMounted(() => {
    watch(() => pilot.value.flight_plan?.aircraft_short, async val => {
        if (!val) return;

        const icon = getAircraftIcon(pilot.value);
        if (!icon) return;

        svg.value = await fetchAircraftIcon(icon.icon);
    }, {
        immediate: true,
    });

    watch(() => pilot.value.airport, async icao => {
        if (airportInfo.value?.icao === icao) return;

        if (icao) {
            props.overlay.data.airport = await $fetch<VatsimAirportInfo>(`/api/data/vatsim/airport/${ icao }/info`);
        }
        else props.overlay.data.airport = undefined;
    }, {
        immediate: true,
    });

    map.value?.on('pointerdrag', handlePointerDrag);
    map.value?.on('moveend', handleMouseMove);
});

onBeforeUnmount(() => {
    map.value?.un('pointerdrag', handlePointerDrag);
    map.value?.un('moveend', handleMouseMove);
});
</script>

<style scoped lang="scss">
.pilot {
    div.pilot_header {
        &_status {
            position: relative;

            width: 8px;
            height: 8px;

            background: var(--status-color);
            border-radius: 100%;

            &:not(&--offline) {
                @keyframes status {
                    0% {
                        transform: scale(0);
                        opacity: 0;
                    }

                    60% {
                        transform: scale(0);
                        opacity: 0;
                    }

                    100% {
                        transform: scale(1);
                        opacity: 0.5;
                    }
                }

                &::before {
                    content: '';

                    position: absolute;
                    top: -2px;
                    left: -2px;

                    width: 12px;
                    height: 12px;

                    background: var(--status-color);
                    border-radius: 100%;

                    animation: status 1.4s alternate-reverse infinite;
                }
            }
        }

        &_line {
            position: absolute;
            z-index: 1;
            top: 0;
            left: -16px;

            width: calc(100% + 32px);

            &::before {
                content: '';

                position: absolute;
                top: 0;
                left: 0;

                width: var(--percent);
                height: 56px;

                background: $neutral900;
                border-radius: 8px 0 0 8px;
            }
        }
    }

    &__content {
        position: relative;
        z-index: 0;

        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    &__self {
        display: flex;
        gap: 16px;
        align-items: center;

        font-size: 13px;
        font-weight: 700;

        .pilot__card {
            flex: 1 1 0;
            width: 0;
        }
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

                    background: $neutral850;
                    border-radius: 4px;
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
        gap: 8px;

        > * {
            flex: 1 1 0;
            width: 0;
        }
    }

    &__track {
        transition: 0.3s;

        &--in-action {
            transition-property: transform;
        }
    }

    &__track--tracked {
        transform-origin: center;
        transform: rotate(90deg);
        color: $primary500;
    }

    :deep(.atc-popup), :deep(.atc-popup-container) {
        padding: 0 !important;
    }
}
</style>
