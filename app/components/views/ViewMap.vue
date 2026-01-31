<template>
    <div class="map">
        <div
            ref="mapContainer"
            class="map_container"
        />

        <transition name="map_notam--appear">
            <div
                v-if="notam"
                ref="notam"
                class="map_notam"
                :class="[`map_notam--type-${ notam.type }`, { 'map_notam--dismissable': notam.dismissable }]"
            >
                <div class="map_notam_icon">
                    <announce-icon v-if="notam.type === NotamType.ANNOUNCEMENT"/>
                    <error-icon v-else-if="notam.type === NotamType.ERROR"/>
                    <warning-icon v-else-if="notam.type === NotamType.WARNING"/>
                </div>
                <div
                    class="map_notam_text"
                    v-html="notam.text"
                />
                <div
                    v-if="notam.dismissable"
                    class="map_notam_close"
                    @click="[notamCookie=notam.id]"
                >
                    <close-icon/>
                </div>
            </div>
        </transition>

        <template v-if="mode === 'all'">
            <div
                v-if="ready && !isMobile"
                v-show="!store.config.hideOverlays"
                ref="popups"
                class="map_popups"
                :class="{ 'map_popups--single': mapStore.overlays.length === 1 }"
                :style="{
                    '--popups-height': `${ popupsHeight }px`,
                    '--overlays-height': `${ overlaysHeight }px`,
                }"
            >
                <div
                    v-if="popupsHeight || store.config.hideOverlays"
                    class="map_popups_list"
                    :class="{ 'map_popups_list--empty': !mapStore.overlays.length }"
                >
                    <transition-group name="map_popups_popup--appear">
                        <map-overlays
                            v-for="overlay in mapStore.overlays"
                            :key="overlay.id+overlay.key"
                            class="map_popups_popup"
                            :overlay="overlay"
                        />
                    </transition-group>
                </div>
            </div>
            <div
                v-else-if="ready && isMobile"
                v-show="!store.config.hideOverlays"
            >
                <map-mobile-window/>
            </div>

            <map-controls v-if="!store.config.hideAllExternal"/>
            <div :key="(store.theme ?? 'default') + JSON.stringify(store.mapSettings.colors ?? {})">
                <client-only v-if="ready">
                    <map-selected-procedures/>
                    <map-aircraft-list v-if="!store.bookingOverride"/>
                    <map-sectors-list
                        v-if="!store.config.hideSectors"
                        :key="String(store.localSettings.filters?.layers?.layer)"
                    />
                    <map-distance v-if="store.localSettings.distance?.enabled"/>
                    <map-airports-list-v2 v-if="!store.config.hideAirports"/>
                    <map-select/>
                    <navigraph-layers v-if="dataStore.navigraph.version"/>
                    <map-weather/>
                    <a
                        v-if="store.config.showCornerLogo"
                        class="map_logo"
                        href="https://vatsim-radar.com"
                        target="_blank"
                    >
                        <branding-logo width="50px"/>
                    </a>
                </client-only>
            </div>
            <client-only v-if="ready">
                <map-layer :key="(store.theme ?? 'default')"/>
                <map-terminator
                    v-if="store.localSettings.filters?.layers?.terminator"
                    :key="(store.theme ?? 'default') + 'terminator'"
                />
                <map-sigmets v-if="store.localSettings.filters?.layers?.sigmets?.enabled"/>
                <map-settings v-if="!store.config.hideHeader"/>
            </client-only>
            <popup-fullscreen
                v-if="route.query"
                v-model="isDiscord"
            >
                <template #title>
                    Authorization confirmation
                </template>

                You have successfully verified in VATSIM Radar Discord.
            </popup-fullscreen>
            <popup-fullscreen :model-value="store.presetImport.preset === false">
                <template #title>Preset Import</template>
                Preset import failed. That could be because preset name length is more than 30 symbols, invalid JSON, or an error in yours or ours network.
                <template #actions>
                    <ui-button @click="store.presetImport.preset = null">
                        Thanks, I guess?
                    </ui-button>
                </template>
            </popup-fullscreen>
            <popup-fullscreen
                :model-value="!!store.presetImport.preset && typeof store.presetImport.preset === 'object'"
                width="600px"
            >
                <template #title>Preset Import</template>

                Warning: preset import will overwrite your current preset.<br><br>

                <ui-input-text
                    v-if="store.user"
                    v-model="store.presetImport.name"
                    placeholder="Enter a name for new preset"
                />

                <template #actions>
                    <ui-button
                        type="secondary-875"
                        @click="store.presetImport.preset = null"
                    >
                        Cancel import
                    </ui-button>
                    <ui-button
                        :disabled="!store.presetImport.name && !!store.user"
                        @click="store.presetImport.save!()"
                    >
                        Import preset
                    </ui-button>
                </template>
            </popup-fullscreen>
            <popup-fullscreen
                :model-value="!!store.presetImport.error"
                @update:modelValue="$event === false && (store.presetImport.error = $event)"
            >
                <template #title>
                    A preset with this name already exists
                </template>

                You are trying to save preset with same name as you already have.<br> Do you maybe want to override it?

                <template #actions>
                    <ui-button
                        hover-color="error700"
                        primary-color="error500"
                        @click="typeof store.presetImport.error === 'function' && store.presetImport.error().then(() => store.presetImport.error = false)"
                    >
                        Overwrite my old preset
                    </ui-button>
                    <ui-button @click="store.presetImport.error = false">
                        I'll rename it
                    </ui-button>
                </template>
            </popup-fullscreen>
            <popup-fullscreen
                v-model="mapStore.distance.tutorial"
                width="600px"
            >
                <template #title>
                    Distance Tool
                </template>

                You have just enabled Distance Tool for the first time.<br> This is a message to give you a little understanding on how it works.

                <ol class="__info-sections">
                    <li>
                        <strong>This is not a tool for supervising</strong>.
                        <br>VATSIM Radar has delays.
                        <br> Each airspace has it's own separation rules.
                        <br> Please, do not .wallop for separation issues.<br> If you think that separation was bad - provide feedback via local ATC facility instead.
                    </li>
                    <li>
                        To activate tool, press twice on the map
                    </li>
                    <li>
                        To pin point to aircraft, double click on it
                    </li>
                    <li>
                        This tool disables double click to zoom. Need to use both Distance Tool and click to zoom? Enable CTRL+Click!

                        <ui-toggle
                            :model-value="!!store.localSettings.distance?.ctrlClick"
                            @update:modelValue="setUserLocalSettings({ distance: { ctrlClick: $event } })"
                        >
                            CTRL+Click instead of double click
                        </ui-toggle>
                    </li>
                    <li>
                        You can change CTRL+Click action and displayed units in Map layer settings (second icon on left filters screen)
                    </li>
                </ol>
            </popup-fullscreen>
            <popup-fullscreen
                v-if="observerFlight && canShowObserver"
                :model-value="canShowObserver"
                width="700px"
            >
                <template #title>
                    Shared Cockpit Mode
                </template>

                We have noticed that you have connected as observer... <br>
                And there is also someone flying as <strong>{{observerFlight.callsign}}</strong>.<br><br>

                Would you like us to connect your flights for this session?

                <br><br>

                <ui-toggle
                    v-model="skipObserver.value"
                    align-left
                >
                    Don't show me this again

                    <template #description>
                        You will be able to change this later by clicking on track icon below filters in the left
                    </template>
                </ui-toggle>

                <template #actions>
                    <ui-button
                        type="secondary"
                        @click="[mapStore.selectedCid = false, observerCookie = false]"
                    >
                        No, thanks
                    </ui-button>
                    <ui-button @click="[mapStore.selectedCid = observerFlight.cid, observerCookie = observerFlight.cid]">
                        Yes, connect me and {{observerFlight.callsign}}
                    </ui-button>
                </template>
            </popup-fullscreen>
        </template>
        <client-only v-else-if="mode === 'sigmets' && ready">
            <map-layer/>
            <map-sigmets/>
        </client-only>
        <map-layer v-else/>
        <client-only>
            <map-scale v-if="!store.isMobile && store.localSettings.filters?.layers?.relativeIndicator !== false"/>
        </client-only>
        <slot/>
    </div>
