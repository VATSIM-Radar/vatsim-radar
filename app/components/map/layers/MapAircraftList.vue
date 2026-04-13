<script setup lang="ts">
import VectorSource from 'ol/source/Vector.js';
import VectorLayer from 'ol/layer/Vector.js';
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import { useUpdateCallback } from '~/composables';
import { useMapStore } from '~/store/map';
import { useStore } from '~/store';
import type { MapAircraftKeys } from '~/types/map';
import VectorImageLayer from 'ol/layer/VectorImage.js';
import { isHideMapObject } from '~/composables/settings';
import { Heatmap } from 'ol/layer.js';
import { calculateDistanceInNauticalMiles } from '~/utils/shared/flight';
import type { Coordinate } from 'ol/coordinate.js';
import { ownFlight } from '~/composables/vatsim/pilots';
import { FEATURES_Z_INDEX } from '~/composables/render';
import { wrapAndSliceX } from 'ol/extent';
import { transformExtent } from 'ol/proj';
import { isMapFeature } from '~/utils/map/entities';
import { setMapAircraft } from '~/composables/render/aircraft';
import type { TrackData } from '~/composables/render/aircraft';

defineOptions({
    render: () => null,
});

let vectorLayer: VectorLayer<any>;
let vectorSource: VectorSource;

let linesLayer: VectorImageLayer<any>;
let linesSource: VectorSource;

const canRender = computed(() => !isHideMapObject('pilots'));

let heatmap: Heatmap | null = null;

const map = inject<ShallowRef<Map | null>>('map')!;
const store = useStore();
const mapStore = useMapStore();
const dataStore = useDataStore();
const config = useRuntimeConfig();

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

const showTracks = shallowRef<Record<string, TrackData>>({});

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

    for (const icao in dataStore.airportsList.value) {
        const airport = dataStore.airportsList.value[icao];
        if (airport.icao === arrivalAirport) continue;

        if (me && !store.mapSettings.groundTraffic?.excludeMyLocation) {
            const check = airport.aircraft.groundDep?.includes(me.cid) || airport.aircraft.groundArr?.includes(me.cid) || airport.aircraft.prefiles?.includes(me.cid);
            if (check) continue;
        }

        allOnGround.push(...airport.aircraft.groundDep ?? []);
        allOnGround.push(...airport.aircraft.groundArr ?? []);
    }


    return pilots.filter(x => pilotsOverlays.value.includes(x.cid) || !allOnGround.includes(x.cid));
});

const pilotsOverlays = computed(() => useMapStore().overlays.filter(x => x.type === 'pilot').map(x => +x.key));
const airportOverlays = computed(() => useMapStore().overlays.filter(x => x.type === 'airport' && x.data.showTracks).map(x => x.key));
const renderedPilots = computed(() => useMapStore().renderedPilots);

