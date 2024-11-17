<template>
    <template v-if="!isHideMapObject('pilots')">
        <map-aircraft
            v-for="aircraft in getShownPilots"
            :key="aircraft.cid"
            :aircraft="aircraft"
            :can-show-tracks="showTracks.find(x => x.pilot.cid === aircraft.cid)?.show ?? null"
            :is-hovered="hoveredAircraft === aircraft.cid"
            :is-visible="showTracks.find(x => x.pilot.cid === aircraft.cid)?.isShown ?? true"
            :show-label="showAircraftLabel.includes(aircraft.cid)"
            @manualHide="[isManualHover = false]"
            @manualHover="[isManualHover = true, hoveredAircraft = aircraft.cid]"
        />
    </template>
    <!-- We do not set  hoveredAircraft = false in the manualHide event, because this led to a short time when moving with the mouse from the label to the icon where the aircraft got a "not hovered" state. We just switch to ManualHover=false and let the pointermove function handle the removal of the hover state -->
</template>

<script setup lang="ts">
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import type { ShallowRef } from 'vue';
import type { Map, MapBrowserEvent } from 'ol';
import type { Pixel } from 'ol/pixel';
import type { VatsimMandatoryPilot, VatsimShortenedAircraft } from '~/types/data/vatsim';
import { fromLonLat, toLonLat } from 'ol/proj';
import { attachMoveEnd, isPointInExtent, useUpdateInterval } from '~/composables';
import { useMapStore } from '~/store/map';
import MapAircraft from '~/components/map/aircraft/MapAircraft.vue';
import { useStore } from '~/store';
import type { MapAircraftKeys } from '~/types/map';
import VectorImageLayer from 'ol/layer/VectorImage';
import { isHideMapObject } from '~/composables/settings';
import { Heatmap } from 'ol/layer';

let vectorLayer: VectorLayer<any>;
const vectorSource = shallowRef<VectorSource | null>(null);
provide('vector-source', vectorSource);

let linesLayer: VectorImageLayer<any>;
const linesSource = shallowRef<VectorSource | null>(null);
provide('lines-source', linesSource);

let heatmap: Heatmap | null = null;

const map = inject<ShallowRef<Map | null>>('map')!;
const store = useStore();
const mapStore = useMapStore();
const dataStore = useDataStore();
const config = useRuntimeConfig();

const hoveredAircraft = ref<number | null>(null);
const isManualHover = ref(false);
const showAircraftLabel = ref<number[]>([]);

// The next 3 functions are used to get data to and from the airport dashboard page. When an aircraft is selected it is sent to the airport dashboard so we can open the pilot overlay. We also receive the event from the dashboard when an aircraft is clicked in the dashboard, we then select it on the map.
function receiveMessage(event: MessageEvent) {
    if (event.origin !== config.public.DOMAIN) {
        return;
    }

    if (event.source === window) return; // the message is from the same window, so we ignore it

    if (event.data && 'selectedPilot' in event.data) {
        if (event.data.selectedPilot === null) {
            mapStore.overlays = mapStore.overlays.filter(x => x.type !== 'pilot');
        }
        else {
            mapStore.addPilotOverlay(event.data.selectedPilot.toString());
        }
    }
}

function sendSelectedPilotToDashboard(cid: number | null = null) {
    const message = { selectedPilot: cid };
    const targetOrigin = config.public.DOMAIN;
    window.parent.postMessage(message, targetOrigin);
}

