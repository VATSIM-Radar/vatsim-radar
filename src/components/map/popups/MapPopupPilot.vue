<template>
    <common-info-popup
        class="pilot"
        collapsible
        v-model:collapsed="overlay.collapsed"
        model-value
        @update:modelValue="!$event ? mapStore.overlays = mapStore.overlays.filter(x => x.id !== overlay.id) : undefined"
        :header-actions="store.config.airports ? ['sticky'] : ['sticky', 'track']"
        max-height="100%"
        :sections="sections"
        :style="{'--percent': `${ pilot.toGoPercent ?? 0 }%`, '--status-color': radarColors[getStatus.color]}"
        v-if="overlay?.data?.pilot"
    >
        <template #title>
            <div class="pilot-header pilot_header">
                <div class="pilot-header_title">
                    {{ pilot.callsign }}
                </div>
                <div class="pilot-header_type" v-if="pilot.flight_plan?.flight_rules !== 'I'">
                    VFR
                </div>
                <div
                    class="pilot_header_status"
                    :class="{'pilot_header_status--offline': isOffline}"
                    v-if="overlay.collapsed"
                />
                <div class="pilot_header_line" v-if="overlay.collapsed"/>
            </div>
        </template>
        <template #action-sticky>
            <map-popup-pin-icon :overlay="overlay"/>
        </template>
        <template #action-track>
            <div title="Track aircraft" @click="props.overlay.data.tracked = !props.overlay.data.tracked">
                <track-icon
                    width="16"
                    class="pilot__track"
                    :class="{'pilot__track--tracked': props.overlay?.data.tracked}"
                />
            </div>
        </template>
        <template #show-atc>
            <div class="pilot__content">
                <common-toggle v-model="showAtc">
                    Show ATC
                </common-toggle>
            </div>
        </template>
        <template #[`atc-${i}`]="{section}" v-for="i in ['center', 'atis', 'app', 'ground']" :key="i">
            <div class="pilot__content">
                <!-- @vue-ignore -->
                <common-controller-info
                    :controllers="section.controllers"
                    :show-facility="section.type === 'ground'"
                    show-atis
                    small
                />
            </div>
        </template>
        <template #flight>
            <div class="pilot__content">
                <div class="pilot__self">
                    <div>Pilot</div>
                    <common-info-block
                        class="pilot__card"
                        :top-items="[parseEncoding(pilot.name), pilot.cid]"
                        :bottom-items="[...usePilotRating(pilot), stats?.pilot ? `${Math.floor(stats.pilot)}h total time` : undefined]"
                    />
                </div>
                <common-info-block class="pilot__card">
                    <template #top>
                        <div class="pilot__card_route">
                            <div class="pilot__card_route_header">
                                <component :is="depAirport ? CommonButton : 'div'" type="link" @click="depAirport && mapStore.addAirportOverlay(depAirport.icao)" class="pilot__card_route_header_airport pilot__card_route_header_airport--dep">
                                    {{
                                        (pilot.flight_plan?.departure || ((pilot.status === 'depTaxi' || pilot.status === 'depGate') && pilot.airport)) || ''
                                    }}
                                </component>
                                <div
                                    class="pilot__card_route_header_status"
                                >
                                    {{ getStatus.title }}
                                </div>
                                <component :is="arrAirport ? CommonButton : 'div'" type="link" @click="arrAirport && mapStore.addAirportOverlay(arrAirport.icao)" class="pilot__card_route_header_airport pilot__card_route_header_airport--arr">
                                    {{ pilot.flight_plan?.arrival || '' }}
                                </component>
                            </div>
                            <div
                                class="pilot__card_route_line"
                                :class="{
                                    'pilot__card_route_line--start': pilot.toGoPercent && pilot.toGoPercent < 10,
                                    'pilot__card_route_line--end': pilot.toGoPercent && pilot.toGoPercent > 90,
                                }"
                                v-show="pilot.toGoPercent && !pilot.isOnGround && pilot.flight_plan?.aircraft_faa"
                            >
                                <img alt="" :src="`/aircraft/${ getAircraftIcon(pilot).icon }-active.png`">
                            </div>
                            <common-button class="pilot__card_route_open" type="link" @click="viewRoute">
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
                                <div class="pilot__card_route_footer_right" v-if="getDistAndTime">
                                    {{ getDistAndTime }}
                                </div>
                            </div>
                        </div>
                    </template>
                </common-info-block>
                <div class="pilot__cols" v-if="pilot.transponder || pilot.flight_plan?.assigned_transponder">
                    <common-info-block
                        class="pilot__card"
                        :top-items="['Squawk set']"
                        :bottom-items="[pilot.transponder || 'None']"
                        text-align="center"
                    />
                    <common-info-block
                        class="pilot__card"
                        :top-items="['Squawk assigned']"
                        :bottom-items="[pilot.flight_plan?.assigned_transponder || 'None']"
                        text-align="center"
                    />
                </div>
                <div class="pilot__cols">
                    <common-info-block
                        class="pilot__card"
                        :top-items="['Gr Speed']"
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
            <map-popup-flight-plan
                class="pilot__content"
                v-if="pilot.flight_plan"
                :flight-plan="pilot.flight_plan"
                :cruise="pilot.cruise"
            />
        </template>
        <template #buttons>
            <common-button-group>
                <common-button @click="overlay.data.tracked = !overlay.data.tracked" :disabled="store.config.hideAllExternal">
                    <template #icon>
                        <track-icon
                            class="pilot__track pilot__track--in-action"
                            :class="{'pilot__track--tracked': props.overlay?.data.tracked}"
                        />
                    </template>
                    Track
                </common-button>
                <common-button :disabled="overlay.data.tracked || store.config.hideAllExternal" @click="showOnMap">
                    <template #icon>
                        <map-icon/>
                    </template>
                    Focus
                </common-button>
                <common-button :href="`https://stats.vatsim.net/stats/${pilot.cid}`" target="_blank">
                    <template #icon>
                        <stats-icon/>
                    </template>
                    Stats
                </common-button>
                <common-button @click="copy.copy(`${config.public.DOMAIN}/?pilot=${pilot.cid}`)">
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
import type { InfoPopupSection } from '~/components/common/CommonInfoPopup.vue';
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
import { sortControllersByPosition, useFacilitiesIds } from '#imports';
import { getPilotStatus, showPilotOnMap } from '~/composables/pilots';
import type { StoreOverlayPilot } from '~/store/map';
import { useMapStore } from '~/store/map';
import MapPopupFlightPlan from '~/components/map/popups/MapPopupFlightPlan.vue';
import { boundingExtent, getCenter } from 'ol/extent';
import MapPopupPinIcon from '~/components/map/popups/MapPopupPinIcon.vue';
import { useCopyText } from '~/composables';
import { parseEncoding } from '~/utils/data';
import CommonButton from '~/components/common/CommonButton.vue';

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
// eslint-disable-next-line vue/no-ref-object-reactivity-loss
const showAtc = ref(pilot.value.cid.toString() === store.user?.cid);
const isOffline = ref(false);

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

    const view = map.value?.getView();

    view?.animate({
        center: getCenter(extent),
        resolution: view?.getResolutionForExtent(extent) * 1.8,
    });
};

