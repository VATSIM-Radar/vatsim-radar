<template>
    <map-aircraft
        v-for="aircraft in visiblePilots"
        :key="aircraft.cid"
        :aircraft="aircraft"
        :is-hovered="hoveredAircraft === aircraft.cid"
        :show-label="showAircraftLabel.includes(aircraft.cid)"
        @manualHide="[isManualHover = false, hoveredAircraft = null]"
        @manualHover="[isManualHover = true, hoveredAircraft = aircraft.cid]"
    />
</template>

<script setup lang="ts">
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import type { ShallowRef } from 'vue';
import type { Map, MapBrowserEvent } from 'ol';
import type { Pixel } from 'ol/pixel';
import type { VatsimShortenedAircraft } from '~/types/data/vatsim';
import { fromLonLat, toLonLat } from 'ol/proj';
import { attachMoveEnd, isPointInExtent, useUpdateInterval } from '~/composables';
import { useMapStore } from '~/store/map';
import MapAircraft from '~/components/map/aircraft/MapAircraft.vue';
import { useStore } from '~/store';
import type { MapAircraftKeys } from '~/types/map';

let vectorLayer: VectorLayer<any>;
const vectorSource = shallowRef<VectorSource | null>(null);
provide('vector-source', vectorSource);

let linesLayer: VectorLayer<any>;
const linesSource = shallowRef<VectorSource | null>(null);
provide('lines-source', linesSource);

const map = inject<ShallowRef<Map | null>>('map')!;
const store = useStore();
const mapStore = useMapStore();
const dataStore = useDataStore();

const hoveredAircraft = ref<number | null>(null);
const isManualHover = ref(false);
const showAircraftLabel = ref<number[]>([]);

function getPilotsForPixel(pixel: Pixel, tolerance = 25, exitOnAnyOverlay = false) {
    if (!pixel) return [];
    const overlaysCoordinates: number[][] = [];

    if (exitOnAnyOverlay && mapStore.openOverlayId && !mapStore.openPilotOverlay) return [];

    map.value!.getOverlays().forEach(overlay => {
        if ([...overlay.getElement()?.classList ?? []].some(x => x.includes('aircraft') || x.includes('airport'))) return;
        const position = overlay.getPosition();
        if (position) {
            const pixel = map.value!.getPixelFromCoordinate(position);
            if (!pixel) return;
            overlaysCoordinates.push(map.value!.getPixelFromCoordinate(position));
        }
    });

    const collapsingWithOverlay = overlaysCoordinates.some(x => Math.abs(pixel[0] - x[0]) < 15 && Math.abs(pixel[1] - x[1]) < 15);

    return visiblePilots.value.filter(x => {
        const pilotPixel = aircraftCoordsToPixel(x);
        if (!pilotPixel) return false;

        return Math.abs(pilotPixel[0] - pixel[0]) < tolerance &&
            Math.abs(pilotPixel[1] - pixel[1]) < tolerance &&
            !collapsingWithOverlay;
    }) ?? [];
}

function aircraftCoordsToPixel(aircraft: VatsimShortenedAircraft): Pixel | null {
    return map.value!.getPixelFromCoordinate([aircraft.longitude, aircraft.latitude]);
}

const visiblePilots = shallowRef<VatsimShortenedAircraft[]>([]);

function setVisiblePilots() {
    visiblePilots.value = dataStore.vatsim.data.pilots.value.filter(x => {
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
    visiblePilots.value = dataStore.vatsim.data.pilots.value.filter(x => visiblePilots.value.some(y => y.cid === x.cid)) ?? [];
});

function handlePointerMove(e: MapBrowserEvent<any>) {
    const eventPixel = map.value!.getPixelFromCoordinate(fromLonLat(toLonLat(e.coordinate)));

    const features = getPilotsForPixel(eventPixel, undefined, true) ?? [];

    if (features.length !== 1 || !mapStore.canShowOverlay) {
        if (!isManualHover.value) {
            hoveredAircraft.value = null;
        }

        if (mapStore.mapCursorPointerTrigger === 1) mapStore.mapCursorPointerTrigger = false;
        return;
    }

    if (isManualHover.value) return;

    isManualHover.value = false;

    if (getPilotsForPixel(aircraftCoordsToPixel(features[0])!).length === 1) {
        hoveredAircraft.value = features[0].cid;
        mapStore.mapCursorPointerTrigger = 1;
    }
}

async function handleClick(e: MapBrowserEvent<any>) {
    const eventPixel = map.value!.getPixelFromCoordinate(fromLonLat(toLonLat(e.coordinate)));

    const features = getPilotsForPixel(eventPixel, undefined, true) ?? [];

    if (features.length !== 1) {
        if (store.config.hideOverlays) {
            mapStore.overlays = [];
        }

        return;
    }

    const overlay = await mapStore.addPilotOverlay(features[0].cid.toString());
    if (overlay && store.config.showInfoForPrimaryAirport) {
        overlay.sticky = true;
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

        linesLayer = new VectorLayer<any>({
            source: linesSource.value,
            properties: {
                type: 'aircraft-line',
            },
            zIndex: 6,
            declutter: true,
        });
    }

    val.addLayer(vectorLayer);
    val.addLayer(linesLayer);

    attachPointerMove(handlePointerMove);
    val.on('click', handleClick);
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    if (vectorLayer) map.value?.removeLayer(vectorLayer);
    if (linesLayer) map.value?.removeLayer(linesLayer);
    map.value?.un('click', handleClick);
});
</script>
