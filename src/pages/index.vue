<template>
    <div class="map">
        <div
            ref="mapContainer"
            class="map_container"
        />

        <div
            v-if="ready && !isMobile"
            v-show="!store.config.hideOverlays"
            ref="popups"
            class="map_popups"
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
                    <map-popup
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
                <map-aircraft-list/>
                <map-sectors-list
                    v-if="!store.config.hideSectors"
                    :key="String(store.localSettings.filters?.layers?.layer)"
                />
                <map-airports-list v-if="!store.config.hideAirports"/>
                <map-weather v-if="!store.config.hideHeader"/>
                <a
                    v-if="store.config.showCornerLogo"
                    class="map_logo"
                    href="https://vatsim-radar.com"
                    target="_blank"
                >
                    <common-logo
                        font-size="14px"
                        width="50px"
                    />
                </a>
            </client-only>
        </div>
        <client-only v-if="ready">
            <map-layer :key="(store.theme ?? 'default')"/>
            <map-filters v-if="!store.config.hideHeader"/>
        </client-only>
        <common-popup
            v-if="route.query"
            v-model="isDiscord"
        >
            <template #title>
                Authorization confirmation
            </template>

            You have successfully verified in VATSIM Radar Discord.
        </common-popup>
        <common-popup :model-value="store.presetImport.preset === false">
            <template #title>Preset Import</template>
            Preset import failed. That could be because preset name length is more than 30 symbols, invalid JSON, or an error in yours or ours network.
            <template #actions>
                <common-button @click="store.presetImport.preset = null">
                    Thanks, I guess?
                </common-button>
            </template>
        </common-popup>
        <common-popup
            :model-value="!!store.presetImport.preset && typeof store.presetImport.preset === 'object'"
            width="600px"
        >
            <template #title>Preset Import</template>

            Warning: preset import will overwrite your current preset.<br><br>

            <common-input-text
                v-model="store.presetImport.name"
                placeholder="Enter a name for new preset"
            />

            <template #actions>
                <common-button
                    type="secondary-875"
                    @click="store.presetImport.preset = null"
                >
                    Cancel import
                </common-button>
                <common-button
                    :disabled="!store.presetImport.name"
                    @click="store.presetImport.save!()"
                >
                    Import preset
                </common-button>
            </template>
        </common-popup>
        <common-popup
            :model-value="!!store.presetImport.error"
            @update:modelValue="$event === false && (store.presetImport.error = $event)"
        >
            <template #title>
                A preset with this name already exists
            </template>

            You are trying to save preset with same name as you already have.<br> Do you maybe want to override it?

            <template #actions>
                <common-button
                    hover-color="error700"
                    primary-color="error500"
                    @click="typeof store.presetImport.error === 'function' && store.presetImport.error().then(() => store.presetImport.error = false)"
                >
                    Overwrite my old preset
                </common-button>
                <common-button @click="store.presetImport.error = false">
                    I'll rename it
                </common-button>
            </template>
        </common-popup>
    </div>
</template>

<script setup lang="ts">
import '@@/node_modules/ol/ol.css';
import { Map, View } from 'ol';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Attribution } from 'ol/control';
import MapSectorsList from '~/components/map/sectors/MapSectorsList.vue';
import MapAircraftList from '~/components/map/aircraft/MapAircraftList.vue';
import { useStore } from '~/store';
import { setupDataFetch } from '~/composables/data';
import MapPopup from '~/components/map/popups/MapPopup.vue';
import { useIframeHeader } from '~/composables';
import { useMapStore } from '~/store/map';
import type { StoreOverlayAirport, StoreOverlay } from '~/store/map';
import { showPilotOnMap } from '~/composables/pilots';
import { findAtcByCallsign } from '~/composables/atc';
import type { VatsimAirportData } from '~/server/api/data/vatsim/airport/[icao]';
import type { VatsimAirportDataNotam } from '~/server/api/data/vatsim/airport/[icao]/notams';
import { boundingExtent, buffer, getCenter } from 'ol/extent';
import { toDegrees } from 'ol/math';
import type { Coordinate } from 'ol/coordinate';
import CommonLogo from '~/components/common/basic/CommonLogo.vue';
import { setUserLocalSettings } from '~/composables/fetchers/map-settings';
import CommonInputText from '~/components/common/basic/CommonInputText.vue';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import type { UserFilterPreset } from '~/utils/backend/handlers/filters';
import type { UserBookmarkPreset } from '~/utils/backend/handlers/bookmarks';
import { showBookmark } from '~/composables/fetchers';