</template>

<script setup lang="ts">
import '@@/node_modules/ol/ol.css';
import { Map, View } from 'ol';
import type { MapBrowserEvent } from 'ol';
import { Attribution } from 'ol/control.js';
import MapSectorsList from '~/components/map/sectors/MapSectorsList.vue';
import MapAircraftList from '~/components/map/aircraft/MapAircraftList.vue';
import { useStore } from '~/store';
import { setupDataFetch } from '~/composables/render/storage';
import MapOverlays from '~/components/map/overlays/MapOverlays.vue';
import { useMapStore } from '~/store/map';
import type { StoreOverlayAirport, StoreOverlay } from '~/store/map';
import { observerFlight, ownFlight, showPilotOnMap, skipObserver } from '~/composables/vatsim/pilots';
import { findAtcByCallsign } from '~/composables/vatsim/controllers';
import type { VatsimAirportData } from '~~/server/api/data/vatsim/airport/[icao]';
import { boundingExtent, buffer, getCenter } from 'ol/extent.js';
import { toDegrees } from 'ol/math.js';
import type { Coordinate } from 'ol/coordinate.js';
import BrandingLogo from '~/components/ui/BrandingLogo.vue';
import { setUserLocalSettings } from '~/composables/fetchers/map-settings';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import type { UserFilterPreset } from '~/utils/server/handlers/filters';
import type { UserBookmarkPreset } from '~/utils/server/handlers/bookmarks';
import { showBookmark } from '~/composables/fetchers';
import { fromLonLat, toLonLat, transformExtent } from 'ol/proj.js';
import NavigraphLayers from '~/components/map/navigraph/NavigraphLayers.vue';
import { useRadarError } from '~/composables/errors';
import { getPilotTrueAltitude, NotamType } from '~/utils/shared/vatsim';
import MapSelectedProcedures from '~/components/map/MapSelectedProcedures.vue';
import { defaults } from 'ol/interaction.js';
import PointerInteraction from 'ol/interaction/Pointer.js';
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import LayerGroup from 'ol/layer/Group.js';
import CloseIcon from 'assets/icons/basic/close.svg?component';
import AnnounceIcon from '~/assets/icons/kit/announce.svg?component';
import ErrorIcon from '~/assets/icons/kit/error.svg?component';
import WarningIcon from '~/assets/icons/kit/warning.svg?component';
import type { VatsimAirportDataNotam } from '~/utils/server/notams';
import { MAX_MAP_ZOOM } from '~/utils/shared';
import MapTerminator from '~/components/map/MapTerminator.vue';
import MapScale from '~/components/map/MapScale.vue';
import MapLayer from '~/components/map/MapLayer.vue';
import MapSigmets from '~/components/map/MapSigmets.vue';
import PopupFullscreen from '~/components/popups/PopupFullscreen.vue';
import MapSettings from '~/components/map/settings/MapSettings.vue';
import MapWeather from '~/components/map/MapWeather.vue';
import MapDistance from '~/components/map/MapDistance.vue';
import MapControls from '~/components/map/MapControls.vue';
import MapMobileWindow from '~/components/map/MapMobileWindow.vue';
import MapAirportsListV2 from '~/components/map/airports/MapAirportsListV2.vue';
import MapSelect from '~/components/map/MapSelect.vue';

