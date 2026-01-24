<template>
    <popup-overlay
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
            proc: {
                title: 'Proc',
                sections: [{
                    key: 'procedures',
                    title: `${ pilot.status?.includes('dep') ? depAirport?.icao : arrAirport?.icao } procedures`,
                }],
                disabled: !depAirport || !arrAirport,
            },
            atc: {
                title: 'ATC',
                sections: atcSections,
                disabled: !atcSections.length,
            },
        }"
        @update:modelValue="!$event ? [store.user && pilot.cid === ownFlight?.cid && (mapStore.closedOwnOverlay = true), mapStore.overlays = mapStore.overlays.filter(x => x.id !== overlay.id)] : undefined"
    >
        <template #title>
            <div class="pilot-header pilot_header">
                <div class="pilot-header_title">
                    {{ pilot.callsign }}
                </div>
                <ui-bubble
                    v-if="pilot.flight_plan?.flight_rules !== 'I'"
                    class="pilot-header_type"
                    size="M"
                >
                    VFR
                </ui-bubble>
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
            <map-overlay-pin-icon :overlay="overlay"/>
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
            v-if="vatGlassesActive"
            #tab-atc
        >
            <ui-notification cookie-name="vatglasses-atc-warning">
                This data may not be reliable when VatGlasses integration is active. Refer to map instead.
            </ui-notification>
        </template>
        <template
            v-for="i in ['center', 'atis', 'app', 'ground', 'ctaf']"
            :key="i"
            #[`atc-${i}`]="{ section }"
        >
            <div class="pilot__content __info-sections">
                <!-- @vue-ignore -->
                <vatsim-controllers-list
                    class="pilot__controller"
                    :controllers="section.controllers"
                    max-height="auto"
                    show-atis
                    :show-facility="section.type === 'ground'"
                    small
                />
                <ui-button
                    v-if="i === 'ctaf'"
                    href="https://my.vatsim.net/learn/frequently-asked-questions/section/140"
                    target="_blank"
                    type="link"
                >
                    Learn more about CTAF trial
                </ui-button>
            </div>
        </template>
        <template #flight>
            <pilot-overlay-flight-info
                class="pilot__content __info-sections"
                :is-offline="isOffline"
                :pilot
                @viewRoute="viewRoute()"
            />
        </template>
        <template #graph>
            <map-popup-flight-graph :pilot/>
        </template>
        <template
            v-if="depAirport"
            #procedures
        >
            <ui-notification
                v-if="overlay.data.fullRoute && store.user && !store.user.settings.showFullRoute"
                cookie-name="full-route-tip"
                type="info"
            >
                Want to always show full route? Visit <a
                    class="__link"
                    href="#"
                    @click.prevent="store.settingsPopup = true"
                >settings</a>.
            </ui-notification>
            <ui-toggle
                v-if="!store.localSettings.disableNavigraphRoute"
                v-model="overlay.data.fullRoute"
            >
                Show full route
            </ui-toggle>
            <br>
            <airport-procedures
                v-if="depAirport && arrAirport && pilot.status?.includes('dep')"
                :aircraft="pilot"
                :airport="pilot.status?.includes('dep') ? depAirport!.icao : arrAirport!.icao"
                flight-type="departure"
                from="pilotOverlay"
            />
            <template v-if="arrAirport && pilot.status?.includes('dep')">
                <br><br>
                <ui-block-title>
                    {{arrAirport!.icao}} procedures
                </ui-block-title>
            </template>
            <airport-procedures
                v-if="depAirport && arrAirport"
                :aircraft="pilot"
                :airport="arrAirport!.icao"
                flight-type="arrival"
                from="pilotOverlay"
            />
        </template>
        <template #depRunways>
            <map-airport-runway-selector :airport="depAirport!.icao"/>
        </template>
        <template #arrRunways>
            <map-airport-runway-selector :airport="arrAirport!.icao"/>
        </template>
        <template #depBars>
            <map-airport-bars-info :data="depBars!"/>
        </template>
        <template #arrBars>
            <map-airport-bars-info :data="arrBars!"/>
        </template>
        <template #flightplan>
            <pilot-overlay-flight-plan
                class="pilot__content __info-sections"
                :flight-plan="pilot.flight_plan ?? null"
                :status="pilot.status ?? null"
                :stepclimbs="pilot.stepclimbs"
            />
        </template>
        <template #actions>
            <ui-button-group>
                <ui-button
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
                </ui-button>
                <ui-button
                    :disabled="overlay.data.tracked || store.config.hideAllExternal"
                    @click="showOnMap"
                >
                    <template #icon>
                        <location-icon/>
                    </template>
                    Focus
                </ui-button>
                <ui-button
                    :disabled="store.config.hideAllExternal"
                    @click="viewRoute"
                >
                    <template #icon>
                        <path-icon/>
                    </template>
                    Route
                </ui-button>
                <ui-button
                    :href="`https://stats.vatsim.net/stats/${ pilot.cid }`"
                    target="_blank"
                >
                    <template #icon>
                        <stats-icon/>
                    </template>
                    Stats
                </ui-button>
                <ui-button @click="copy.copy(`${ config.public.DOMAIN }/?pilot=${ pilot.cid }`)">
                    <template #icon>
                        <share-icon/>
                    </template>
                    <template v-if="copy.copyState.value">
                        Copied!
                    </template>
                    <template v-else>
                        Link
                    </template>
                </ui-button>
            </ui-button-group>
        </template>
    </popup-overlay>