function getPilotsForPixel(pixel: Pixel, tolerance = 25, exitOnAnyOverlay = false) {
    if (!pixel) return [];

    if (exitOnAnyOverlay && mapStore.openOverlayId && !mapStore.openPilotOverlay) return [];

    let collapsingWithOverlay = false;
    map.value!.getOverlays().forEach(overlay => {
        if (collapsingWithOverlay) return;
        if ([...overlay.getElement()?.classList ?? []].some(x => x.includes('aircraft'))) return;

        const overlayElement = overlay.getElement();
        if (overlayElement) {
            const overlayRect = overlayElement.getBoundingClientRect();
            const mapRect = map.value!.getTargetElement().getBoundingClientRect();
            const overlayPixel = [
                overlayRect.left - mapRect.left,
                overlayRect.top - mapRect.top,
            ];

            if (pixel[0] >= overlayPixel[0] && pixel[0] <= overlayPixel[0] + overlayRect.width &&
                pixel[1] >= overlayPixel[1] && pixel[1] <= overlayPixel[1] + overlayRect.height) {
                collapsingWithOverlay = true;
            }
        }
    });

    if (collapsingWithOverlay) return []; // The mouse is over an relevant overlay, we don't want to return any pilot

    return visiblePilots.value.filter(x => {
        const pilotPixel = aircraftCoordsToPixel(x);
        if (!pilotPixel) return false;

        return Math.abs(pilotPixel[0] - pixel[0]) < tolerance &&
            Math.abs(pilotPixel[1] - pixel[1]) < tolerance;
    }) ?? [];
}

function aircraftCoordsToPixel(aircraft: VatsimMandatoryPilot): Pixel | null {
    return map.value!.getPixelFromCoordinate([aircraft.longitude, aircraft.latitude]);
}

const visiblePilots = shallowRef<VatsimMandatoryPilot[]>([]);
const showTracks = shallowRef<{ show: 'short' | 'full'; pilot: VatsimShortenedAircraft; isShown: boolean; isDeparture?: boolean; isArrival?: boolean }[]>([]);

const getShownPilots = computed(() => {
    if (store.mapSettings.groundTraffic?.hide === 'never' || !store.mapSettings.groundTraffic?.hide) return visiblePilots.value;

    if (store.mapSettings.groundTraffic.hide === 'lowZoom' && mapStore.zoom > 11) return visiblePilots.value;
    if (store.mapSettings.groundTraffic.hide !== 'always' && store.mapSettings.groundTraffic.hide !== 'lowZoom') return visiblePilots.value;

    const pilots = visiblePilots.value;
    const me = dataStore.vatsim.data.pilots.value.find(x => x.cid.toString() === store.user?.cid);

    let arrivalAirport = '';

    if (me?.arrival && !store.mapSettings.groundTraffic.excludeMyArrival) {
        arrivalAirport = me.arrival;
    }

    const allOnGround: number[] = [];

    for (const airport of dataStore.vatsim.data.airports.value) {
        if (airport.icao === arrivalAirport) continue;

        if (me && !store.mapSettings.groundTraffic.excludeMyLocation) {
            const check = airport.aircraft.groundDep?.includes(me.cid) || airport.aircraft.groundArr?.includes(me.cid) || airport.aircraft.prefiles?.includes(me.cid);
            if (check) continue;
        }

        allOnGround.push(...airport.aircraft.groundDep ?? []);
        allOnGround.push(...airport.aircraft.groundArr ?? []);
    }

    return pilots.filter(x => !allOnGround.includes(x.cid));
});