defineProps({
    mode: {
        type: String as PropType<'map' | 'sigmets' | 'all'>,
        default: 'all',
    },
});
const emit = defineEmits({
    map(data: { map: Ref<Map | null>; layerGroup: Ref<LayerGroup | null> }) {
        return true;
    },
});
defineSlots<{ default: () => any }>();
const notamRef = useTemplateRef('notam');
const mapContainer = ref<HTMLDivElement | null>(null);
const popups = useTemplateRef<HTMLDivElement | null>('popups');
const popupsHeight = ref(0);
const map = shallowRef<Map | null>(null);
const layer = shallowRef<LayerGroup | null>(null);
const ready = ref(false);
const store = useStore();
const mapStore = useMapStore();
const dataStore = useDataStore();
const router = useRouter();
const route = useRoute();
const isDiscord = ref(route.query.discord === '1');
const filterId = ref(route.query.filter && +route.query.filter);
const bookmarkId = ref(route.query.bookmark && +route.query.bookmark);
const isMobile = useIsMobile();
const config = useRuntimeConfig();

usePointerSwipe(notamRef, {
    threshold: 20,
    onSwipeEnd(_, direction) {
        if (direction === 'up') closeNotam();
    },
});

useSwipe(notamRef, {
    threshold: 20,
    onSwipeEnd(_, direction) {
        if (direction === 'up') closeNotam();
    },
});

if (route.query.discord === '1') {
    router.replace({
        query: {},
    });
}

provide('map', map);
provide('layer-group', layer);

emit('map', {
    map,
    layerGroup: layer,
});

let initialSpawn = false;
let initialOwnCheck = false;

const notamCookie = useCookie<number>('notam-closed', {
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 60 * 60 * 24 * 7,
});

function closeNotam() {
    if (notam.value?.dismissable) {
        notamCookie.value = notam.value.id;
        triggerRef(notamCookie);
    }
}

const notam = computed(() => {
    const activeNotam = dataStore.vatsim.data.notam.value;
    if (!activeNotam) return null;

    if (activeNotam.dismissable && notamCookie.value === activeNotam.id) return null;
    if (activeNotam.activeFrom && new Date(activeNotam.activeFrom).getTime() > dataStore.time.value) return null;
    if (activeNotam.activeTo && new Date(activeNotam.activeTo).getTime() < dataStore.time.value) return null;

    return activeNotam;
});

if (route.query.start !== undefined && route.query.end !== undefined) {
    store.bookingsStartTime.setTime(Number(route.query.start));
    store.bookingsEndTime.setTime(Number(route.query.end));
    store.bookingOverride = true;
}

async function checkAndAddOwnAircraft() {
    if (!store.user?.settings.autoFollow || store.config.hideAllExternal || mapStore.closedOwnOverlay) {
        initialOwnCheck = true;
        return;
    }
    let overlay = mapStore.overlays.find(x => x.key === ownFlight.value?.cid.toString());
    if (overlay) {
        initialOwnCheck = true;
        return;
    }

    const aircraft = ownFlight.value;
    if (!aircraft) {
        initialOwnCheck = true;
        return;
    }

    const shouldTrack = initialOwnCheck || (!route.query.pilot && !route.query.controller && !route.query.atc && !route.query.airport && !route.query.bookmark);

    if (!route.query.airport) {
        if (isPilotOnGround(aircraft)) {
            overlay = await mapStore.addPilotOverlay(aircraft.cid, shouldTrack);
        }
        else if (!initialSpawn) {
            initialSpawn = true;
            overlay = await mapStore.addPilotOverlay(aircraft.cid, shouldTrack);
        }
    }

    initialSpawn = true;
    initialOwnCheck = true;

    if (shouldTrack && overlay && overlay.type === 'pilot' && store.user.settings.autoZoom && !dataStore.vatsim.data.airports.value.some(x => x.aircraft.groundArr?.includes(aircraft.cid))) {
        showPilotOnMap(overlay.data.pilot, map.value);
    }
}