const emit = defineEmits({
    map(map: Ref<Map | null>) {
        return true;
    },
});
const mapContainer = ref<HTMLDivElement | null>(null);
const popups = ref<HTMLDivElement | null>(null);
const popupsHeight = ref(0);
const map = shallowRef<Map | null>(null);
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
const isMobileOrTablet = useIsMobileOrTablet();
const config = useRuntimeConfig();

if (route.query.discord === '1') {
    router.replace({
        query: {},
    });
}

provide('map', map);
emit('map', map);

let initialSpawn = false;
let initialOwnCheck = false;

useIframeHeader();

async function checkAndAddOwnAircraft() {
    if (!store.user?.settings.autoFollow || store.config.hideAllExternal || mapStore.closedOwnOverlay) {
        initialOwnCheck = true;
        return;
    }
    let overlay = mapStore.overlays.find(x => x.key === store.user?.cid);
    if (overlay) {
        initialOwnCheck = true;
        return;
    }

    const aircraft = dataStore.vatsim.data.pilots.value.find(x => x.cid === +store.user!.cid);
    if (!aircraft) {
        initialOwnCheck = true;
        return;
    }

    const shouldTrack = initialOwnCheck || (!route.query.center && !route.query.pilot && !route.query.controller && !route.query.atc && !route.query.airport && !route.query.bookmark);

    if (isPilotOnGround(aircraft)) {
        overlay = await mapStore.addPilotOverlay(store.user.cid, shouldTrack);
    }
    else if (!initialSpawn) {
        initialSpawn = true;
        overlay = await mapStore.addPilotOverlay(store.user.cid, shouldTrack);
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

const restoreOverlays = async () => {
    if (store.config.hideAllExternal) return;
    const routeOverlays = Array.isArray(route.query['overlay[]']) ? route.query['overlay[]'] : [route.query['overlay[]'] as string | undefined].filter(x => x);
    const overlays = (routeOverlays && routeOverlays.length) ? [] : JSON.parse(localStorage.getItem('overlays') ?? '[]') as Omit<StoreOverlay, 'data'>[];
    await checkAndAddOwnAircraft().catch(console.error);

    const fetchedList = (await Promise.all(overlays.map(async overlay => {
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
            const vatSpyAirport = useDataStore().vatspy.value?.data.airports.find(x => x.icao === overlay.key);
            if (!vatSpyAirport) return;

            const data = await Promise.allSettled([
                $fetch<VatsimAirportData>(`/api/data/vatsim/airport/${ overlay.key }`),
            ]);

            if (!('value' in data[0])) return overlay;

            (async function() {
                const notams = await $fetch<VatsimAirportDataNotam[]>(`/api/data/vatsim/airport/${ overlay.key }/notams`) ?? [];
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
            overlay = await mapStore.addPilotOverlay(cid);
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

        const airport = dataStore.vatspy.value?.data.airports.find(x => x.icao === route.query.airport as string);

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

            let addedOverlay;

            switch (type) {
                case 'pilot':
                    addedOverlay = await mapStore.addPilotOverlay(key);
                    break;
                case 'prefile':
                    addedOverlay = await mapStore.addPrefileOverlay(key);
                    break;
                case 'airport':
                    addedOverlay = await mapStore.addAirportOverlay(key);
                    break;
                case 'atc':
                    addedOverlay = await mapStore.addAtcOverlay(key);
                    break;
            }

            if (addedOverlay) {
                addedOverlay.sticky = sticky;
                addedOverlay.collapsed = collapsed;
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

useUpdateInterval(() => {
    if (store.mapSettings.vatglasses?.autoLevel === false || !store.user) return;

    const user = dataStore.vatsim.data.pilots.value.find(x => x.cid === +store.user!.cid);
    if (!user) return;

    setUserLocalSettings({
        vatglassesLevel: Math.round(user.altitude / 1000) * 10,
    });
});

const overlays = computed(() => mapStore.overlays);
const overlaysGap = 16;
const overlaysHeight = computed(() => {
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

useHead(() => ({
    link: [
        {
            rel: 'canonical',
            href: `${ config.public.DOMAIN }`,
        },
    ],
}));

watch([overlays, popupsHeight], () => {
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

    const query = {
        ...route.query,
        center: toLonLat(view.getCenter()!).map(x => x.toFixed(5))?.join(','),
        zoom: view.getZoom()?.toFixed(2),
    };

    if (initialOwnCheck) {
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
        location: view.getCenter(),
        zoom: view.getZoom(),
    });

    await sleep(300);
    if (moving) return;
    mapStore.moving = false;
}

await setupDataFetch({
    async onFetch() {
        await checkAndAddOwnAircraft();
    },
    async onSuccessCallback() {
        ready.value = true;

        const view = new View({
            center: fromLonLat([37.617633, 55.755820]),
            zoom: 2,
            multiWorld: false,
        });

        let projectionExtent = view.getProjection().getExtent().slice();

        projectionExtent[0] *= 2.5;
        projectionExtent[1] *= 1.4;
        projectionExtent[2] *= 2.5;
        projectionExtent[3] *= 1.4;

        let center = store.localSettings.location ?? fromLonLat([37.617633, 55.755820]);
        let zoom = store.localSettings.zoom ?? 3;

        if (store.config.airport) {
            const airport = dataStore.vatspy.value?.data.airports.find(x => store.config.airport === x.icao);

            if (airport) {
                center = [airport.lon, airport.lat];
            }

            if (airport && !store.config.showInfoForPrimaryAirport) {
                projectionExtent = [
                    airport.lon - 200000,
                    airport.lat - 200000,
                    airport.lon + 200000,
                    airport.lat + 200000,
                ];
            }
        }
        else if (store.config.area) {
            projectionExtent = buffer(boundingExtent(store.config.area), 200000);
            center = getCenter(projectionExtent);
        }
        else if (store.config.airports && !store.config.center) {
            const airports = dataStore.vatspy.value?.data.airports.filter(x => store.config.airports?.includes(x.icao)) ?? [];

            if (airports.length) {
                projectionExtent = buffer(boundingExtent(airports.map(x => [x.lon, x.lat])), 200000);
                center = getCenter(projectionExtent);
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
            if (coords.length === 2 && !coords.some(x => typeof x !== 'number' || isNaN(x))) {
                center = fromLonLat(coords);
            }
        }

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
            maxTilesLoading: 128,
            view: new View({
                center,
                zoom,
                minZoom: 2,
                maxZoom: 24,
                multiWorld: false,
                showFullExtent: (!!store.config.airports?.length || !!store.config.area) && (!store.config.center && !store.config.zoom),
                extent: projectionExtent,
            }),
        });

        if (isMobileOrTablet.value) {
            let dblClickInteraction;

            if (dblClickInteraction) {
                map.value.removeInteraction(dblClickInteraction);
            }
        }

        map.value.getTargetElement().style.cursor = 'grab';
        map.value.on('pointerdrag', function() {
            map.value!.getTargetElement().style.cursor = 'grabbing';
        });
        map.value.on('pointermove', updateMapCursor);

        mapStore.extent = map.value!.getView().calculateExtent(map.value!.getSize());

        map.value.getTargetElement().addEventListener('mousedown', event => {
            const target = event.target as HTMLCanvasElement;
            if (!target.nodeName.toLowerCase().includes('canvas')) return;

            if (event.button === 1) {
                const center = map.value!.getView().getCenter() as Coordinate;
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

                map.value!.getView().animate({ center, duration: 300 });
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
                setUserActiveFilter(filter.json);
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

onMounted(() => {
    if (route.query.vg === '1' || route.query.vg === '0') {
        setUserMapSettings({
            vatglasses: {
                active: route.query.vg === '1',
            },
        });
    }

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

    document.addEventListener('keydown', handleKeys, {
        capture: true,
    });

    onBeforeUnmount(() => {
        document.removeEventListener('keydown', handleKeys, {
            capture: true,
        });
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

        &_popup {
            max-height: 100%;
            margin: 0;

            &--appear {
                &-enter-active,
                &-leave-active {
                    overflow: hidden;
                    transition: 0.5s ease-in-out;
                }

                &-enter-from,
                &-leave-to {
                    transform: translate(30px, -30px);

                    height: 0;
                    max-height: 0;
                    margin-top: -16px;

                    opacity: 0;
                }
            }
        }
    }
}
</style>