</template>

<script setup lang="ts">
import type { PropType, ShallowRef } from 'vue';
import { useStore } from '~/store';
import PopupOverlay from '~/components/popups/PopupOverlay.vue';
import type { InfoPopupSection } from '~/components/popups/PopupOverlay.vue';
import type { VatsimExtendedPilot, VatsimShortenedController } from '~/types/data/vatsim';
import TrackIcon from 'assets/icons/kit/track.svg?component';
import LocationIcon from '~/assets/icons/kit/location.svg?component';
import StatsIcon from '~/assets/icons/kit/stats.svg?component';
import ShareIcon from '~/assets/icons/kit/share.svg?component';
import PathIcon from '~/assets/icons/kit/path.svg?component';
import type { Map } from 'ol';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { IFetchError } from 'ofetch';
import { ownFlight, sortControllersByPosition, useFacilitiesIds } from '#imports';
import { getPilotStatus, showPilotOnMap } from '~/composables/vatsim/pilots';
import type { StoreOverlayPilot } from '~/store/map';
import { useMapStore } from '~/store/map';
import PilotOverlayFlightPlan from '~/components/map/overlays/pilot/PilotOverlayFlightPlan.vue';
import { boundingExtent, getCenter } from 'ol/extent.js';
import MapOverlayPinIcon from '~/components/map/overlays/MapOverlayPinIcon.vue';
import { useCopyText } from '~/composables';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiButtonGroup from '~/components/ui/buttons/UiButtonGroup.vue';
import VatsimControllersList from '~/components/features/vatsim/controllers/VatsimControllersList.vue';
import UiBubble from '~/components/ui/data/UiBubble.vue';
import type { VatsimAirportInfo } from '~/utils/server/vatsim';
import PilotOverlayFlightInfo from '~/components/map/overlays/pilot/PilotOverlayFlightInfo.vue';
import { getAirportRunways } from '~/utils/data/vatglasses-front';
import MapAirportRunwaySelector from '~/components/map/airports/MapAirportRunwaySelector.vue';
import UiNotification from '~/components/ui/data/UiNotification.vue';
import MapAirportBarsInfo from '~/components/map/airports/MapAirportBarsInfo.vue';
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import AirportProcedures from '~/components/features/vatsim/airport/AirportProcedures.vue';
import { isVatGlassesActive } from '~/utils/data/vatglasses';
import UiBlockTitle from '~/components/ui/text/UiBlockTitle.vue';