function setVisiblePilots() {
    if (!map.value) return;
    const tracks: Record<string, TrackData> = {};

    const {
        mode: tracksMode = 'arrivalsOnly',
        limit: tracksLimit = 50,
    } = store.mapSettings.tracks ?? {};

    const extent = mapStore.extent.slice();
    extent[0] -= 0.9;
    extent[1] -= 0.9;
    extent[2] += 0.9;
    extent[3] += 0.9;
    const realExtent = wrapAndSliceX(transformExtent(mapStore.extent, 'EPSG:4326', 'EPSG:3857'), map.value!.getView().getProjection(), true);

    const _visibleFeatures = realExtent.flatMap(x => vectorSource.getFeaturesInExtent(transformExtent(x, 'EPSG:3857', 'EPSG:4326'), map.value!.getView().getProjection()));

    const visibleFeatures = new Set(_visibleFeatures.map(x => {
        const properties = x.getProperties();
        if (isMapFeature('aircraft', properties)) {
            return properties.id;
        }

        return null;
    }).filter(x => x));

    // All are "visible" by default
    dataStore.visiblePilots.value = dataStore.vatsim._mandatoryData.value?.pilots ?? [];

    // Calculating tracks data
    dataStore.visiblePilots.value.forEach(x => {
        const pilot = dataStore.vatsim.data.keyedPilots.value[x.cid.toString()];

        const isOverlay = pilotsOverlays.value.includes(x.cid);
        const isShown = visibleFeatures.has(x.cid);

        if (isOverlay) {
            tracks[pilot.cid.toString()] = {
                pilot,
                show: 'full',
                isShown: true,
            };
            return;
        }

        if (!pilot || !isShown) return;

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
            const airport = pilot.departure && airportOverlays.value.includes(pilot.departure);
            if (airport) {
                tracks[pilot.cid.toString()] = {
                    pilot,
                    show: 'full',
                    isShown,
                    isDeparture: true,
                };
            }
        }

        if (canShowForArrivals) {
            const airport = pilot.arrival && airportOverlays.value.includes(pilot.arrival);
            const duplicate = tracks[pilot.cid.toString()];
            if (airport) {
                if (duplicate) duplicate.isArrival = true;
                else {
                    tracks[pilot.cid.toString()] = {
                        pilot,
                        show: 'full',
                        isShown,
                        isArrival: true,
                    };
                }
            }
        }
    });

    const tracksEntries = Object.entries(tracks);

    if (tracksEntries.length > tracksLimit) {
        showTracks.value = Object.fromEntries(
            tracksEntries.filter(([, x]) => pilotsOverlays.value.includes(x.pilot.cid) || (x.pilot.toGoDist && x.pilot.toGoDist > 0) || (x.pilot.depDist && x.pilot.depDist > 0)).sort(([, a], [,b]) => {
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
                if (index >= tracksLimit && !pilotsOverlays.value.includes(x.pilot.cid)) x.show = 'short';

                return [key, x] satisfies [string, typeof x];
            }).filter(([, x], index) => index < 50 || x.isShown || pilotsOverlays.value.includes(x.pilot.cid)),
        );
    }
    else {
        showTracks.value = tracks;
    }

    if (store.config.airports?.length && store.config.onlyAirportsAircraft) {
        const aircraft = new Set<number>();

        for (const key in dataStore.airportsList.value) {
            if (!store.config.airports!.includes(key)) continue;

            for (const cid of Object.values(dataStore.airportsList.value[key].aircraft).flat()) {
                aircraft.add(cid);
            }
        }

        if (aircraft.size) {
            dataStore.visiblePilots.value = dataStore.visiblePilots.value.filter(x => aircraft.has(x.cid));
        }
        else {
            dataStore.visiblePilots.value = [];
        }
    }

    if (store.config.airport && store.config.onlyAirportAircraft) {
        const airport = dataStore.airportsList.value[store.config.airport];
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

function initHeatmap() {
    if (store.mapSettings.heatmapLayer) {
        if (!vectorSource || heatmap) return;

        heatmap = new Heatmap({
            source: vectorSource,
            zIndex: FEATURES_Z_INDEX.AIRCRAFT_HEATMAP,
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

const updateRelatedSettings = computed(() => JSON.stringify(store.mapSettings.tracks ?? {}) + String(mapStore.hoveredPilot));

let init = false;

const visibleSet = useThrottleFn(setVisiblePilots, 1000);

const debouncedUpdate = useThrottleFn(() => {
    if (!canRender.value) {
        vectorSource.clear();
        linesSource.clear();
    }
    else {
        setMapAircraft({
            source: vectorSource,
            layer: vectorLayer,
            linesSource: linesSource,
            linesLayer: linesLayer,
            shownPilots: getShownPilots.value,
            tracks: showTracks.value,
        });
    }
}, 500, true);

useUpdateCallback(['mandatory', 'short', 'extent', showTracks, updateRelatedSettings], () => {
    if (!init) return;
    visibleSet();
});

watch([getShownPilots, canRender, showTracks, renderedPilots], debouncedUpdate);

watch(map, val => {
    if (!val) return;

    let hasLayer = false;
    val.getLayers().forEach(layer => {
        if (hasLayer) return;
        hasLayer = layer.getProperties().type === 'aircraft';
    });
    if (hasLayer) return;

    if (!vectorLayer) {
        vectorSource = new VectorSource<any>({
            features: [],
            wrapX: true,
        });

        vectorLayer = new VectorLayer<any>({
            source: vectorSource,
            updateWhileAnimating: false,
            updateWhileInteracting: false,
            declutter: 'aircraft',
            properties: {
                type: 'aircraft',
                selectable: true,
            },
            zIndex: FEATURES_Z_INDEX.AIRCRAFT,
        });
    }

    if (!linesLayer) {
        linesSource = new VectorSource<any>({
            features: [],
            wrapX: true,
            overlaps: true,
        });

        linesLayer = new VectorImageLayer<any>({
            source: linesSource,
            properties: {
                type: 'aircraft-line',
            },
            zIndex: FEATURES_Z_INDEX.AIRCRAFT_LINE,
        });
    }

    initHeatmap();

    val.addLayer(vectorLayer);
    val.addLayer(linesLayer);

    setVisiblePilots();
    init = true;
}, {
    immediate: true,
});

onMounted(() => {
    window.addEventListener('message', receiveMessage);
});

onBeforeUnmount(() => {
    if (vectorLayer) map.value?.removeLayer(vectorLayer);
    vectorLayer?.dispose();
    if (linesLayer) map.value?.removeLayer(linesLayer);
    linesLayer?.dispose();
    vectorSource?.clear();
    linesSource?.clear();
    window.removeEventListener('message', receiveMessage);
    if (heatmap) {
        map.value?.removeLayer(heatmap);
    }
});
</script>
