<template>
    <map-aircraft
        v-for="aircraft in visiblePilots"
        :key="aircraft.cid"
        :aircraft="aircraft"
        :is-hovered="hoveredAircraft === aircraft.cid"
        :show-label="showAircraftLabel.includes(aircraft.cid)"
        @manualHover="[isManualHover = true, hoveredAircraft = aircraft.cid]"
        @manualHide="[isManualHover = false, hoveredAircraft = null]"
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
import { attachMoveEnd, isPointInExtent } from '~/composables';
import { useStore } from '~/store';

let vectorLayer: VectorLayer<any>;
const vectorSource = shallowRef<VectorSource | null>(null);
provide('vector-source', vectorSource);
const map = inject<ShallowRef<Map | null>>('map')!;
const store = useStore();
const dataStore = useDataStore();

const hoveredAircraft = ref<number | null>(null);
const isManualHover = ref(false);
const showAircraftLabel = ref<number[]>([]);

function getPilotsForPixel(pixel: Pixel, tolerance = 15, exitOnAnyOverlay = false) {
    const overlaysCoordinates: number[][] = [];

    if (exitOnAnyOverlay && store.openOverlayId && !store.openPilotOverlay) return [];

    map.value!.getOverlays().forEach((overlay) => {
        if ([...overlay.getElement()?.classList ?? []].some(x => x.includes('aircraft'))) return;
        const position = overlay.getPosition();
        if (position) {
            overlaysCoordinates.push(map.value!.getPixelFromCoordinate(position));
        }
    });

    return dataStore.vatsim.data.pilots.value.filter((x) => {
        const pilotPixel = aircraftCoordsToPixel(x);
        if (!pilotPixel) return false;

        return Math.abs(pilotPixel[0] - pixel[0]) < tolerance &&
            Math.abs(pilotPixel[1] - pixel[1]) < tolerance &&
            !overlaysCoordinates.some(x => Math.abs(pilotPixel[0] - x[0]) < 30 && Math.abs(pilotPixel[1] - x[1]) < 30);
    }) ?? [];
}

function aircraftCoordsToPixel(aircraft: VatsimShortenedAircraft): Pixel | null {
    return map.value!.getPixelFromCoordinate([aircraft.longitude, aircraft.latitude]);
}

const visiblePilots = shallowRef<VatsimShortenedAircraft[]>([]);

function setVisiblePilots() {
    visiblePilots.value = dataStore.vatsim.data.pilots.value.filter((x) => {
        const coordinates = [x.longitude, x.latitude];

        return isPointInExtent(coordinates);
    }) ?? [];
}

watch(dataStore.vatsim.updateTimestamp, () => {
    handleMoveEnd();
}, {
    immediate: true,
});

function handlePointerMove(e: MapBrowserEvent<any>) {
    const eventPixel = map.value!.getPixelFromCoordinate(fromLonLat(toLonLat(e.coordinate)));

    const features = getPilotsForPixel(eventPixel, undefined, true) ?? [];

    if (features.length !== 1 || !store.canShowOverlay) {
        if (!isManualHover.value) {
            hoveredAircraft.value = null;
        }

        if (store.mapCursorPointerTrigger === 1) store.mapCursorPointerTrigger = false;
        return;
    }

    if (isManualHover.value) return;

    isManualHover.value = false;

    if (getPilotsForPixel(aircraftCoordsToPixel(features[0])!).length === 1) {
        hoveredAircraft.value = features[0].cid;
        store.mapCursorPointerTrigger = 1;
    }
}

function handleClick(e: MapBrowserEvent<any>) {
    const eventPixel = map.value!.getPixelFromCoordinate(fromLonLat(toLonLat(e.coordinate)));

    const features = getPilotsForPixel(eventPixel, undefined, true) ?? [];
    if (features.length !== 1) return;

    store.addPilotOverlay(features[0].cid.toString());
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

watch(map, (val) => {
    if (!val) return;

    let hasLayer = false;
    val.getLayers().forEach((layer) => {
        if (hasLayer) return;
        hasLayer = layer.getProperties().type === 'aircraft';
    });
    if (hasLayer) return;

    if (!vectorLayer) {
        vectorSource.value = new VectorSource({
            features: [],
            wrapX: false,
        });

        vectorLayer = new VectorLayer({
            source: vectorSource.value,
            properties: {
                type: 'aircrafts',
            },
            zIndex: 6,
        });
    }

    val.addLayer(vectorLayer);

    val.on('pointermove', handlePointerMove);
    val.on('click', handleClick);
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    if (vectorLayer) map.value?.removeLayer(vectorLayer);
    map.value?.un('pointermove', handlePointerMove);
    map.value?.un('click', handleClick);
});
</script>