const getRouteZoom = (): number | null => {
    if (typeof route.query.zoom === 'string') {
        const queryZoom = +route.query.zoom;
        if (isNaN(queryZoom)) return null;

        return queryZoom;
    }

    return null;
};

const observerCookie = useCookie<number | false>('observer-for-cid', {
    path: '/',
    secure: true,
});

if (observerCookie.value) {
    mapStore.selectedCid = observerCookie.value;
}

const canShowObserver = computed(() => {
    const mapStore = useMapStore();
    if (skipObserver.value.value || mapStore.selectedCid !== null) return null;

    return !!observerFlight.value;
});

const restoreOverlays = async () => {
    if (store.config.hideAllExternal) return;
    const routeOverlays = Array.isArray(route.query['overlay[]']) ? route.query['overlay[]'] : [route.query['overlay[]'] as string | undefined].filter(x => x);
    const localOverlays = (routeOverlays && routeOverlays.length) ? [] : JSON.parse(localStorage.getItem('overlays') ?? '[]') as Omit<StoreOverlay, 'data'>[];
    await checkAndAddOwnAircraft().catch(useRadarError);

    const fetchedList = (await Promise.all(localOverlays.map(async overlay => {
        const existingOverlay = mapStore.overlays.find(x => x.key === overlay.key);
        if (existingOverlay) return;

        if (overlay.type === 'pilot') {
            const data = await Promise.allSettled([
                $fetch(`/api/data/vatsim/pilot/${ overlay.key }`),
            ]);

            if (!('value' in data[0])) return overlay;

            return {
                ...overlay,
                data: {
                    pilot: data[0].value,
                },
            };
        }
        else if (overlay.type === 'prefile') {
            const data = await Promise.allSettled([
                $fetch(`/api/data/vatsim/pilot/${ overlay.key }/prefile`),
            ]);

            if (!('value' in data[0])) return overlay;

            return {
                ...overlay,
                data: {
                    prefile: data[0].value,
                },
            };
        }
        else if (overlay.type === 'atc') {
            const controller = findAtcByCallsign(overlay.key);
            if (!controller) return overlay;

            return {
                ...overlay,
                data: {
                    callsign: overlay.key,
                },
            };
        }
        else if (overlay.type === 'airport') {
            const vatSpyAirport = useDataStore().vatspy.value?.data.keyAirports.realIcao[overlay.key];
            if (!vatSpyAirport) return;

            const data = await Promise.allSettled([
                $fetch<VatsimAirportData>(`/api/data/vatsim/airport/${ overlay.key }`),
            ]);

            if (!('value' in data[0])) return overlay;

            (async function() {
                const notams = await $fetch<VatsimAirportDataNotam[]>(`/api/data/vatsim/airport/${ overlay.key }/notams`).catch(console.error) ?? [];
                const foundOverlay = mapStore.overlays.find(x => x.key === overlay.key);
                if (foundOverlay) {
                    (foundOverlay as StoreOverlayAirport).data.notams = notams;
                }
            }());

            return {
                ...overlay,
                data: {
                    icao: overlay.key,
                    airport: data[0].value,
                    showTracks: mapStore.autoShowTracks ?? store.user?.settings.autoShowAirportTracks,
                },
            };
        }

        return overlay;
    }))).filter(x => x && 'data' in x && x.data) as StoreOverlay[];

    mapStore.overlays = [
        ...mapStore.overlays,
        ...fetchedList,
    ];

    if (typeof route.query.pilot === 'string' && route.query.pilot) {
        const callsignPilot = dataStore.vatsim.data.pilots.value.find(x => x.callsign === route.query.pilot);
        let cid = route.query.pilot;
        if (callsignPilot) cid = callsignPilot.cid.toString();

        let overlay = mapStore.overlays.find(x => x.key === cid);

        if (!overlay) {
            overlay = await mapStore.addPilotOverlay(cid).catch(console.error) ?? undefined;
        }

        if (overlay && overlay.type === 'pilot' && overlay?.data.pilot) {
            mapStore.overlays.map(x => x.type === 'pilot' && (x.data.tracked = false));
            overlay.data.tracked = true;
            showPilotOnMap(overlay.data.pilot, map.value, getRouteZoom() ?? undefined);
        }
    }
    else if (typeof route.query.controller === 'string' || typeof route.query.atc === 'string') {
        const callsign = (route.query.controller ?? route.query.atc) as string;
        const controller = findAtcByCallsign(callsign);
        if (controller) {
            let overlay = mapStore.overlays.find(x => x.key === callsign);

            if (!overlay) {
                overlay = await mapStore.addAtcOverlay(callsign);
            }

            showAtcOnMap(controller, map.value);

            if (overlay && overlay.type === 'atc' && controller) {
                overlay.sticky = true;
            }
        }
    }
    else if (route.query.airport) {
        let overlay = mapStore.overlays.find(x => x.key === route.query.airport as string);

        if (!overlay) {
            overlay = await mapStore.addAirportOverlay(route.query.airport as string);
        }

        const airport = dataStore.vatspy.value?.data.keyAirports.realIcao[route.query.airport as string];

        if (overlay && overlay.type === 'airport' && airport) {
            overlay.sticky = true;
            showAirportOnMap(airport, map.value, getRouteZoom() ?? undefined);
        }
    }

    if (routeOverlays?.length) {
        for (const overlay of routeOverlays) {
            if (!overlay) continue;
            const data = overlay.split(';');

            const type = data.find(x => x.startsWith('type='))?.split('=')[1];
            const key = data.find(x => x.startsWith('key='))?.split('=')[1];
            const sticky = data.find(x => x.startsWith('sticky='))?.split('=')[1] === '1';
            const collapsed = data.find(x => x.startsWith('collapsed='))?.split('=')[1] === '1';

            if (!type || !key) continue;

            switch (type) {
                case 'pilot':
                    await mapStore.addPilotOverlay(key, undefined, { sticky, collapsed });
                    break;
                case 'prefile':
                    await mapStore.addPrefileOverlay(key, { sticky, collapsed });
                    break;
                case 'airport':
                    await mapStore.addAirportOverlay(key, undefined, { sticky, collapsed });
                    break;
                case 'atc':
                    await mapStore.addAtcOverlay(key, { sticky, collapsed });
                    break;
            }
        }
    }
};