function setVisiblePilots() {
    showTracks.value = [];

    const {
        mode: tracksMode = 'arrivalsOnly',
        limit: tracksLimit = 50,
        showOutOfBounds = false,
    } = store.mapSettings.tracks ?? {};

    visiblePilots.value = dataStore.vatsim._mandatoryData.value!.pilots.filter(x => {
        const coordinates = [x.longitude, x.latitude];

        // Don't iterate through pilots if no need
        // TODO: convert pilots and other things to a map
        const pilot = mapStore.overlays.some(x => x.type === 'airport' && x.data.showTracks) && dataStore.vatsim.data.pilots.value.find(y => y.cid === x.cid);

        const isShown = mapStore.overlays.some(y => y.type === 'pilot' && y.key === x.cid.toString()) || isPointInExtent(coordinates);

        if (!pilot || (!isShown && !showOutOfBounds)) return isShown;

        let hasTracks = false;

        let canShowForDepartures = false;
        let canShowForArrivals = false;
        const isOnGroundDep = pilot.status === 'depTaxi' || pilot.status === 'depGate';
        const isOnGroundArr = pilot.status === 'arrGate' || pilot.status === 'arrTaxi';
        const isOnGround = isOnGroundDep || isOnGroundArr;

        if (tracksMode === 'all') {
            canShowForDepartures = true;
            canShowForArrivals = true;
        }
        else if (tracksMode === 'allAirborne') {
            canShowForDepartures = !isOnGround;
            canShowForArrivals = !isOnGround;
        }
        else if (tracksMode === 'departures') {
            canShowForDepartures = !isOnGround;
        }
        else if (tracksMode === 'ground') {
            canShowForDepartures = pilot.status === 'depTaxi';
            canShowForArrivals = pilot.status === 'arrTaxi';
        }
        else if (tracksMode === 'arrivalsAndLanded') {
            canShowForArrivals = true;
        }
        else if (tracksMode === 'arrivalsOnly') {
            canShowForArrivals = !isOnGround;
        }

        if (canShowForDepartures) {
            const airport = pilot.departure && mapStore.overlays.some(x => x.type === 'airport' && x.data.icao === pilot.departure && x.data.showTracks);
            if (airport) {
                hasTracks = true;
                showTracks.value.push({
                    pilot,
                    show: 'full',
                    isShown,
                    isDeparture: true,
                });
            }
        }

        if (canShowForArrivals) {
            const airport = pilot.arrival && mapStore.overlays.some(x => x.type === 'airport' && x.data.icao === pilot.arrival && x.data.showTracks);
            const duplicate = showTracks.value.find(x => x.pilot.cid === pilot.cid);
            if (airport) {
                hasTracks = true;

                if (duplicate) duplicate.isArrival = true;
                else {
                    showTracks.value.push({
                        pilot,
                        show: 'full',
                        isShown,
                        isArrival: true,
                    });
                }
            }
        }

        return isShown || (hasTracks && showOutOfBounds);
    }) ?? [];

    if (showTracks.value.length > tracksLimit) {
        showTracks.value = showTracks.value.filter(x => (x.pilot.toGoDist && x.pilot.toGoDist > 0) || (x.pilot.depDist && x.pilot.depDist > 0)).sort((a, b) => {
            const aGoDist = (a.isArrival && a.pilot.toGoDist) || 0;
            const aDepDist = (a.isDeparture && a.pilot.depDist) || 0;
            const aDist = (aGoDist && aDepDist)
                ? aGoDist > aDepDist
                    ? aDepDist
                    : aGoDist
                : aGoDist ?? aDepDist;

            const bGoDist = (b.isArrival && b.pilot.toGoDist) || 0;
            const bDepDist = (b.isDeparture && b.pilot.depDist) || 0;
            const bDist = (bGoDist && bDepDist)
                ? bGoDist > bDepDist
                    ? bDepDist
                    : bGoDist
                : bGoDist ?? bDepDist;

            return aDist - bDist;
        }).map((x, index) => {
            if (index >= tracksLimit) x.show = 'short';

            return x;
        }).filter((x, index) => index < 50 || x.isShown);
    }

    if (store.config.airports?.length && store.config.onlyAirportsAircraft) {
        const airports = dataStore.vatsim.data.airports.value.filter(x => store.config.airports!.includes(x.icao));
        if (airports?.length) {
            const aircraft = airports.flatMap(x => x.aircraft).map(x => Object.values(x)).flat().flat();
            visiblePilots.value = visiblePilots.value.filter(x => aircraft.includes(x.cid));
        }
        else {
            visiblePilots.value = [];
        }
    }

    if (store.config.airport && store.config.onlyAirportAircraft) {
        const airport = dataStore.vatsim.data.airports.value.find(x => x.icao === store.config.airport);
        if (airport) {
            const aircraft = Object.values(airport.aircraft).flatMap(x => x);
            visiblePilots.value = visiblePilots.value.filter(x => aircraft.includes(x.cid));

            if (store.config.airportMode && store.config.airportMode !== 'all') {
                if (store.config.airportMode === 'ground') {
                    visiblePilots.value = visiblePilots.value.filter(x => airport.aircraft.groundArr?.includes(x.cid) || airport.aircraft.groundDep?.includes(x.cid));
                }
                else {
                    visiblePilots.value = visiblePilots.value.filter(x => airport.aircraft[store.config.airportMode as MapAircraftKeys]?.includes(x.cid));
                }
            }
        }
        else {
            visiblePilots.value = [];
        }
    }
}

