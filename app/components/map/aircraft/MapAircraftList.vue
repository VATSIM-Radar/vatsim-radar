<template>
    <template v-if="!isHideMapObject('pilots')">
        <map-aircraft
            v-for="aircraft in getShownPilots"
            :key="aircraft.cid+String(store.mapSettings.heatmapLayer)"
            :aircraft="aircraft"
            :can-show-tracks="showTracks[aircraft.cid.toString()]?.show ?? null"
            :is-hovered="hoveredAircraft === aircraft.cid"
            :is-visible="showTracks[aircraft.cid.toString()]?.isShown ?? true"
            @manualHide="[isManualHover === aircraft.cid && (isManualHover = null)]"
            @manualHover="[isManualHover = aircraft.cid, setHoveredAircraft(aircraft)]"
        />
    </template>
    <!-- We do not set  hoveredAircraft = false in the manualHide event, because this led to a short time when moving with the mouse from the label to the icon where the aircraft got a "not hovered" state. We just switch to ManualHover=false and let the pointermove function handle the removal of the hover state -->
</template>

<script setup lang="ts">
import VectorSource from 'ol/source/Vector.js';
import VectorLayer from 'ol/layer/Vector.js';
import type { ShallowRef } from 'vue';
import type { Map, MapBrowserEvent } from 'ol';
import type { Pixel } from 'ol/pixel.js';
import type { VatsimMandatoryPilot, VatsimShortenedAircraft } from '~/types/data/vatsim';
import { attachMoveEnd, isPointInExtent, useUpdateInterval } from '~/composables';
import { useMapStore } from '~/store/map';
import MapAircraft from '~/components/map/aircraft/MapAircraft.vue';
import { useStore } from '~/store';
import type { MapAircraftKeys } from '~/types/map';
import VectorImageLayer from 'ol/layer/VectorImage.js';
import { isHideMapObject } from '~/composables/settings';
import { Heatmap } from 'ol/layer.js';
import { calculateDistanceInNauticalMiles } from '~/utils/shared/flight';
import type { Coordinate } from 'ol/coordinate.js';
import { ownFlight } from '~/composables/vatsim/pilots';

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
const isManualHover = ref<number | null>(null);

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

const showTracks = shallowRef<Record<string, { show: 'short' | 'full'; pilot: VatsimShortenedAircraft; isShown: boolean; isDeparture?: boolean; isArrival?: boolean }>>({});
const hoverDelay = computed(() => (store.mapSettings.aircraftHoverDelay === undefined || store.mapSettings.aircraftHoverDelay === true) ? 400 : store.mapSettings.aircraftHoverDelay);

const getShownPilots = computed(() => {
    const groundTrafficHide = store.mapSettings.groundTraffic?.hide ?? 'lowZoom';
    if (groundTrafficHide === 'never') return dataStore.visiblePilots.value;
    if (groundTrafficHide === 'lowZoom' && mapStore.zoom > 11) return dataStore.visiblePilots.value;
    if (groundTrafficHide !== 'always' && groundTrafficHide !== 'lowZoom') return dataStore.visiblePilots.value;

    const pilots = dataStore.visiblePilots.value;
    const me = ownFlight.value;

    let arrivalAirport = '';

    if (me?.arrival && !store.mapSettings.groundTraffic?.excludeMyArrival) {
        arrivalAirport = me.arrival;
    }

    const allOnGround: number[] = [];

    for (const airport of dataStore.vatsim.data.airports.value) {
        if (airport.icao === arrivalAirport) continue;

        if (me && !store.mapSettings.groundTraffic?.excludeMyLocation) {
            const check = airport.aircraft.groundDep?.includes(me.cid) || airport.aircraft.groundArr?.includes(me.cid) || airport.aircraft.prefiles?.includes(me.cid);
            if (check) continue;
        }

        allOnGround.push(...airport.aircraft.groundDep ?? []);
        allOnGround.push(...airport.aircraft.groundArr ?? []);
    }


    return pilots.filter(x => mapStore.overlays.some(y => y.type === 'pilot' && y.key === x.cid.toString()) || !allOnGround.includes(x.cid));
});

async function setHoveredAircraft(aircraft: VatsimMandatoryPilot) {
    if (hoverDelay.value !== false) {
        await sleep(hoverDelay.value as number);
    }
    if (isManualHover.value === aircraft.cid) {
        hoveredAircraft.value = aircraft.cid;
    }
}