function updateMapCursor() {
    if (!mapStore.mapCursorPointerTrigger) {
        map.value!.getTargetElement().style.cursor = 'grab';
    }
    else {
        map.value!.getTargetElement().style.cursor = 'pointer';
    }
}

watch(() => mapStore.mapCursorPointerTrigger, updateMapCursor);

watch(() => store.localSettings.distance?.enabled, val => {
    if (!val) return;

    if (!localStorage.getItem('distance-tool-tutorial-seen')) {
        mapStore.distance.tutorial = true;
        localStorage.setItem('distance-tool-tutorial-seen', '1');
    }
});

useUpdateInterval(() => {
    if (store.mapSettings.vatglasses?.autoLevel === false || !store.user) return;

    const user = ownFlight.value;
    if (!user) return;

    setUserLocalSettings({
        vatglassesLevel: Math.round(getPilotTrueAltitude(user) / 500) * 5,
    });

    if (store.mapSettings.navigraphData?.isModeAuto !== false) {
        setUserMapSettings({
            navigraphData: {
                mode: getPilotTrueAltitude(user) >= 18000 ? 'ifrHigh' : 'ifrLow',
            },
        });
    }
});

const overlays = computed(() => mapStore.overlays);
const overlaysGap = 16;
const overlaysHeight = computed(() => {
    if (mapStore.overlays.length <= 1) return 'auto';
    return mapStore.overlays.reduce((acc, { _maxHeight }) => acc + (_maxHeight ?? 0), 0) + (overlaysGap * (mapStore.overlays.length - 1));
});

useLazyAsyncData('bookmarks', async () => {
    if (store.user) {
        await store.fetchBookmarks();
    }

    return true;
}, {
    server: false,
});

watch([isMobile, popups], () => {
    mapStore.overlays.forEach(x => x._maxHeight = undefined);
    popupsHeight.value = popups.value?.clientHeight ?? 0;
});

watch([overlays, popupsHeight, isMobile], async () => {
    await nextTick();
    if (!popups.value && !isMobile.value) return;
    if (import.meta.server) return;

    if (popups.value) {
        const baseHeight = 56;
        const collapsed = mapStore.overlays.filter(x => x.collapsed);
        const uncollapsed = mapStore.overlays.filter(x => !x.collapsed);

        const collapsedHeight = collapsed.length * baseHeight;
        const totalHeight = popups.value.clientHeight - (overlaysGap * (mapStore.overlays.length - 1));

        // Max 4 uncollapsed on screen
        const minHeight = Math.floor(totalHeight / 4);
        const maxUncollapsed = Math.floor((totalHeight - collapsedHeight) / minHeight);

        const maxHeight = Math.floor((totalHeight - collapsedHeight) / (uncollapsed.length < maxUncollapsed ? uncollapsed.length : maxUncollapsed));

        collapsed.forEach(overlay => {
            overlay._maxHeight = baseHeight;
        });

        uncollapsed.forEach((overlay, index) => {
            if (index < maxUncollapsed) {
                overlay._maxHeight = (overlay.maxHeight && overlay.maxHeight < maxHeight) ? overlay.maxHeight : maxHeight;
            }
            else {
                overlay.collapsed = true;
            }
        });
    }

    if (!store.config.airport) {
        localStorage.setItem('overlays', JSON.stringify(
            overlays.value.map(x => ({
                ...x,
                data: undefined,
            })),
        ));
    }
}, {
    deep: true,
});

let moving = true;
let success = false;

