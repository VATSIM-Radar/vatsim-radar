<template>
    <popup-overlay
        v-if="overlay?.data?.pilot"
        v-model:collapsed="overlay.collapsed"
        v-model:minified="overlay.minified"
        class="pilot"
        collapsible
        :header-actions="store.config.airports ? ['sticky'] : ['sticky', 'track']"
        max-height="100%"
        model-value
        :style="{ '--percent': `${ pilot.toGoPercent ?? 0 }%`, '--status-color': radarColors[getStatus.color] }"
        :tabs="{
            info: {
                title: 'General',
                sections,
            },
            proc: {
                title: 'Procedures',
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
        @collapsedSection="$event.key === 'achievements' ? (collapsedAchievements = $event.value) : $event.key === 'ipfs' ? (collapsedViff = $event.value) : $event.key === 'photo' ? (collapsedPhoto = $event.value) : undefined"
        @update:modelValue="!$event ? [store.user && pilot.cid === ownFlight?.cid && (mapStore.closedOwnOverlay = true), mapStore.overlays = mapStore.overlays.filter(x => x.id !== overlay.id)] : undefined"
    >
        <template #title>
            <div class="pilot-header pilot_header">
                <ui-badge
                    :animate="overlay.collapsed"
                    :color="radarColors[getStatus.color]"
                    :type="isOffline ? 'offline' : 'online'"
                />
                <img 
                    v-if="showCountryFlags && country && pilot.flight_plan?.flight_rules?.toUpperCase()?.startsWith('V')" 
                    :src="getFlagUrl(country.countryCode)" 
                    :alt="country.name || country.countryCode"
                    :title="`${country.name || country.countryCode} (${country.prefix})`"
                    class="pilot_flag" 
                />
                <div class="pilot-header_title">
                    <img
                        v-if="showAirlineLogos && airlineLogoUrl"
                        :src="airlineLogoUrl"
                        @error="airlineLogoUrl = airlineLogoUrls[(airlineLogoUrls.indexOf(airlineLogoUrl) + 1)] || ''"
                        alt="Airline logo"
                        class="pilot_airline_logo"
                    />
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
                    class="pilot_header_line"
                />
            </div>
            <popup-achievement v-model="selectedAchievement"/>
        </template>
        <template #action-sticky>
            <map-overlay-pin-icon :overlay="overlay"/>
        </template>
        <template #action-track>
            <div
                title="Track aircraft"
                @click="toggleTrack"
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
            #[`controllers-${i}`]="{ section }"
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
                class="pilot__content"
                :ctaf="ctafFrequency"
                :is-offline="isOffline"
                :pilot
                @viewRoute="viewRoute()"
            />
        </template>
        <template
            v-if="props.overlay.data.photo"
            #photo
        >
            <ui-text
                class="pilot__photo"
                :href="props.overlay.data.photo.link"
                target="_blank"
                type="3b-medium"
            >
                <img
                    :alt="props.overlay.data.photo.photographer"
                    decoding="async"
                    importance="low"
                    referrerpolicy="origin-when-cross-origin"
                    :src="(props.overlay.data.photo.thumbnail_large ?? props.overlay.data.photo.thumbnail).src"
                >
                <div class="pilot__photo_author">
                    {{props.overlay.data.photo.photographer}}
                </div>
            </ui-text>
        </template>
        <template #ipfs>
            <map-popup-ipfs
                :ipfs="overlay.data.ipfs!"
                :pilot
                @saved="[overlay.data.ipfs = $event, ipfsCacheDate = Date.now()]"
            />
        </template>
        <template #graph>
            <map-popup-flight-graph :pilot/>
        </template>
        <template
            v-if="depAirport"
            #procedures
        >
            <ui-toggle
                v-if="routeParsingEnabled"
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
        <template #achievements>
            <div class="pilot__achievements">
                <div class="pilot__achievements_list">
                    <div
                        v-for="(achievement, index) in overlay.data.achievements ?? []"
                        :key="achievement.name+index"
                        class="pilot__achievements_achievement"
                        :title="achievement.name"
                        @click="selectedAchievement = achievement"
                    >
                        <div
                            class="pilot__achievements_achievement_image"
                            :style="{ backgroundImage: `url(${ achievement.badge_image_url })` }"
                        />
                    </div>
                </div>
            </div>
        </template>
        <template #flightplan>
            <pilot-overlay-flight-plan
                class="pilot__content"
                :flight-plan="pilot.flight_plan ?? null"
                :status="pilot.status ?? null"
                :stepclimbs="pilot.stepclimbs"
                :country="country"
                :show-registration-flags="showRegistrationFlags"
            />
        </template>
        <template #actions>
            <ui-button-group>
                <ui-button
                    :disabled="store.config.hideAllExternal"
                    @click="toggleTrack"
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
import { ref, watch } from 'vue';
import { useStore } from '~/store';
import PopupOverlay from '~/components/popups/PopupOverlay.vue';
import type { InfoPopupSection } from '~/components/popups/PopupOverlay.vue';
import type {
    VatsimAchievementUser,
    VatsimExtendedPilot,
    VatsimShortenedController, IpfsUser, PlaneSpottersPhoto,
} from '~/types/data/vatsim';
import TrackIcon from 'assets/icons/kit/track.svg?component';
import LocationIcon from '~/assets/icons/kit/location.svg?component';
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
import MapAirportRunwaySelector from '~/components/map/airports/MapAirportRunwaySelector.vue';
import MapAirportBarsInfo from '~/components/map/airports/MapAirportBarsInfo.vue';
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import AirportProcedures from '~/components/features/vatsim/airport/AirportProcedures.vue';
import UiBlockTitle from '~/components/ui/text/UiBlockTitle.vue';
import PopupAchievement from '~/components/popups/PopupAchievement.vue';
import { getControllersForPosition } from '~/composables/render';
import MapPopupIpfs from '~/components/map/popups/MapPopupIpfs.vue';
import UiBadge from '~/components/ui/data/UiBadge.vue';
import UiText from '~/components/ui/text/UiText.vue';
import { getFlightPlanParam } from '~/utils/shared/vatsim';
import { enrouteAircraftPath } from '~/composables/navigraph';
import { useVfrCountry, usePilotCountry, getFlagUrl } from '~/utils/shared/country-codes';
import { getAirlineLogoUrls } from '~/utils/shared/airline-logos';

const props = defineProps({
    overlay: {
        type: Object as PropType<StoreOverlayPilot>,
        required: true,
    },
});

const MapPopupFlightGraph = defineAsyncComponent(() => import('~/components/map/overlays/pilot/PilotOverlayFlightGraph.vue'));

const map = inject<ShallowRef<Map | null>>('map')!;
const collapsedAchievements = useCookie<boolean>('collapsedAchievements', {
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 * 360,
});

const collapsedViff = useCookie<boolean>('collapsedViff', {
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 * 360,
});

const collapsedPhoto = useCookie<boolean>('collapsedPhoto', {
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 * 360,
});

const copy = useCopyText();

const store = useStore();
const routeParsingEnabled = useSettingValueFromFunc('map.navigraph.routeParsing.enabled');
const showAirlineLogos = useSettingValueFromFunc('map.traffic.showAirlineLogos');
const showCountryFlags = useSettingValueFromFunc('map.traffic.showCountryFlags');
const showRegistrationFlags = useSettingValueFromFunc('map.traffic.showRegistrationFlags');
const dataStore = useDataStore();
const mapStore = useMapStore();
const config = useRuntimeConfig();
const selectedAchievement = shallowRef<VatsimAchievementUser | null>(null);

const ctafFrequency = computed(() => {
    const ctaf = atcList.value.find(x => x.key === 'controllers-ctaf');
    if (ctaf) return ctaf?.controllers?.[0]?.frequency ?? null;
    return null;
});

const pilot = computed(() => props.overlay.data.pilot);

const country = usePilotCountry(pilot);

const airlineLogoUrls = computed(() => {
    if (!pilot.value) return [];
    return getAirlineLogoUrls(pilot.value.callsign);
});

const airlineLogoUrl = ref('');

watch(() => pilot.value?.callsign, (newCallsign) => {
    if (!newCallsign) {
        airlineLogoUrl.value = '';
        return;
    }
    const urls = getAirlineLogoUrls(newCallsign);
    airlineLogoUrl.value = urls[0] ?? '';
}, { immediate: true });

const flightPlanKey = computed(() => {
    const flightPlan = pilot.value.flight_plan;
    if (!flightPlan) return null;

    return JSON.stringify({
        revision_id: flightPlan.revision_id,
        flight_rules: flightPlan.flight_rules,
        aircraft: flightPlan.aircraft,
        aircraft_faa: flightPlan.aircraft_faa,
        aircraft_short: flightPlan.aircraft_short,
        departure: flightPlan.departure,
        arrival: flightPlan.arrival,
        alternate: flightPlan.alternate,
        deptime: flightPlan.deptime,
        altitude: flightPlan.altitude,
        route: flightPlan.route,
        remarks: flightPlan.remarks,
    });
});

watch(flightPlanKey, (value, previousValue) => {
    if (value === previousValue) return;

    const cid = pilot.value.cid.toString();
    delete dataStore.navigraphAircraftProcedures.value[cid];
    if (enrouteAircraftPath.value) delete enrouteAircraftPath.value[cid];

    triggerRef(dataStore.navigraphAircraftProcedures);
    triggerRef(enrouteAircraftPath);
});

const airportInfo = computed(() => {
    return props.overlay.data.airport;
});
const isOffline = ref(false);

const depAirport = computed<AirportListItem | null>(() => {
    return dataStore.vatsim.parsedAirports.value[pilot.value.flight_plan?.departure ?? ''];
});

const arrAirport = computed<AirportListItem | null>(() => {
    return dataStore.vatsim.parsedAirports.value[pilot.value.flight_plan?.arrival ?? ''];
});

const toggleTrack = () => {
    props.overlay.data.tracked = !props.overlay.data.tracked;
    mapStore.mobileSheetCollapse++;
};

const showOnMap = () => {
    showPilotOnMap(pilot.value, map.value);
    mapStore.mobileSheetCollapse++;
};

const viewRoute = () => {
    if (!depAirport.value?.airport || !arrAirport.value?.airport) return;
    const extent = boundingExtent([
        [depAirport.value.airport.lon, depAirport.value.airport.lat],
        [arrAirport.value.airport.lon, arrAirport.value.airport.lat],
    ]);

    props.overlay.data.tracked = false;
    mapStore.mobileSheetCollapse++;

    const view = map.value?.getView();

    view?.animate({
        center: getCenter(extent),
        resolution: view?.getResolutionForExtent(extent) * 1.8,
    });
};

const atcSections = computed<InfoPopupSection[]>(() => {
    const list = atcList.value?.slice() as InfoPopupSection[];

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

const depRunways = computed(() => depAirport.value?.vgRunways ?? null);
const arrRunways = computed(() => arrAirport.value?.vgRunways ?? null);

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
        },
    ];

    if (props.overlay.data.achievements?.length) {
        sections.push({
            key: 'achievements',
            title: 'Achievements',
            collapsedDefault: !!collapsedAchievements.value,
            collapsible: true,
            bubble: props.overlay.data.achievements?.length,
        });
    }

    if (props.overlay.data.pilot.status !== 'depTaxi' && props.overlay.data.pilot.status !== 'depGate') {
        sections.push({
            key: 'graph',
            title: 'Speed & Altitude graph',
            collapsedDefault: true,
            collapsible: true,
        });
    }

    if (props.overlay?.data.ipfs && (props.overlay?.data.ipfs.atfcmStatus || atcList.value?.length)) {
        sections.push({
            key: 'ipfs',
            title: 'vIFF Departure Info',
            collapsedDefault: !!collapsedViff.value,
            collapsible: true,
            bubble: props.overlay?.data.ipfs.isCdm ? 'CDM online' : undefined,
        });
    }

    if (props.overlay?.data.photo) {
        sections.push({
            key: 'photo',
            title: 'Photo',
            collapsedDefault: collapsedPhoto.value !== false,
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
        });
    }

    if (arrBars.value && props.overlay.data.pilot.status?.startsWith('arr')) {
        sections.push({
            key: 'arrBars',
            title: `${ arrAirport.value?.icao } BARS`,
            collapsible: true,
            collapsedDefault: true,
        });
    }

    return sections;
});