const sections = computed<InfoPopupSection[]>(() => {
    const sections: InfoPopupSection[] = [
        ...getAtcList.value,
        {
            key: 'flight',
            title: 'Current Flight Details',
            collapsible: true,
        },
    ];

    if (pilot.value.airport || pilot.value.firs?.length) {
        sections.unshift({
            key: 'show-atc',
        });
    }

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
    type: 'center' | 'app' | 'ground' | 'atis',
    controllers: VatsimShortenedController[]
}

const facilities = useFacilitiesIds();

const getAtcList = computed<AtcPopupSection[]>(() => {
    if (!showAtc.value) return [];
    const sections: AtcPopupSection[] = [];

    const center = pilot.value.firs
        ? dataStore.vatsim.data.firs.value.filter((x) => pilot.value.firs!.includes(x.controller?.callsign ?? '')).map(x => x.controller!)
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

    return sections.sort((a, b) => {
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
});

const getStatus = computed(() => {
    return getPilotStatus(pilot.value.status, isOffline.value);
});

watch(dataStore.vatsim.updateTimestamp, async () => {
    try {
        props.overlay.data.pilot = await $fetch<VatsimExtendedPilot>(`/data/vatsim/pilot/${ props.overlay.key }`);
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
watch(() => props.overlay.data.tracked, (val) => {
    handleMouseMove();
    if (val) {
        mapStore.overlays.filter(x => x.type === 'pilot' && x.data.tracked && x.key !== pilot.value.cid.toString()).forEach((x) => {
            (x as StoreOverlayPilot).data.tracked = false;
        });
    }
});

function handlePointerDrag() {
    props.overlay.data.tracked = false;
}

onMounted(() => {
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
            width: 8px;
            height: 8px;
            border-radius: 100%;
            background: var(--status-color);
            position: relative;

            &:not(&--offline) {
                @keyframes status {
                    0% {
                        opacity: 0;
                        transform: scale(0);
                    }

                    60% {
                        opacity: 0;
                        transform: scale(0);
                    }

                    100% {
                        opacity: 0.5;
                        transform: scale(1);
                    }
                }

                &::before {
                    content: '';
                    position: absolute;
                    width: 12px;
                    height: 12px;
                    left: -2px;
                    top: -2px;
                    background: var(--status-color);
                    border-radius: 100%;
                    animation: status 1.4s alternate-reverse infinite;
                }
            }
        }

        &_line {
            position: absolute;
            top: 0;
            left: -16px;
            width: calc(100% + 32px);
            z-index: 1;

            &::before {
                content: '';
                position: absolute;
                width: var(--percent);
                height: 56px;
                background: $neutral900;
                border-radius: 8px 0 0 8px;
                top: 0;
                left: 0;
            }
        }
    }

    &__content {
        display: flex;
        flex-direction: column;
        gap: 8px;
        position: relative;
        z-index: 0;
    }

    &__self {
        display: flex;
        align-items: center;
        gap: 16px;
        font-size: 13px;
        font-weight: 700;

        .pilot__card {
            width: 0;
            flex: 1 1 0;
        }
    }

    &__card {
        &_route {
            display: flex;
            flex-direction: column;
            gap: 4px;

            &_header {
                display: flex;
                justify-content: space-between;
                gap: 8px;

                &, & .button {
                    font-weight: 600;
                    font-size: 13px;
                }

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

                img {
                    height: 24px;
                    position: relative;
                    z-index: 1;
                    transform: translateX(-50%) rotate(90deg);
                    left: var(--percent);
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
            width: 0;
            flex: 1 1 0;
        }
    }

    &__track {
        transition: 0.3s;

        &--in-action {
            transition-property: transform;
        }
    }

    &__track--tracked {
        color: $primary500;
        transform: rotate(90deg);
        transform-origin: center;
    }

    :deep(.atc-popup), :deep(.atc-popup-container) {
        padding: 0 !important;
    }
}
</style>