async function handleMoveEnd() {
    if (!success) return;
    moving = false;
    const view = map.value!.getView();
    mapStore.zoom = view.getZoom() ?? 0;
    mapStore.rotation = toDegrees(view.getRotation() ?? 0);
    mapStore.extent = view.calculateExtent(map.value!.getSize());
    mapStore.center = view.getCenter()!;

    const query = {
        ...route.query,
        center: mapStore.center.map(x => x.toFixed(5))?.join(','),
        zoom: mapStore.zoom.toFixed(2),
    };

    if (initialOwnCheck && !store.mapSettings.disableQueryUpdate) {
        router.replace({
            query,
        });
    }

    const targetOrigin = config.public.DOMAIN;
    window.parent.postMessage({
        type: 'move',
        query,
    }, targetOrigin);

    setUserLocalSettings({
        location: mapStore.center,
        zoom: mapStore.zoom,
    });

    await sleep(300);
    if (moving) return;
    mapStore.moving = false;
}

let lastClickTime = 0;

async function initDistance(event: MapBrowserEvent) {
    const pilots = getPilotsForPixel(map.value!, event.pixel);
    if (pilots.length === 1) {
        mapStore.distance.initAircraft = pilots[0].cid;
    }

    mapStore.distance.pixel = map.value!.getCoordinateFromPixel(event.pixel);
    mapStore.distance.overlayOpenCheck = true;
}

let overlaysCache: typeof mapStore.overlays = [];

function handleDownEvent(event: MapBrowserEvent) {
    if (mapStore.distance.pixel) return false;
    const now = Date.now();

    if (store.localSettings.distance?.ctrlClick) {
        overlaysCache = mapStore.overlays.slice(0);
        if (event.originalEvent.ctrlKey || event.originalEvent.metaKey) {
            initDistance(event).then(async () => {
                await nextTick();
                mapStore.overlays = overlaysCache;
            });

            return true;
        }

        return false;
    }

    if (now - lastClickTime < 300) {
        initDistance(event).then(async () => {
            await nextTick();
            mapStore.overlays = overlaysCache;
        });
        lastClickTime = 0;

        return true;
    }
    else overlaysCache = mapStore.overlays.slice(0);

    lastClickTime = now;

    return false;
}

class DoubleClick extends PointerInteraction {
    constructor() {
        super({
            handleDownEvent,
        });
    }
}

const doubleClick = new DoubleClick();

function setMapInteractions() {
    if (!map.value) return;
    const withDistance = store.localSettings.distance?.enabled;
    const ctrl = store.localSettings.distance?.ctrlClick;

    map.value.getInteractions().forEach(x => map.value?.removeInteraction(x));
    map.value.getInteractions().clear();

    if (withDistance) {
        const interactions = defaults({
            doubleClickZoom: !!ctrl,
        }).extend([
            doubleClick,
        ]);

        interactions.forEach(x => map.value?.addInteraction(x));
    }
    else {
        const interactions = defaults();

        interactions.forEach(x => map.value?.addInteraction(x));
    }
}

watch(() => store.localSettings.distance?.enabled, setMapInteractions);
watch(() => store.localSettings.distance?.ctrlClick, setMapInteractions);

