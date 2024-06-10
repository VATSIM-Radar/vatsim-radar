<template>
    <map-airport
        v-for="({ airport, aircraft, localAtc, arrAtc, features }, index) in getAirportsList"
        :key="airport.icao + index + (airport.iata ?? 'undefined')"
        :aircraft="aircraft"
        :airport="airport"
        :arr-atc="arrAtc"
        :features
        :hovered-id="((airport.iata ? airport.iata === hoveredArrAirport : airport.icao === hoveredArrAirport) && hoveredId) ? hoveredId : null"
        :hovered-pixel="hoveredPixel"
        :is-hovered-airport="airport.icao === hoveredAirportName"
        :is-visible="visibleAirports.length < 100"
        :local-atc="localAtc"
        :navigraph-data="getAirportsData.find(x => x.airport === airport.icao)"
        @manualHide="[isManualHover = false, hoveredArrAirport = null]"
        @manualHover="[isManualHover = true, hoveredArrAirport = airport.iata || airport.icao]"
    />
</template>

<script setup lang="ts">
import VectorSource from 'ol/source/Vector';
import type { ShallowRef } from 'vue';
import type { Map, MapBrowserEvent } from 'ol';
import { Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import { attachMoveEnd, isPointInExtent } from '~/composables';
import type { MapAircraft, MapAirport as MapAirportType } from '~/types/map';

import type { VatsimShortenedAircraft, VatsimShortenedController, VatsimShortenedPrefile } from '~/types/data/vatsim';
import type { NavigraphAirportData, NavigraphGate, NavigraphRunway } from '~/types/data/navigraph';
import { Point } from 'ol/geom';
import { Fill, Style, Text } from 'ol/style';
import { adjustPilotLonLat, checkIsPilotInGate, getTraconPrefixes } from '~/utils/shared/vatsim';
import { useMapStore } from '~/store/map';
import MapAirport from '~/components/map/airports/MapAirport.vue';
import type { Coordinate } from 'ol/coordinate';
import type { GeoJSONFeature } from 'ol/format/GeoJSON';
import type { VatSpyData } from '~/types/data/vatspy';
import { containsExtent } from 'ol/extent';
import { GeoJSON } from 'ol/format';
import { useStore } from '~/store';

let vectorLayer: VectorLayer<any>;
let airportsLayer: VectorLayer<any>;

const vectorSource = shallowRef<VectorSource | null>(null);
const airportsSource = shallowRef<VectorSource | null>(null);
provide('vector-source', vectorSource);
provide('airports-source', airportsSource);

const map = inject<ShallowRef<Map | null>>('map')!;
const dataStore = useDataStore();
const mapStore = useMapStore();
const store = useStore();
const visibleAirports = shallowRef<{
    vatspyAirport: VatSpyData['airports'][0];
    vatsimAirport: MapAirportType;
}[]>([]);
const airportsData = shallowRef<{ airport: string; gates: NavigraphGate[]; runways: NavigraphRunway[] }[]>([]);
const originalAirportsData = shallowRef<{ airport: string; gates: NavigraphGate[]; runways: NavigraphRunway[] }[]>([]);
const isManualHover = ref(false);

const hoveredAirportName = ref<string | null>(null);
const hoveredArrAirport = ref<string | null>(null);
const hoveredPixel = ref<Coordinate | null>(null);
const hoveredId = ref<string | null>(null);

function handlePointerMove(e: MapBrowserEvent<any>) {
    if (mapStore.openOverlayId && !mapStore.openApproachOverlay) return;

    const features = map.value!.getFeaturesAtPixel(e.pixel, {
        hitTolerance: 5,
        layerFilter: layer => layer === vectorLayer,
    }).filter(x => x.getProperties().type !== 'background');

    const airports = map.value!.getFeaturesAtPixel(e.pixel, {
        hitTolerance: 5,
        layerFilter: layer => layer === airportsLayer,
    });

    hoveredAirportName.value = null;

    if (airports.length === 1) {
        if (!mapStore.canShowOverlay) {
            if (mapStore.mapCursorPointerTrigger === 3) mapStore.mapCursorPointerTrigger = false;
            return;
        }

        hoveredAirportName.value = airports[0].getProperties().icao;
        mapStore.mapCursorPointerTrigger = 3;
        return;
    }
    else if (mapStore.mapCursorPointerTrigger === 3) {
        mapStore.mapCursorPointerTrigger = false;
    }

    let isInvalid = features.length !== 1 || (features[0].getProperties().type !== 'circle' && features[0].getProperties().type !== 'tracon');

    if (!isInvalid) {
        const pixel = map.value!.getCoordinateFromPixel(e.pixel);
        const extent = features[0].getGeometry()?.getExtent();
        if (extent) {
            const textCoord = [extent[0] + 25000, extent[3] - 25000];
            isInvalid = Math.abs(pixel[1] - textCoord[1]) > 10000 || Math.abs(pixel[0] - textCoord[0]) > 10000;
        }
    }

    if (isInvalid || !mapStore.canShowOverlay) {
        if (!isManualHover.value) {
            hoveredArrAirport.value = null;
            hoveredPixel.value = null;
            hoveredId.value = null;
            mapStore.openApproachOverlay = false;
        }
        if (mapStore.mapCursorPointerTrigger === 2) mapStore.mapCursorPointerTrigger = false;
        return;
    }

    if (isManualHover.value) return;
    isManualHover.value = false;

    if (!hoveredPixel.value) {
        hoveredPixel.value = map.value!.getCoordinateFromPixel(e.pixel);
    }

    hoveredId.value = features[0].getProperties().id;
    hoveredArrAirport.value = features[0].getProperties().iata || features[0].getProperties().icao;
    mapStore.mapCursorPointerTrigger = 2;
    mapStore.openApproachOverlay = true;
}

function handleMapClick() {
    if (hoveredAirportName.value) mapStore.addAirportOverlay(hoveredAirportName.value);
}

watch(map, val => {
    if (!val) return;

    if (!vectorLayer) {
        vectorSource.value = new VectorSource<any>({
            features: [],
            wrapX: false,
        });

        vectorLayer = new VectorLayer<any>({
            source: vectorSource.value,
            zIndex: 5,
            properties: {
                type: 'arr-atc',
            },
        });

        val.addLayer(vectorLayer);
    }

    if (!airportsLayer) {
        airportsSource.value = new VectorSource<any>({
            features: [],
            wrapX: false,
        });

        airportsLayer = new VectorLayer<any>({
            source: airportsSource.value,
            zIndex: 5,
            properties: {
                type: 'airports',
            },
        });

        val.addLayer(airportsLayer);
    }

    attachPointerMove(handlePointerMove);
    val.on('click', handleMapClick);
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    if (vectorLayer) map.value?.removeLayer(vectorLayer);
    if (airportsLayer) map.value?.removeLayer(airportsLayer);
    map.value?.un('pointermove', handlePointerMove);
    map.value?.un('click', handleMapClick);
});

const getAirportsData = computed<NavigraphAirportData[]>(() => {
    if (!airportsData.value || mapStore.zoom < 13) return [];

    return getAirportsList.value.map(airport => {
        const gateAirport = originalAirportsData.value.find(x => x.airport === airport.airport.icao);
        const filteredGates = airportsData.value.find(x => x.airport === airport.airport.icao)?.gates;
        if (!gateAirport || !filteredGates) return null;

        const gates: NavigraphGate[] = gateAirport.gates.map(x => structuredClone(x));

        for (const pilot of [...airport.aircraft.groundDep ?? [], ...airport.aircraft.groundArr ?? []] as VatsimShortenedAircraft[]) {
            if (pilot.callsign === 'QAC3404') {
                const correct = adjustPilotLonLat(pilot);
                console.log(pilot.heading);
                const feature = new Feature({
                    geometry: new Point(correct),
                });

                feature.setStyle(new Style({
                    text: new Text({
                        font: '12px Arial',
                        text: 'Here!',
                        fill: new Fill({
                            color: '#3B6CEC',
                        }),
                    }),
                }));

                vectorSource.value?.addFeature(feature);

                setTimeout(() => {
                    vectorSource.value?.removeFeature(feature);
                    feature.dispose();
                }, 5000);
            }

            checkIsPilotInGate(pilot, gates);
        }

        return {
            airport: gateAirport.airport,
            gates: gates.filter(x => filteredGates.some(y => y.gate_identifier === x.gate_identifier)),
            runways: gateAirport.runways,
        };
    }).filter(x => !!x) as typeof airportsData['value'];
});

export interface AirportTraconFeature {
    id: string;
    traconFeature: GeoJSONFeature;
    controllers: VatsimShortenedController[];
}

const getAirportsList = computed(() => {
    const facilities = useFacilitiesIds();
    const airports = visibleAirports.value.map(({
        vatsimAirport,
        vatspyAirport,
    }) => ({
        aircraft: {} as MapAircraft,
        aircraftList: vatsimAirport.aircraft,
        aircraftCids: Object.values(vatsimAirport.aircraft).flatMap(x => x),
        airport: vatspyAirport,
        localAtc: [] as VatsimShortenedController[],
        arrAtc: [] as VatsimShortenedController[],
        features: [] as AirportTraconFeature[],
        isSimAware: vatsimAirport.isSimAware,
    }));

    function addToAirportSector(sector: GeoJSONFeature, airport: typeof airports[0], controller: VatsimShortenedController) {
        const id = JSON.stringify(sector.properties);
        let existingSector = airport.features.find(x => x.id === id);
        if (existingSector) {
            existingSector.controllers.push(controller);
        }
        else {
            existingSector = {
                id,
                traconFeature: sector,
                controllers: [controller],
            };

            airport.features.push(existingSector);
        }

        return existingSector;
    }

    for (const pilot of dataStore.vatsim.data.pilots.value) {
        const foundAirports = airports.filter(x => x.aircraftCids.includes(pilot.cid));
        if (!foundAirports.length) continue;

        for (const airport of foundAirports) {
            if (airport.aircraftList.departures?.includes(pilot.cid) && !airport.aircraft.departures) airport.aircraft.departures = true;
            if (airport.aircraftList.arrivals?.includes(pilot.cid) && !airport.aircraft.arrivals) airport.aircraft.arrivals = true;

            if (airport.aircraftList.groundArr?.includes(pilot.cid)) {
                if (!airport.aircraft.groundArr) {
                    airport.aircraft.groundArr = [pilot];
                }
                else {
                    (airport.aircraft.groundArr as VatsimShortenedAircraft[]).push(pilot);
                }
            }

            if (airport.aircraftList.groundDep?.includes(pilot.cid)) {
                if (!airport.aircraft.groundDep) {
                    airport.aircraft.groundDep = [pilot];
                }
                else {
                    (airport.aircraft.groundDep as VatsimShortenedAircraft[]).push(pilot);
                }
            }
        }
    }

    for (const pilot of dataStore.vatsim.data.prefiles.value) {
        const airport = airports.find(x => x.aircraftCids.includes(pilot.cid));
        if (!airport) continue;

        if (airport.aircraftList.prefiles?.includes(pilot.cid)) {
            if (!airport.aircraft.prefiles) {
                airport.aircraft.prefiles = [pilot];
            }
            else {
                (airport.aircraft.prefiles as VatsimShortenedPrefile[]).push(pilot);
            }
        }
    }

    for (const atc of dataStore.vatsim.data.locals.value) {
        const airport = airports.find(x => ((x.airport.iata || atc.airport.iata) && (atc.airport.isSimAware || !airports.some(y => x.airport.lat === y.airport.lat && x.airport.lon && y.airport.lon))) ? x.airport.iata === atc.airport.iata : x.airport.icao === atc.airport.icao);
        const icaoOnlyAirport = airports.find(x => atc.airport.isPseudo && atc.airport.iata && x.airport.icao === atc.airport.icao);
        if (!airport) continue;

        const isArr = !atc.isATIS && atc.atc.facility === facilities.APP;
        if (isArr) {
            airport.arrAtc.push(atc.atc);
            continue;
        }

        const isLocal = atc.isATIS || atc.atc.facility === facilities.DEL || atc.atc.facility === facilities.TWR || atc.atc.facility === facilities.GND;
        if (isLocal) (icaoOnlyAirport || airport).localAtc.push(atc.atc);
    }

    function findSectorAirport(sector: GeoJSONFeature) {
        const prefixes = getTraconPrefixes(sector);
        let airport = airports.find(x => x.isSimAware &&
            prefixes.some(y => y.split('_')[0] === x.airport.iata));

        if (!airport) {
            airport = airports.find(x => x.isSimAware &&
                prefixes.some(y => y.split('_')[0] === x.airport.icao));
        }

        if (!airport) {
            airport = airports.find(x => prefixes.some(y => y.split('_')[0] === x.airport.iata));
        }

        if (!airport) {
            airport = airports.find(x => prefixes.some(y => y.split('_')[0] === x.airport.icao));
        }

        return airport;
    }

    // Strict check
    for (const sector of dataStore.simaware.value?.data.features ?? []) {
        const prefixes = getTraconPrefixes(sector);
        const airport = findSectorAirport(sector);

        if (!airport?.arrAtc.length) continue;

        for (const controller of airport.arrAtc) {
            const splittedCallsign = controller.callsign.split('_');

            if (
                // Match AIRPORT_TYPE_NAME
                prefixes.includes(splittedCallsign.slice(0, 2).join('_')) ||
                // Match AIRPORT_NAME
                (splittedCallsign.length === 2 && prefixes.includes(splittedCallsign[0])) ||
                // Match AIRPORT_TYPERANDOMSTRING_NAME
                (splittedCallsign.length === 3 && prefixes.some(x => x.split('_').length === 2 && controller.callsign.startsWith(x)))
            ) {
                addToAirportSector(sector, airport, controller);
            }
        }
    }

    // Non-strict check
    for (const sector of dataStore.simaware.value?.data.features ?? []) {
        const prefixes = getTraconPrefixes(sector);
        const airport = findSectorAirport(sector);

        if (!airport?.arrAtc.length) continue;

        // Only non found
        for (const controller of airport.arrAtc.filter(x => !airport.features.some(y => y.controllers.some(y => y.cid === x.cid)))) {
            if (prefixes.some(x => controller.callsign.startsWith(x))) {
                addToAirportSector(sector, airport, controller);
            }
        }
    }

    // For non found
    for (const sector of dataStore.simaware.value?.data.features ?? []) {
        const airport = findSectorAirport(sector);

        if (!airport?.arrAtc.length) continue;

        const id = JSON.stringify(sector.properties);

        // Still nothing found
        if (!airport.features.length) {
            airport.features.push({
                id,
                traconFeature: sector,
                controllers: airport.arrAtc,
            });
        }
    }

    return airports;
});

const geoJson = new GeoJSON();

const vatAirportsList = computed(() => {
    let list = dataStore.vatsim.data.airports.value;

    if (!store.config.airports?.length && !store.config.airport) return list;

    list = list.filter(x => store.config.airport ? x.icao === store.config.airport : store.config.airports!.includes(x.icao));

    for (const airport of store.config.airport ? [store.config.airport!] : store.config.airports!) {
        if (list.some(x => x.icao === airport)) continue;

        const vatspyAirport = dataStore.vatspy.value!.data.airports.find(x => x.icao === airport);
        if (!vatspyAirport) continue;

        list.push({
            isPseudo: false,
            isSimAware: false,
            icao: airport!,
            aircraft: {},
        });
    }

    return list;
});

async function setVisibleAirports() {
    const extent = mapStore.extent.slice();
    extent[0] -= 100000;
    extent[1] -= 100000;
    extent[2] += 100000;
    extent[3] += 100000;

    // @ts-expect-error Dynamic return value
    visibleAirports.value = vatAirportsList.value.map(x => {
        const vatAirport = dataStore.vatspy.value!.data.airports.find(y => x.iata ? y.iata === x.iata : y.icao === x.icao);
        let airport = x.isSimAware ? vatAirport || x : vatAirport;
        if (!x.isSimAware && airport?.icao !== x.icao) {
            // @ts-expect-error We're ok with this airport type
            airport = {
                ...airport,
                icao: x.icao,
                isIata: true,
            };
        }
        if (!airport) return null;

        if (x.isSimAware) {
            const simawareFeature = dataStore.simaware.value?.data.features.find(y => getTraconPrefixes(y).some(y => y.split('_')[0] === (x.iata ?? x.icao)));
            if (!simawareFeature) return null;

            const feature = geoJson.readFeature(simawareFeature);

            return containsExtent(extent, feature.getGeometry()!.getExtent())
                ? {
                    vatspyAirport: airport,
                    vatsimAirport: x,
                }
                : null;
        }

        const coordinates = 'lon' in airport ? [airport.lon, airport.lat] : [];

        return isPointInExtent(coordinates, extent)
            ? {
                vatspyAirport: airport,
                vatsimAirport: x,
            }
            : null;
    }).filter(x => !!x) ?? [];

    if ((map.value!.getView().getZoom() ?? 0) > 13) {
        const navigraphAirports = visibleAirports.value.filter(x => !x.vatsimAirport.isPseudo);

        if (!navigraphAirports.every(x => originalAirportsData.value.some(y => y.airport === x.vatsimAirport.icao))) {
            originalAirportsData.value = [
                ...originalAirportsData.value,
                ...(await Promise.all(navigraphAirports.filter(x => !originalAirportsData.value.some(y => y.airport === x.vatsimAirport.icao)).map(x => $fetch(`/api/data/navigraph/airport/${ x.vatsimAirport.icao }`)))).flatMap(x => x ?? []),
            ];
        }

        airportsData.value = originalAirportsData.value.map(data => {
            const gatesWithPixel = data.gates.map(x => ({
                ...x,
                pixel: map.value!.getPixelFromCoordinate([x.gate_longitude, x.gate_latitude]),
            }));

            return {
                airport: data.airport,
                gates: gatesWithPixel.filter((x, xIndex) => !gatesWithPixel.some((y, yIndex) => yIndex < xIndex && (Math.abs(y.pixel?.[0] - x.pixel?.[0]) < 15 && Math.abs(y.pixel?.[1] - x.pixel?.[1]) < 15))),
                runways: data.runways,
            };
        });
    }
}

attachMoveEnd(setVisibleAirports);

watch(dataStore.vatsim.updateTimestamp, () => {
    setVisibleAirports();
}, {
    immediate: true,
});
</script>