useUpdateInterval(handleMoveEnd);

function initHeatmap() {
    if (store.mapSettings.heatmapLayer) {
        if (!vectorSource.value || heatmap) return;

        heatmap = new Heatmap({
            source: vectorSource.value,
            zIndex: 5,
            weight: () => 0.5,
        });

        map.value?.addLayer(heatmap);
    }
    else if (heatmap) {
        map.value?.removeLayer(heatmap);
        heatmap = null;
    }
}

watch(dataStore.vatsim.updateTimestamp, () => {
    visiblePilots.value = dataStore.vatsim._mandatoryData.value!.pilots.filter(x => visiblePilots.value.some(y => y.cid === x.cid)) ?? [];
    initHeatmap();
});

function airportExistsAtPixel(eventPixel: Pixel) {
    const featuresAirport = map.value!.getFeaturesAtPixel(eventPixel, {
        hitTolerance: 15, // we use 6 instead of 5 because of the aircraft icons size, it is just for cosmetic reasons
        layerFilter: layer => layer.getProperties().type === 'airports',
    }).filter(x => x.getProperties().type !== 'background');

    return featuresAirport.length > 0;
}

function traconLabelExistsAtPixel(eventPixel: Pixel) {
    const features = map.value!.getFeaturesAtPixel(eventPixel, {
        hitTolerance: 0,
        layerFilter: layer => layer.getProperties().type === 'arr-atc',
    });

    if (features.length > 0) {
        for (const feature of features) {
            const isInvalid = (feature.getProperties().type !== 'tracon-label');

            if (!isInvalid && mapStore.canShowOverlay) {
                return true;
            }
        }
    }
    return false;
}

function handlePointerMove(e: MapBrowserEvent<any>) {
    if (store.mapSettings.heatmapLayer) return;
    const eventPixel = map.value!.getPixelFromCoordinate(fromLonLat(toLonLat(e.coordinate)));

    let features = getPilotsForPixel(eventPixel, undefined, true) ?? [];

    // we have more than one aircraft within the tolerance, so we need to find the closest one
    if (features.length > 1) {
        const closestFeature = vectorSource.value?.getClosestFeatureToCoordinate(e.coordinate);
        // we now know the closest feature, so we filter the features array to only include the closest feature
        // we use filter instead of a new features array, because we we want to make sure that the returned closest feature is actually part of the initial getPilotsForPixel return
        features = features.filter(x => {
            return x.cid === closestFeature?.get('id');
        });
    }

    if (features.length !== 1 || !mapStore.canShowOverlay) {
        if (!isManualHover.value) {
            hoveredAircraft.value = null;
        }

        if (mapStore.mapCursorPointerTrigger === 1) mapStore.mapCursorPointerTrigger = false;
        return;
    }

    if (isManualHover.value) return;

    // we give priority to the airport clickspots
    if (airportExistsAtPixel(eventPixel)) {
        hoveredAircraft.value = null;
        return;
    }

    // we give priority to tracon labels
    if (traconLabelExistsAtPixel(eventPixel)) {
        hoveredAircraft.value = null;
        return;
    }

    if (isManualHover.value) return;

    isManualHover.value = false;
    hoveredAircraft.value = features[0].cid;
    mapStore.mapCursorPointerTrigger = 1;
}