const props = defineProps({
    overlay: {
        type: Object as PropType<StoreOverlayPilot>,
        required: true,
    },
});

const MapPopupFlightGraph = defineAsyncComponent(() => import('~/components/map/overlays/pilot/PilotOverlayFlightGraph.vue'));

const map = inject<ShallowRef<Map | null>>('map')!;
const copy = useCopyText();

const store = useStore();
const dataStore = useDataStore();
const mapStore = useMapStore();
const config = useRuntimeConfig();
const vatGlassesActive = isVatGlassesActive;

const pilot = computed(() => props.overlay.data.pilot);
const textCoords = computed(() => dataStore.vatsim.data.keyedPilots.value[props.overlay.data.pilot.cid.toString()]?.longitude.toString() + dataStore.vatsim.data.keyedPilots.value[props.overlay.data.pilot.cid.toString()]?.latitude);
const airportInfo = computed(() => {
    return props.overlay.data.airport;
});
const isOffline = ref(false);

const depAirport = computed(() => {
    return dataStore.vatspy.value?.data.keyAirports.realIcao[pilot.value.flight_plan?.departure ?? ''];
});

const arrAirport = computed(() => {
    return dataStore.vatspy.value?.data.keyAirports.realIcao[pilot.value.flight_plan?.arrival ?? ''];
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
    const list = getAtcList.value?.slice() as InfoPopupSection[];

    if (depRunways.value && props.overlay.data.pilot.status?.startsWith('dep')) {
        list.push({
            key: 'depRunways',
            title: `${ depAirport.value?.icao } Runways`,
            collapsible: true,
        });
    }

    if (arrRunways.value) {
        list.push({
            key: 'arrRunways',
            title: `${ arrAirport.value?.icao } Runways`,
            collapsible: true,
        });
    }

    return list;
});

const depRunways = computed(() => depAirport.value ? getAirportRunways(depAirport.value.icao) : null);
const arrRunways = computed(() => arrAirport.value ? getAirportRunways(arrAirport.value.icao) : null);

const depBars = computed(() => {
    return depAirport.value && dataStore.vatsim.data.bars.value[depAirport.value.icao];
});

const arrBars = computed(() => {
    return arrAirport.value && dataStore.vatsim.data.bars.value[arrAirport.value.icao];
});

const sections = computed<InfoPopupSection[]>(() => {
    const sections: InfoPopupSection[] = [
        {
            key: 'flight',
            title: 'Flight Details',
            collapsible: true,
        },
    ];

    if (props.overlay.data.pilot.status !== 'depTaxi' && props.overlay.data.pilot.status !== 'depGate') {
        sections.push({
            key: 'graph',
            title: 'Speed & Altitude graph',
            collapsedDefault: true,
            collapsedDefaultOnce: true,
            collapsible: true,
        });
    }

    sections.push({
        key: 'flightplan',
        title: 'Flight Plan',
        collapsible: true,
    });

    if (depRunways.value && props.overlay.data.pilot.status?.startsWith('dep')) {
        sections.push({
            key: 'depRunways',
            title: `${ depAirport.value?.icao } Runways`,
            collapsible: true,
        });
    }

    if (arrRunways.value) {
        sections.push({
            key: 'arrRunways',
            title: `${ arrAirport.value?.icao } Runways`,
            collapsible: true,
        });
    }

    if (depBars.value && props.overlay.data.pilot.status?.startsWith('dep')) {
        sections.push({
            key: 'depBars',
            title: `${ depAirport.value?.icao } BARS`,
            collapsible: true,
            collapsedDefault: true,
            collapsedDefaultOnce: true,
        });
    }

    if (arrBars.value && props.overlay.data.pilot.status?.startsWith('arr')) {
        sections.push({
            key: 'arrBars',
            title: `${ arrAirport.value?.icao } BARS`,
            collapsible: true,
            collapsedDefault: true,
            collapsedDefaultOnce: true,
        });
    }

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
            key: 'controllers-center',
            collapsible: true,
            collapsedDefault: true,
            collapsedDefaultOnce: true,
        });
    }

    const controls = pilot.value.airport ? dataStore.vatsim.data.locals.value.filter(x => x.airport?.icao === pilot.value.airport) : null;

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
                key: 'controllers-atis',
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
                key: 'controllers-ground',
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
                key: 'controllers-app',
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
            key: 'controllers-ctaf',
            collapsible: false,
        }];
    }

    return sections;
});