type AtcPopupSection = InfoPopupSection & {
    type: 'center' | 'app' | 'ground' | 'atis';
    controllers: VatsimShortenedController[];
};

const facilities = useFacilitiesIds();

const atcList = shallowRef<AtcPopupSection[]>([]);
const ctaf = computed(() => airportInfo.value?.ctafFreq);

watch([dataStore.airportsList, ctaf], () => {
    const sections: AtcPopupSection[] = [];

    const additionalATC = getControllersForPosition([pilot.value?.longitude, pilot.value?.latitude]);

    const center = additionalATC.filter(x => x.facility === facilities.CTR || x.facility === facilities.FSS);

    if (center?.length) {
        sections.push({
            type: 'center',
            controllers: center,
            title: 'Area Control',
            key: 'controllers-center',
            collapsible: true,
            collapsedDefault: true,
        });
    }

    const controls = pilot.value.airport ? dataStore.airportsList.value[pilot.value.airport]?.atc?.slice() : null;

    if (controls) {
        for (const atc of additionalATC) {
            if (atc.facility === facilities.CTR || atc.facility === facilities.FSS || controls.some(x => x.callsign === atc.callsign)) continue;
            controls.push(atc);
        }
    }

    if (controls?.length) {
        const atis = controls.filter(x => x.isATIS);
        let ground = controls.filter(x => !x.isATIS && x.facility !== facilities.APP);
        ground = sortControllersByPosition(ground);

        const app = controls.filter(x => !x.isATIS && x.facility === facilities.APP);

        if (atis.length) {
            sections.push({
                type: 'atis',
                controllers: atis,
                title: 'ATIS',
                key: 'controllers-atis',
                collapsible: true,
                collapsedDefault: true,
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
        sections.push({
            type: 'ground',
            controllers: [
                {
                    cid: Math.random(),
                    callsign: '',
                    facility: -2,
                    text_atis: null,
                    name: '',
                    logon_time: '',
                    rating: 0,
                    frequency: airportInfo.value?.ctafFreq,
                },
            ],
            title: 'CTAF',
            key: 'controllers-ctaf',
            collapsible: false,
        });
    }

    atcList.value = sections;
}, {
    immediate: true,
});

const getStatus = computed(() => {
    return getPilotStatus(pilot.value.status, isOffline.value);
});

const loading = ref(false);
const ipfsCacheDate = ref(0);

useUpdateCallback(['short'], async () => {
    if (loading.value) return;
    try {
        loading.value = true;
        props.overlay.data.pilot = await $fetch<VatsimExtendedPilot>(`/api/data/vatsim/pilot/${ props.overlay.key }`, {
            timeout: 1000 * 15,
        });

        if (pilot.value.status === 'depTaxi' || pilot.value.status === 'depGate') {
            const previousIpfsData = props.overlay.data.ipfs;

            props.overlay.data.ipfs = await $fetch<IpfsUser>(`/api/data/vatsim/pilot/${ props.overlay.key }/ipfs?date=${ ipfsCacheDate.value }`, {
                timeout: 1000 * 15,
            }).catch(() => {
            }) ?? previousIpfsData;
        }
        else if (props.overlay.data.ipfs) {
            props.overlay.data.ipfs = undefined;
        }

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

watch(() => props.overlay.data.tracked, val => {
    if (val) {
        mapStore.overlays.filter(x => x.type === 'pilot' && x.data.tracked && x.key !== pilot.value.cid.toString()).forEach(x => {
            (x as StoreOverlayPilot).data.tracked = false;
        });
    }
}, {
    immediate: true,
});

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

    watch(() => pilot.value.flight_plan?.remarks, async val => {
        try {
            if (props.overlay?.data.photo || !val?.includes('REG/')) return;

            const reg = getFlightPlanParam(val, 'REG');

            const photo = await $fetch<PlaneSpottersPhoto | { status: string }>(`/api/data/vatsim/photo/${ reg }`).catch(() => {});
            if (photo && !('status' in photo)) props.overlay.data.photo = photo;
        }
        catch { /* empty */ }
    }, {
        immediate: true,
    });
});
</script>

<style scoped lang="scss">
.pilot {
    &_flag {
        height: 14px;
        width: auto;
        border-radius: 2px;
        object-fit: contain;
    }

    &_airline_logo {
        height: 24px;
        width: 24px;
        margin-right: 6px;
        border-radius: 2px;
        object-fit: contain;
        flex-shrink: 0;
        filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.7));
    }

    &_airline_dot {
        width: 8px;
        height: 8px;
        margin-right: 6px;
        border-radius: 2px;
        background: var(--status-color);
        flex-shrink: 0;
        opacity: 0.8;
    }

    &_header {
        display: flex;
        gap: 8px;
        align-items: center;
        color: var(--status-color);
    }

    &-header_title {
        display: flex;
        align-items: center;
        gap: 6px;
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
        color: $blue500;
    }

    :deep(.atc-popup), :deep(.atc-popup-container) {
        padding: 0 !important;
    }

    &__achievements {
        overflow: auto;
        max-width: 100%;
        padding-bottom: 4px;

        &_list {
            display: flex;
            gap: 8px;
            width: max-content;
        }

        &_achievement {
            cursor: pointer;

            display: flex;
            flex-direction: column;
            flex-grow: 1;
            gap: 4px;

            width: 100%;
            max-width: 70px;
            padding: 4px;
            border: 1px solid $darkGray400;
            border-radius: 8px;

            font-size: 10px;
            text-align: center;

            background: $darkGray800;

            &_image {
                aspect-ratio: $achievementAspectRatio;
                height: 50px;

                background-repeat: no-repeat;
                background-position: center;
                background-size: contain;
            }
        }
    }

    &__photo {
        position: relative;

        img {
            border-radius: 8px;
        }

        &_author {
            position: absolute;
            right: 8px;
            bottom: 8px;

            padding: 4px;
            border-radius: 4px;

            background: $blackAlpha64;
            backdrop-filter: blur(8px);
        }
    }
}
</style>
