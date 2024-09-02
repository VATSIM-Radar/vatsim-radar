<template>
    <map-aircraft
        v-for="aircraft in visiblePilots"
        :key="aircraft.cid"
        :aircraft="aircraft"
        :is-hovered="hoveredAircraft === aircraft.cid"
        :show-label="showAircraftLabel.includes(aircraft.cid)"
        @manualHide="[isManualHover = false]"
        @manualHover="[isManualHover = true, hoveredAircraft = aircraft.cid]"
    />
    <!-- We do not set  hoveredAircraft = false in the manualHide event, because this led to a short time when moving with the mouse from the label to the icon where the aircraft got a "not hovered" state. We just switch to ManualHover=false and let the pointermove function handle the removal of the hover state -->
</template>

<script setup lang="ts">
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import type { ShallowRef } from 'vue';
import type { Map, MapBrowserEvent } from 'ol';
import type { Pixel } from 'ol/pixel';
import type { VatsimMandatoryPilot } from '~/types/data/vatsim';
import { fromLonLat, toLonLat } from 'ol/proj';
import { attachMoveEnd, isPointInExtent, useUpdateInterval } from '~/composables';
import { useMapStore } from '~/store/map';
import MapAircraft from '~/components/map/aircraft/MapAircraft.vue';
import { useStore } from '~/store';
import type { MapAircraftKeys } from '~/types/map';
import VectorImageLayer from 'ol/layer/VectorImage';

let vectorLayer: VectorLayer<any>;
const vectorSource = shallowRef<VectorSource | null>(null);
provide('vector-source', vectorSource);

let linesLayer: VectorImageLayer<any>;
const linesSource = shallowRef<VectorSource | null>(null);
provide('lines-source', linesSource);


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
            mapStore.overlays = mapStore.overlays.filter(x => x.type !== 'pilot' || x.key !== hoveredAircraft.value?.toString());
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

function setVisiblePilots() {
    visiblePilots.value = dataStore.vatsim._mandatoryData.value!.pilots.filter(x => {
        const coordinates = [x.longitude, x.latitude];

        return mapStore.overlays.some(y => y.type === 'pilot' && y.key === x.cid.toString()) || isPointInExtent(coordinates);
    }) ?? [];

    if (store.config.airport && store.config.onlyAirportAircraft) {
        const airport = dataStore.vatsim.data.airports.value.find(x => x.icao === store.config.airport);
        if (airport) {
            const aircraft = Object.values(airport.aircraft).flatMap(x => x);
            visiblePilots.value = visiblePilots.value.filter(x => aircraft.includes(x.cid));

            if (store.config.airportMode && store.config.airportMode !== 'all') {
                if (store.config.airportMode === 'ground') visiblePilots.value = visiblePilots.value.filter(x => airport.aircraft.groundArr?.includes(x.cid) || airport.aircraft.groundDep?.includes(x.cid));
                else visiblePilots.value = visiblePilots.value.filter(x => airport.aircraft[store.config.airportMode as MapAircraftKeys]?.includes(x.cid));
            }
        }
        else {
            visiblePilots.value = [];
        }
    }
}

useUpdateInterval(handleMoveEnd);

watch(dataStore.vatsim.updateTimestamp, () => {
    visiblePilots.value = dataStore.vatsim._mandatoryData.value!.pilots.filter(x => visiblePilots.value.some(y => y.cid === x.cid)) ?? [];
});

function airportExistsAtPixel(eventPixel: Pixel) {
    const featuresAirport = map.value!.getFeaturesAtPixel(eventPixel, {
        hitTolerance: 15, // we use 6 instead of 5 because of the aircraft icons size, it is just for cosmetic reasons
        layerFilter: layer => layer.getProperties().type === 'airports',
    }).filter(x => x.getProperties().type !== 'background');

    return featuresAirport.length > 0;
}

function handlePointerMove(e: MapBrowserEvent<any>) {
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


    isManualHover.value = false;
    hoveredAircraft.value = features[0].cid;
    mapStore.mapCursorPointerTrigger = 1;
}


async function handleClick(e: MapBrowserEvent<any>) {
    if (mapStore.openingOverlay) return;

    // here we deselect all aircrafts when the user clicks on the map and at the click position is no aircraft - used at the airport dashboard to deselect all aircrafts
    if (!hoveredAircraft.value && store.config.hideOverlays) {
        const eventPixel = map.value!.getPixelFromCoordinate(fromLonLat(toLonLat(e.coordinate)));
        const features = getPilotsForPixel(eventPixel, undefined, true) ?? [];

        if (features.length < 1) {
            if (store.config.hideOverlays) {
                mapStore.overlays = [];
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
});
</script>