await setupDataFetch({
    async onMount() {
        if (typeof route.query.airline === 'string') {
            setUserActiveFilter({
                users: {
                    pilots: {
                        type: 'prefix',
                        value: [route.query.airline],
                    },
                },
            }, false);
        }
        else if (typeof route.query.aircraft === 'string') {
            setUserActiveFilter({
                flights: {
                    aircraft: [route.query.aircraft],
                },
            }, false);
        }
        else if (typeof route.query.route === 'string' && route.query.route.split('-').length === 2) {
            setUserActiveFilter({
                airports: {
                    routes: [route.query.route],
                },
            }, false);
        }
    },
    async onFetch() {
        await checkAndAddOwnAircraft();
    },
    async onSuccessCallback() {
        const view = new View({
            center: [37.617633, 55.755820],
            zoom: 2,
            multiWorld: true,
        });

        let projectionExtent = view.getProjection().getExtent().slice();

        projectionExtent[0] *= 2.5;
        projectionExtent[1] *= 2;
        projectionExtent[2] *= 2.5;
        projectionExtent[3] *= 2;

        let center = store.localSettings.location ?? [37.617633, 55.755820];
        let zoom = store.localSettings.zoom ?? 3;

        if (store.config.airport) {
            const airport = dataStore.vatspy.value?.data.keyAirports.realIcao[store.config.airport];

            if (airport) {
                center = [airport.lon, airport.lat];
            }

            if (airport && !store.config.showInfoForPrimaryAirport) {
                const [lon, lat] = fromLonLat([airport.lon, airport.lat]);

                projectionExtent = [
                    lon - 0.9,
                    lat - 0.9,
                    lon + 0.9,
                    lat + 0.9,
                ];
            }
        }
        else if (store.config.area) {
            projectionExtent = buffer(boundingExtent(store.config.area.map(x => fromLonLat(x))), 200000);
            center = toLonLat(getCenter(projectionExtent));
        }
        else if (store.config.airports && !store.config.center) {
            const airports = dataStore.vatspy.value?.data.airports.filter(x => store.config.airports?.includes(x.icao)) ?? [];

            if (airports.length) {
                projectionExtent = buffer(boundingExtent(airports.map(x => fromLonLat([x.lon, x.lat]))), 0.5);
                center = toLonLat(getCenter(projectionExtent));
            }
        }

        if (store.config.center) center = store.config.center;

        if (store.config.zoom) zoom = store.config.zoom;
        else if (store.config.airport) {
            zoom = store.config.showInfoForPrimaryAirport ? 12 : 14;
        }
        else if (store.config.airports?.length) zoom = 1;
        if (typeof route.query.center === 'string' && route.query.center) {
            const coords = route.query.center.split(',').map(x => +x);
            if (coords[0] > 300 || coords[0] < -300 || isNaN(coords[0])) coords[0] = 37.617633;
            if (isNaN(coords[1])) coords[1] = 55.755820;
            if (coords.length === 2 && !coords.some(x => typeof x !== 'number' || isNaN(x))) {
                center = coords;
            }
        }

        if (center[0] > 300 || center[0] < -300 || isNaN(center[0])) center[0] = 37.617633;
        if (isNaN(center[1])) center[1] = 55.755820;

        if (typeof route.query.tracks === 'string') {
            mapStore.autoShowTracks = route.query.tracks === '1';
        }

        const routeZoom = getRouteZoom();

        if (routeZoom) zoom = routeZoom;

        map.value = new Map({
            target: mapContainer.value!,
            controls: [
                new Attribution({
                    collapsible: false,
                    collapsed: false,
                }),
            ],
            interactions: [],
            maxTilesLoading: 128,
            view: new View({
                center,
                zoom,
                minZoom: 2,
                maxZoom: MAX_MAP_ZOOM,
                multiWorld: true,
                showFullExtent: (!!store.config.airports?.length || !!store.config.area) && (!store.config.center && !store.config.zoom),
                extent: transformExtent(projectionExtent, 'EPSG:3857', 'EPSG:4326'),
            }),
        });
        layer.value = new LayerGroup();

        setMapInteractions();

        const mapView = map.value.getView();
        mapStore.zoom = mapView.getZoom() ?? 0;
        mapStore.rotation = toDegrees(mapView.getRotation() ?? 0);
        mapStore.extent = mapView.calculateExtent(map.value!.getSize());
        mapStore.center = mapView.getCenter()!;
        ready.value = true;

        map.value.getTargetElement().style.cursor = 'grab';
        map.value.on('pointerdrag', function() {
            map.value!.getTargetElement().style.cursor = 'grabbing';
        });
        map.value.on('pointermove', updateMapCursor);

        mapStore.extent = map.value!.getView().calculateExtent(map.value!.getSize());
        mapStore.center = map.value!.getView().getCenter()!;

        map.value.getTargetElement().addEventListener('mousedown', event => {
            const target = event.target as HTMLCanvasElement;
            if (!target.nodeName.toLowerCase().includes('canvas')) return;

            if (event.button === 1) {
                const center = fromLonLat(map.value!.getView().getCenter() as Coordinate);
                const resolution = map.value!.getView().getResolution();
                let increaseX = window.innerWidth / 2;
                let increaseY = window.innerHeight / 2;

                const halfWidth = target.width / 2;
                const halfHeight = target.height / 2;

                const isLeft = event.clientX < halfWidth;
                const isTop = event.clientY < halfHeight;

                if (isLeft) increaseX *= 1 - (event.clientX / halfWidth);
                else increaseX *= (event.clientX - halfWidth) / (target.width / 2);

                if (isTop) increaseY *= 1 - (event.clientY / halfHeight);
                else increaseY *= (event.clientY - halfHeight) / (target.height / 2);

                if (isLeft) center[0] -= increaseX * resolution!;
                else center[0] += increaseX * resolution!;
                if (isTop) center[1] += increaseY * resolution!;
                else center[1] -= increaseY * resolution!;

                if (center.some(x => isNaN(x))) return;

                map.value!.getView().animate({ center: toLonLat(center), duration: 300 });
            }
        });

        await nextTick();
        popupsHeight.value = popups.value?.clientHeight ?? 0;

        if (popups.value) {
            const resizeObserver = new ResizeObserver(() => {
                popupsHeight.value = popups.value?.clientHeight ?? 0;
            });
            resizeObserver.observe(popups.value!);
        }

        await restoreOverlays();

        map.value.on('movestart', () => {
            moving = true;
            mapStore.moving = true;
        });
        map.value.on('moveend', async () => {
            moving = false;
            handleMoveEnd();
        });

        if (filterId.value) {
            const filter = await $fetch<UserFilterPreset>(`/api/user/filters/${ filterId.value }`).catch(() => {});
            if (filter) {
                setUserActiveFilter(filter.json, false);
                setUserFilter(filter.json);
                store.getVATSIMData(true);
            }
        }

        if (bookmarkId.value) {
            const bookmark = await $fetch<UserBookmarkPreset>(`/api/user/bookmarks/${ bookmarkId.value }`).catch(() => {});
            if (bookmark) {
                showBookmark(bookmark.json, map.value);
            }
        }

        success = true;
    },
});