function setVisiblePilots() {
    showTracks.value = {};

    const {
        mode: tracksMode = 'arrivalsOnly',
        limit: tracksLimit = 50,
        showOutOfBounds = false,
    } = store.mapSettings.tracks ?? {};

    dataStore.visiblePilots.value = dataStore.vatsim._mandatoryData.value?.pilots.filter(x => {
        const coordinates = [x.longitude, x.latitude];

        const pilot = dataStore.vatsim.data.keyedPilots.value[x.cid.toString()];

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
                showTracks.value[pilot.cid.toString()] = {
                    pilot,
                    show: 'full',
                    isShown,
                    isDeparture: true,
                };
            }
        }

        if (canShowForArrivals) {
            const airport = pilot.arrival && mapStore.overlays.some(x => x.type === 'airport' && x.data.icao === pilot.arrival && x.data.showTracks);
            const duplicate = showTracks.value[pilot.cid.toString()];
            if (airport) {
                hasTracks = true;

                if (duplicate) duplicate.isArrival = true;
                else {
                    showTracks.value[pilot.cid.toString()] = {
                        pilot,
                        show: 'full',
                        isShown,
                        isArrival: true,
                    };
                }
            }
        }

        return isShown || (hasTracks && showOutOfBounds);
    }) ?? [];

    const tracksEntries = Object.entries(showTracks.value);

    if (tracksEntries.length > tracksLimit) {
        showTracks.value = Object.fromEntries(
            tracksEntries.filter(([, x]) => mapStore.overlays.some(y => y.type === 'pilot' && y.data.pilot.cid === x.pilot.cid) || (x.pilot.toGoDist && x.pilot.toGoDist > 0) || (x.pilot.depDist && x.pilot.depDist > 0)).sort(([, a], [,b]) => {
                const aGoDist = (a.isArrival && a.pilot.toGoDist) || 0;
                const aDepDist = (a.isDeparture && a.pilot.depDist) || 0;
                const aDist = (aGoDist && aDepDist)
                    ? aGoDist > aDepDist && aDepDist
                        ? aDepDist
                        : aGoDist
                    : aGoDist || aDepDist;

                const bGoDist = (b.isArrival && b.pilot.toGoDist) || 0;
                const bDepDist = (b.isDeparture && b.pilot.depDist) || 0;
                const bDist = (bGoDist && bDepDist)
                    ? bGoDist > bDepDist
                        ? bDepDist
                        : bGoDist
                    : bGoDist || bDepDist;

                return aDist - bDist;
            }).map(([key, x], index) => {
                if (index >= tracksLimit && !mapStore.overlays.some(y => y.type === 'pilot' && y.data.pilot.cid === x.pilot.cid)) x.show = 'short';

                return [key, x] satisfies [string, typeof x];
            }).filter(([, x], index) => index < 50 || x.isShown || mapStore.overlays.some(y => y.type === 'pilot' && y.data.pilot.cid === x.pilot.cid)),
        );
    }
    else triggerRef(showTracks);

    if (store.config.airports?.length && store.config.onlyAirportsAircraft) {
        const airports = dataStore.vatsim.data.airports.value.filter(x => store.config.airports!.includes(x.icao));
        if (airports?.length) {
            const aircraft = airports.flatMap(x => x.aircraft).map(x => Object.values(x)).flat().flat();
            dataStore.visiblePilots.value = dataStore.visiblePilots.value.filter(x => aircraft.includes(x.cid));
        }
        else {
            dataStore.visiblePilots.value = [];
        }
    }

    if (store.config.airport && store.config.onlyAirportAircraft) {
        const airport = dataStore.vatsim.data.airports.value.find(x => x.icao === store.config.airport);
        if (airport) {
            const coords = [dataStore.vatspy.value?.data.keyAirports.realIcao[store.config.airport].lon, dataStore.vatspy.value?.data.keyAirports.realIcao[store.config.airport].lat];
            const aircraft = Object.values(airport.aircraft).flatMap(x => x);

            dataStore.visiblePilots.value = dataStore.visiblePilots.value.filter(x => {
                const fullPilot = dataStore.vatsim.data.keyedPilots.value[x.cid.toString()];
                const nearby = fullPilot && fullPilot.flight_rules !== 'I' && coords[0] && calculateDistanceInNauticalMiles(coords as Coordinate, [x.longitude, x.latitude]) <= 40;
                if (nearby) return true;

                if (!aircraft.includes(x.cid)) return false;

                if (store.config.airportMode && store.config.airportMode !== 'all') {
                    if (store.config.airportMode === 'ground') {
                        return airport.aircraft.groundArr?.includes(x.cid) || airport.aircraft.groundDep?.includes(x.cid);
                    }
                    else {
                        return airport.aircraft[store.config.airportMode as MapAircraftKeys]?.includes(x.cid);
                    }
                }

                return true;
            });
        }
        else {
            dataStore.visiblePilots.value = [];
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

watch(() => store.mapSettings.heatmapLayer, async () => {
    await nextTick();
    initHeatmap();
});

watch(dataStore.vatsim.updateTimestamp, () => {
    dataStore.visiblePilots.value = dataStore.vatsim._mandatoryData.value?.pilots.filter(x => dataStore.visiblePilotsObj.value[x.cid.toString()]) ?? [];
});

function airportExistsAtPixel(eventPixel: Pixel) {
    const featuresAirport = map.value!.getFeaturesAtPixel(eventPixel, {
        hitTolerance: 0,
        layerFilter: layer => layer.getProperties().type === 'airports',
    }).filter(x => x.getProperties().type !== 'background');

    return featuresAirport.length > 0;
}

function traconLabelExistsAtPixel(eventPixel: Pixel) {
    const features = map.value!.getFeaturesAtPixel(eventPixel, {
        hitTolerance: 0,
        layerFilter: layer => layer.getProperties().type === 'arr-controllers',
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

let activePilotHover: null | number = null;

const isMobile = useIsMobile();

async function handlePointerMove(e: MapBrowserEvent<any>) {
    if (store.mapSettings.heatmapLayer) return;
    const eventPixel = map.value!.getPixelFromCoordinate(e.coordinate);

    const features = getPilotsForPixel(map.value!, eventPixel, undefined, true) ?? [];

    activePilotHover = features[0]?.cid ?? null;

    if (!features.length || !mapStore.canShowOverlay) {
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

    mapStore.mapCursorPointerTrigger = 1;

    async function setAircraft() {
        isManualHover.value = null;
        hoveredAircraft.value = null;
        await nextTick();
        if (!isMobile.value) {
            hoveredAircraft.value = features[0].cid;
        }
        mapStore.mapCursorPointerTrigger = 1;
    }

    if (hoverDelay.value !== false) {
        sleep(hoverDelay.value as number).then(() => {
            if (activePilotHover !== features[0].cid || hoveredAircraft.value === features[0].cid || isManualHover.value === features[0].cid) return;

            setAircraft();
        });
    }
    else setAircraft();
}

async function handleClick(e: MapBrowserEvent<any>) {
    if (mapStore.openingOverlay || store.mapSettings.heatmapLayer || (isManualHover.value && !store.isTouch)) return;

    const eventPixel = map.value!.getPixelFromCoordinate(e.coordinate);
    const features = getPilotsForPixel(map.value!, eventPixel, undefined, true) ?? [];

    if (features.length < 1) return;

    // here we deselect all aircraft when the user clicks on the map and at the click position is no aircraft - used at the airport dashboard to deselect all aircraft
    if (!hoveredAircraft.value && store.config.hideOverlays) {
        if (features.length < 1) {
            if (store.config.hideOverlays) {
                mapStore.overlays = mapStore.overlays.filter(x => x.type === 'airport');
            }
            mapStore.sendSelectedPilotToDashboard(null); // no aircraft is selected, so we send null to make sure the dashboard pilot overlay will be closed
            return;
        }
    }

    handlePointerMove(e); // we call this function because on touch screens, the pointermove event is not triggered. Also for cases where the click event is before the mousemoveend event

    // when the current hovered aircraft is currently opened, we deselect it with the click instead of selecting it
    const existingOverlay = mapStore.overlays.find(x => x.key === hoveredAircraft.value?.toString());
    if (existingOverlay) {
        mapStore.overlays = mapStore.overlays.filter(x => x.type !== 'pilot' || x.key !== hoveredAircraft.value?.toString());
        mapStore.sendSelectedPilotToDashboard(null); // an aircraft is deselected, we close the dashboard pilot overlay (for simplicity we close the overlay even when the deselected aircraft is not the one that is currently opened)
        return;
    }

    const overlay = await mapStore.addPilotOverlay(features[0].cid);
    if (overlay && store.config.showInfoForPrimaryAirport) {
        overlay.sticky = true;
    }
}

function handleMoveEnd() {
    setVisiblePilots();
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
            updateWhileAnimating: true,
            declutter: true,
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
        });
    }

    initHeatmap();

    val.addLayer(vectorLayer);
    val.addLayer(linesLayer);

    attachPointerMove(handlePointerMove, 300);
    val.on('singleclick', handleClick);
}, {
    immediate: true,
});

onMounted(() => {
    window.addEventListener('message', receiveMessage);
});

onBeforeUnmount(() => {
    if (vectorLayer) map.value?.removeLayer(vectorLayer);
    if (linesLayer) map.value?.removeLayer(linesLayer);
    vectorSource.value?.clear();
    map.value?.un('singleclick', handleClick);
    window.removeEventListener('message', receiveMessage);
    if (heatmap) {
        map.value?.removeLayer(heatmap);
    }
});
</script>
