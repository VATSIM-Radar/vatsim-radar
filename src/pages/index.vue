<template>
    <div class="map">
        <div
            ref="mapContainer"
            class="map_container"
        />
        <div
            v-if="ready && !store.config.hideOverlays"
            ref="popups"
            class="map_popups"
            :style="{
                '--popups-height': `${ popupsHeight }px`,
                '--overlays-height': `${ overlaysHeight }px`,
            }"
        >
            <div
                v-if="popupsHeight"
                class="map_popups_list"
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
        <map-controls v-if="!store.config.hideAllExternal"/>
        <div :key="store.theme ?? 'default'">
            <client-only v-if="ready">
                <map-aircraft-list/>
                <map-sectors-list v-if="!store.config.hideSectors"/>
                <map-airports-list v-if="!store.config.hideAirports"/>
                <map-filters v-if="!store.config.hideHeader"/>
                <map-layer/>
                <map-weather v-if="!store.config.hideHeader"/>
            </client-only>
        </div>
    </div>
</template>

<script setup lang="ts">
import '@@/node_modules/ol/ol.css';
import { Map, View } from 'ol';
import { fromLonLat } from 'ol/proj';
import { Attribution } from 'ol/control';
import MapSectorsList from '~/components/map/sectors/MapSectorsList.vue';
import MapAircraftList from '~/components/map/aircraft/MapAircraftList.vue';
import { useStore } from '~/store';
import { setupDataFetch } from '~/composables/data';
import MapPopup from '~/components/map/popups/MapPopup.vue';
import { setUserLocalSettings, useIframeHeader } from '~/composables';
import { useMapStore } from '~/store/map';
import type { StoreOverlayAirport, StoreOverlay } from '~/store/map';
import { showPilotOnMap } from '~/composables/pilots';
import { findAtcByCallsign } from '~/composables/atc';
import type { VatsimAirportData } from '~/server/api/data/vatsim/airport/[icao]';
import type { VatsimAirportDataNotam } from '~/server/api/data/vatsim/airport/[icao]/notams';
import { boundingExtent, buffer, getCenter } from 'ol/extent';
import { toDegrees } from 'ol/math';
import type { Coordinate } from 'ol/coordinate';

const mapContainer = ref<HTMLDivElement | null>(null);
const popups = ref<HTMLDivElement | null>(null);
const popupsHeight = ref(0);
const map = shallowRef<Map | null>(null);
const ready = ref(false);
const store = useStore();
const mapStore = useMapStore();
const dataStore = useDataStore();
const route = useRoute();

provide('map', map);

let initialSpawn = false;

useIframeHeader();

async function checkAndAddOwnAircraft() {
    if (!store.user?.settings.autoFollow || store.config.hideAllExternal) return;
    let overlay = mapStore.overlays.find(x => x.key === store.user?.cid);
    if (overlay) return;

    const aircraft = dataStore.vatsim.data.pilots.value.find(x => x.cid === +store.user!.cid);
    if (!aircraft) return;

    if (isPilotOnGround(aircraft)) {
        overlay = await mapStore.addPilotOverlay(store.user.cid, true);
    }
    else if (!initialSpawn) {
        initialSpawn = true;
        overlay = await mapStore.addPilotOverlay(store.user.cid, true);
    }

    if (overlay && overlay.type === 'pilot' && store.user.settings.autoZoom && !dataStore.vatsim.data.airports.value.some(x => x.aircraft.groundArr?.includes(aircraft.cid))) {
        showPilotOnMap(overlay.data.pilot, map.value);
    }
}

const restoreOverlays = async () => {
    if (store.config.hideAllExternal) return;
    const overlays = JSON.parse(localStorage.getItem('overlays') ?? '[]') as Omit<StoreOverlay, 'data'>[];
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
                    showTracks: store.user?.settings.autoShowAirportTracks,
                },
            };
        }

        return overlay;
    }))).filter(x => x && 'data' in x && x.data) as StoreOverlay[];

    mapStore.overlays = [
        ...mapStore.overlays,
        ...fetchedList,
    ];

    if (route.query.pilot) {
        let overlay = mapStore.overlays.find(x => x.key === route.query.pilot as string);

        if (!overlay) {
            overlay = await mapStore.addPilotOverlay(route.query.pilot as string);
        }

        if (overlay && overlay.type === 'pilot' && overlay?.data.pilot) {
            overlay.data.tracked = true;
            showPilotOnMap(overlay.data.pilot, map.value);
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
            showAirportOnMap(airport, map.value);
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

const overlays = computed(() => mapStore.overlays);
const overlaysGap = 16;
const overlaysHeight = computed(() => {
    return mapStore.overlays.reduce((acc, { _maxHeight }) => acc + (_maxHeight ?? 0), 0) + (overlaysGap * (mapStore.overlays.length - 1));
});

watch([overlays, popupsHeight], () => {
    if (!popups.value) return;
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

    localStorage.setItem('overlays', JSON.stringify(
        overlays.value.map(x => ({
            ...x,
            data: undefined,
        })),
    ));
}, {
    deep: true,
    immediate: true,
});

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

        projectionExtent[0] *= 2;
        projectionExtent[2] *= 2;

        let center = store.localSettings.location ?? fromLonLat([37.617633, 55.755820]);

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
        else if (store.config.airports) {
            const airports = dataStore.vatspy.value?.data.airports.filter(x => store.config.airports?.includes(x.icao)) ?? [];

            if (airports.length) {
                projectionExtent = buffer(boundingExtent(airports.map(x => [x.lon, x.lat])), 200000);
                center = getCenter(projectionExtent);
            }
        }

        map.value = new Map({
            target: mapContainer.value!,
            controls: [
                new Attribution({
                    collapsible: false,
                    collapsed: false,
                }),
            ],
            view: new View({
                center,
                zoom: store.config.airport
                    ? store.config.showInfoForPrimaryAirport ? 12 : 14
                    : store.config.airports?.length ? 1 : store.localSettings.zoom ?? 3,
                minZoom: 3,
                multiWorld: false,
                showFullExtent: !!store.config.airports?.length,
                extent: projectionExtent,
            }),
        });

        map.value.getTargetElement().style.cursor = 'grab';
        map.value.on('pointerdrag', function() {
            map.value!.getTargetElement().style.cursor = 'grabbing';
        });
        map.value.on('pointermove', updateMapCursor);

        mapStore.extent = map.value!.getView().calculateExtent(map.value!.getSize());

        let moving = true;

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

        map.value.on('movestart', () => {
            moving = true;
            mapStore.moving = true;
        });
        map.value.on('moveend', async () => {
            moving = false;
            const view = map.value!.getView();
            mapStore.zoom = view.getZoom() ?? 0;
            mapStore.rotation = toDegrees(view.getRotation() ?? 0);
            mapStore.extent = view.calculateExtent(map.value!.getSize());

            setUserLocalSettings({
                location: view.getCenter(),
                zoom: view.getZoom(),
            });

            await sleep(300);
            if (moving) return;
            mapStore.moving = false;
        });

        await nextTick();
        popupsHeight.value = popups.value?.clientHeight ?? 0;

        if (popups.value) {
            const resizeObserver = new ResizeObserver(() => {
                popupsHeight.value = popups.value?.clientHeight ?? 0;
            });
            resizeObserver.observe(popups.value!);
            await restoreOverlays();
        }
    },
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

    :deep(.ol-attribution) {
        background: $darkgray1000;

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

        &_list {
            z-index: 6;

            display: flex;
            flex-direction: column;
            gap: 16px;

            max-height: var(--overlays-height);

            transition: 0.5s ease-in-out;
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