async function handleClick(e: MapBrowserEvent<any>) {
    if (mapStore.openingOverlay || store.mapSettings.heatmapLayer || isManualHover.value) return;

    // here we deselect all aircrafts when the user clicks on the map and at the click position is no aircraft - used at the airport dashboard to deselect all aircrafts
    if (!hoveredAircraft.value && store.config.hideOverlays) {
        const eventPixel = map.value!.getPixelFromCoordinate(fromLonLat(toLonLat(e.coordinate)));
        const features = getPilotsForPixel(eventPixel, undefined, true) ?? [];

        if (features.length < 1) {
            if (store.config.hideOverlays) {
                mapStore.overlays = mapStore.overlays.filter(x => x.type === 'airport');
            }
            sendSelectedPilotToDashboard(null); // no aircraft is selected, so we send null to make sure the dashboard pilot overlay will be closed
            return;
        }
    }

    handlePointerMove(e); // we call this function because on touch screens, the pointermove event is not triggered. Also for cases where the click event is before the mousemoveend event

    // when the current hovered aircraft is currently opened, we deselect it with the click instead of selecting it
    const existingOverlay = mapStore.overlays.find(x => x.key === hoveredAircraft.value?.toString());
    if (existingOverlay) {
        mapStore.overlays = mapStore.overlays.filter(x => x.type !== 'pilot' || x.key !== hoveredAircraft.value?.toString());
        sendSelectedPilotToDashboard(null); // an aircraft is deselected, we close the dashboard pilot overlay (for simplicity we close the overlay even when the deselected aircraft is not the one that is currently opened)
        return;
    }

    if (hoveredAircraft.value) {
        sendSelectedPilotToDashboard(hoveredAircraft.value); // we selected an aircraft, we want to open the overlay for that pilot in the airport dashboard

        // we are hovering over an aircraft and open the overlay
        const overlay = await mapStore.addPilotOverlay(hoveredAircraft.value.toString());
        if (overlay && store.config.showInfoForPrimaryAirport) {
            overlay.sticky = true;
        }
    }
}

function handleMoveEnd() {
    setVisiblePilots();

    if (visiblePilots.value.length > 100 || visiblePilots.value.length === 0) {
        if (showAircraftLabel.value.length) {
            showAircraftLabel.value = [];
        }
        return;
    }

    showAircraftLabel.value = visiblePilots.value.filter(feature => getPilotsForPixel(aircraftCoordsToPixel(feature)!).length === 1).map(x => x.cid);
}

attachMoveEnd(handleMoveEnd);

watch(() => store.mapSettings.tracks ?? {}, handleMoveEnd, {
    deep: true,
    immediate: true,
});

watch(map, val => {
    if (!val) return;

    let hasLayer = false;
    val.getLayers().forEach(layer => {
        if (hasLayer) return;
        hasLayer = layer.getProperties().type === 'aircraft';
    });
    if (hasLayer) return;

    if (!vectorLayer) {
        vectorSource.value = new VectorSource<any>({
            features: [],
            wrapX: false,
        });

        vectorLayer = new VectorLayer<any>({
            source: vectorSource.value,
            properties: {
                type: 'aircraft',
            },
            zIndex: 7,
        });
    }

    if (!linesLayer) {
        linesSource.value = new VectorSource<any>({
            features: [],
            wrapX: true,
        });

        linesLayer = new VectorImageLayer<any>({
            source: linesSource.value,
            properties: {
                type: 'aircraft-line',
            },
            zIndex: 6,
            declutter: false,
        });
    }

    initHeatmap();

    val.addLayer(vectorLayer);
    val.addLayer(linesLayer);

    attachPointerMove(handlePointerMove);
    val.on('click', handleClick);
}, {
    immediate: true,
});

onMounted(() => {
    window.addEventListener('message', receiveMessage);
});

onBeforeUnmount(() => {
    if (vectorLayer) map.value?.removeLayer(vectorLayer);
    if (linesLayer) map.value?.removeLayer(linesLayer);
    map.value?.un('click', handleClick);
    window.removeEventListener('message', receiveMessage);
    if (heatmap) {
        map.value?.removeLayer(heatmap);
    }
});
</script>