function handleKeys(event: KeyboardEvent) {
    if (!event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) return;

    const bookmark = store.bookmarks.find(x => {
        const binding = x.json.binding;
        if (!binding?.keys) return false;

        return binding.code === event.code && binding.keys?.ctrl === event.ctrlKey && binding.keys.alt === event.altKey && binding.keys.meta === event.metaKey && binding.keys.shift === event.shiftKey;
    });

    if (!bookmark) return;

    event.preventDefault();
    showBookmark(bookmark.json, map.value);
}

onMounted(() => {
    if (route.query.vg === '1' || route.query.vg === '0') {
        setUserMapSettings({
            vatglasses: {
                active: route.query.vg === '1',
            },
        });
    }

    document.addEventListener('keydown', handleKeys, {
        capture: true,
    });
});

onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeys, {
        capture: true,
    });
});
</script>

<style lang="scss">
.app_content:only-child {
    padding: 0 !important;

    .map_container > * {
        border-radius: 0;
    }
}
</style>

<style lang="scss" scoped>
.map {
    position: relative;

    display: flex;
    flex: 1 0 auto;
    flex-direction: column;

    width: 100%;
    border-radius: 16px;

    &_container {
        z-index: 5;
        display: flex;
        flex: 1 0 auto;
        flex-direction: column;

        :deep(>*) {
            flex: 1 0 auto;
            border-radius: 16px;
        }
    }

    &_notam {
        user-select: none;

        position: absolute;
        z-index: 6;
        top: 16px;
        right: 16px;
        left: 16px + 40px + 16px;

        display: flex;
        gap: 8px;
        align-items: center;

        width: calc(100vw - 16px - 40px - 16px - 16px - 24px);
        min-height: 40px;
        padding: 10px 12px;
        border-radius: 8px;

        font-size: 14px;
        line-height: 100%;
        color: $lightgray125Orig;

        &--dismissable {
            cursor: grab;

            &:active {
                cursor: grabbing;
            }
        }

        @include mobileOnly {
            align-items: flex-start;
            width: calc(100vw - 16px - 40px - 16px - 16px - 16px);
            font-size: 12px;
            line-height: 130%;
        }

        :deep(a) {
            color: currentColor !important;
        }

        &--appear {
            &-enter-active,
            &-leave-active {
                transition: 0.3s ease-in-out;
            }

            &-enter-from,
            &-leave-to {
                top: 0;
                opacity: 0;
            }
        }

        &--type-WARNING {
            color: $darkgray850Orig;
            background: $warning500;
        }

        &--type-ERROR {
            background: $error500;
        }

        &--type-ANNOUNCEMENT {
            background: $primary500;
        }

        &_icon {
            width: 20px;
            min-width: 20px;
        }

        &_spacer {
            flex: 1 0 auto;
        }

        &_text {
            cursor: default;
            user-select: unset;
        }

        &_close {
            cursor: pointer;

            display: flex;
            align-items: center;
            justify-content: flex-end;

            width: 20px;
            min-width: 20px;
            height: 20px;

            opacity: 0.8;

            svg {
                width: 12px;
            }

            @include hover {
                transition: 0.3s;

                &:hover {
                    opacity: 1;
                }
            }
        }
    }

    &_logo {
        position: absolute;
        z-index: 5;
        bottom: 16px;
        left: 16px;

        text-decoration: none;
    }

    :deep(.ol-attribution) {
        background: $darkgray1000;

        @include mobile {
            background: transparent;
        }

        ul {
            text-shadow: none;

            &, a {
                color: varToRgba('lightgray150', 0.4);
            }

            @include hover {
                a:hover {
                    text-decoration: underline;
                }
            }
        }
    }

    &_popups {
        position: absolute;
        top: 24px;
        left: 24px;

        display: flex;
        align-items: flex-start;
        justify-content: flex-end;

        width: calc(100% - 48px);
        height: calc(100% - 48px);

        @include mobileOnly {
            left: 40px + 8px + 16px;
            width: calc(100% - 40px - 8px - 8px - 16px);
        }

        &_list {
            z-index: 6;

            display: flex;
            flex-direction: column;
            gap: 16px;

            max-height: var(--overlays-height);

            transition: 0.5s ease-in-out;

            @include mobileOnly {
                &:not(&--empty) {
                    width: 100%;
                }
            }
        }

        &--single .map_popups_list {
            max-height: unset;
        }

        &_popup {
            max-height: 100%;
            margin: 0;

            &--appear {
                &-enter-active,
                &-leave-active {
                    overflow: hidden;
                    max-height: var(--max-height);
                    transition: 0.5s ease-in-out;
                }

                &-enter-from,
                &-leave-to {
                    transform: translate(30px, -30px);
                    max-height: 0;
                    margin-top: -16px;
                    opacity: 0;
                }
            }
        }
    }
}
</style>