const getStatus = computed(() => {
    return getPilotStatus(pilot.value.status, isOffline.value);
});

const loading = ref(false);

watch(dataStore.vatsim.updateTimestamp, async () => {
    if (loading.value) return;
    try {
        loading.value = true;
        props.overlay.data.pilot = await $fetch<VatsimExtendedPilot>(`/api/data/vatsim/pilot/${ props.overlay.key }`, {
            timeout: 1000 * 15,
        });
        isOffline.value = false;
    }
    catch (e: IFetchError | any) {
        if (e) {
            isOffline.value = e.status === 404;
        }
    }
    finally {
        loading.value = false;
    }
});

function focusOnAircraft() {
    if (!props.overlay.data.tracked) return;

    let center = [dataStore.vatsim.data.keyedPilots.value[props.overlay.data.pilot.cid.toString()]?.longitude ?? pilot.value.longitude, dataStore.vatsim.data.keyedPilots.value[props.overlay.data.pilot.cid.toString()]?.latitude ?? pilot.value.latitude];

    if (ownFlight.value?.cid === props.overlay.data.pilot.cid && dataStore.vatsim.selfCoordinate.value) center = dataStore.vatsim.selfCoordinate.value.coordinate;

    map.value?.getView().animate({
        center,
        duration: 300,
    });
}

watch([textCoords, dataStore.vatsim.selfCoordinate], focusOnAircraft);
watch(() => props.overlay.data.tracked, val => {
    focusOnAircraft();
    if (val) {
        mapStore.overlays.filter(x => x.type === 'pilot' && x.data.tracked && x.key !== pilot.value.cid.toString()).forEach(x => {
            (x as StoreOverlayPilot).data.tracked = false;
        });
    }
}, {
    immediate: true,
});

function handlePointerDrag() {
    props.overlay.data.tracked = false;
}

onMounted(() => {
    watch(() => pilot.value.airport, async icao => {
        try {
            if (airportInfo.value?.icao === icao) return;

            if (icao) {
                props.overlay.data.airport = await $fetch<VatsimAirportInfo>(`/api/data/vatsim/airport/${ icao }/info`);
            }
            else props.overlay.data.airport = undefined;
        }
        catch { /* empty */ }
    }, {
        immediate: true,
    });

    map.value?.on('pointerdrag', handlePointerDrag);
    map.value?.on('moveend', focusOnAircraft);
});

onBeforeUnmount(() => {
    map.value?.un('pointerdrag', handlePointerDrag);
    map.value?.un('moveend', focusOnAircraft);

    if (enrouteAircraftPath.value) {
        delete enrouteAircraftPath.value[props.overlay.key];
    }
});
</script>

<style scoped lang="scss">
.pilot {
    div.pilot_header {
        &_status {
            position: relative;

            width: 8px;
            height: 8px;
            border-radius: 100%;

            background: var(--status-color);

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
                    border-radius: 100%;

                    background: var(--status-color);

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
                border-radius: 8px 0 0 8px;

                background: $darkgray900;
            }
        }
    }

    &__content {
        position: relative;
    }

    &__controller {
        position: relative;
        z-index: 5;
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
