<template>
    <map-airport
        v-for="({airport, aircrafts, localAtc, arrAtc, features}, index) in getAirportsList"
        :key="airport.icao + index + (airport.iata ?? 'undefined')"
        :airport="airport"
        :aircrafts="aircrafts"
        :is-visible="visibleAirports.length < 100"
        :local-atc="localAtc"
        :arr-atc="arrAtc"
        :is-hovered-airport="airport.icao === hoveredAirportName"
        :hovered-id="((airport.iata ? airport.iata === hoveredArrAirport : airport.icao === hoveredArrAirport) && hoveredId) ? hoveredId : null"
        :hovered-pixel="hoveredPixel"
        :navigraph-data="getAirportsData.find(x => x.airport === airport.icao)"
        :features
        @manualHover="[isManualHover = true, hoveredArrAirport = airport.iata || airport.icao]"
        @manualHide="[isManualHover = false, hoveredArrAirport = null]"
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

let vectorLayer: VectorLayer<any>;
let airportsLayer: VectorLayer<any>;

const vectorSource = shallowRef<VectorSource | null>(null);
const airportsSource = shallowRef<VectorSource | null>(null);
provide('vector-source', vectorSource);
provide('airports-source', airportsSource);

const map = inject<ShallowRef<Map | null>>('map')!;
const dataStore = useDataStore();
const mapStore = useMapStore();
const visibleAirports = shallowRef<{
    vatspyAirport: VatSpyData['airports'][0],
    vatsimAirport: MapAirportType,
}[]>([]);
const airportsData = shallowRef<{ airport: string, gates: NavigraphGate[], runways: NavigraphRunway[] }[]>([]);
const originalAirportsData = shallowRef<{ airport: string, gates: NavigraphGate[], runways: NavigraphRunway[] }[]>([]);
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

    if(airports.length === 1) {
        if (!mapStore.canShowOverlay) {
            hoveredAirportName.value = null;
            if (mapStore.mapCursorPointerTrigger === 3) mapStore.mapCursorPointerTrigger = false;
            return;
        }

        hoveredAirportName.value = airports[0].getProperties().icao;
        mapStore.mapCursorPointerTrigger = 3;
        return;
    }
    else if(mapStore.mapCursorPointerTrigger === 3) {
        hoveredAirportName.value = null;
        mapStore.mapCursorPointerTrigger = false;
    }

    let isInvalid = features.length !== 1 || (features[0].getProperties().type !== 'circle' && features[0].getProperties().type !== 'tracon');

    if (!isInvalid) {
        const airport = getAirportsList.value.find(x => (features[0].getProperties().iata || x.airport.iata) ? x.airport.iata === features[0].getProperties().iata : x.airport.icao === features[0].getProperties().icao);
        const pixel = map.value!.getCoordinateFromPixel(e.pixel);
        if (features[0].getProperties().type !== 'tracon') {
            isInvalid = pixel[1] - airport!.airport.lat < 80000;
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
    if(hoveredAirportName.value) mapStore.addAirportOverlay(hoveredAirportName.value);
}

watch(map, (val) => {
    if (!val) return;

    if (!vectorLayer) {
        vectorSource.value = new VectorSource({
            features: [],
            wrapX: false,
        });

        vectorLayer = new VectorLayer({
            source: vectorSource.value,
            zIndex: 5,
            properties: {
                type: 'arr-atc',
            },
        });

        val.addLayer(vectorLayer);
    }

    if (!airportsLayer) {
        airportsSource.value = new VectorSource({
            features: [],
            wrapX: false,
        });

        airportsLayer = new VectorLayer({
            source: airportsSource.value,
            zIndex: 5,
            properties: {
                type: 'airports',
            },
        });

        val.addLayer(airportsLayer);
    }

    val.on('pointermove', handlePointerMove);
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

    return getAirportsList.value.map((airport) => {
        const gateAirport = airportsData.value.find(x => x.airport === airport.airport.icao);
        if (!gateAirport) return null;

        const gates: NavigraphGate[] = gateAirport.gates;

        for (const pilot of [...airport.aircrafts.groundDep ?? [], ...airport.aircrafts.groundArr ?? []] as VatsimShortenedAircraft[]) {
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
            gates,
            runways: gateAirport.runways,
        };
    }).filter(x => !!x) as typeof airportsData['value'];
});

export interface AirportTraconFeature {
    id: string
    traconFeature: GeoJSONFeature,
    controllers: VatsimShortenedController[],
}

const getAirportsList = computed(() => {
    const facilities = useFacilitiesIds();
    const airports = visibleAirports.value.map(({
        vatsimAirport,
        vatspyAirport,
    }) => ({
        aircrafts: {} as MapAircraft,
        aircraftsList: vatsimAirport.aircrafts,
        aircraftsCids: Object.values(vatsimAirport.aircrafts).flatMap(x => x),
        airport: vatspyAirport,
        localAtc: [] as VatsimShortenedController[],
        arrAtc: [] as VatsimShortenedController[],
        features: [] as AirportTraconFeature[],
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
        const foundAirports = airports.filter(x => x.aircraftsCids.includes(pilot.cid));
        if (!foundAirports.length) continue;

        for (const airport of foundAirports) {
            if (airport.aircraftsList.departures?.includes(pilot.cid) && !airport.aircrafts.departures) airport.aircrafts.departures = true;
            if (airport.aircraftsList.arrivals?.includes(pilot.cid) && !airport.aircrafts.arrivals) airport.aircrafts.arrivals = true;

            if (airport.aircraftsList.groundArr?.includes(pilot.cid)) {
                if (!airport.aircrafts.groundArr) {
                    airport.aircrafts.groundArr = [pilot];
                }
                else {
                    (airport.aircrafts.groundArr as VatsimShortenedAircraft[]).push(pilot);
                }
            }

            if (airport.aircraftsList.groundDep?.includes(pilot.cid)) {
                if (!airport.aircrafts.groundDep) {
                    airport.aircrafts.groundDep = [pilot];
                }
                else {
                    (airport.aircrafts.groundDep as VatsimShortenedAircraft[]).push(pilot);
                }
            }
        }
    }

    for (const pilot of dataStore.vatsim.data.prefiles.value) {
        const airport = airports.find(x => x.aircraftsCids.includes(pilot.cid));
        if (!airport) continue;

        if (airport.aircraftsList.prefiles?.includes(pilot.cid)) {
            if (!airport.aircrafts.prefiles) {
                airport.aircrafts.prefiles = [pilot];
            }
            else {
                (airport.aircrafts.prefiles as VatsimShortenedPrefile[]).push(pilot);
            }
        }
    }

    for (const atc of dataStore.vatsim.data.locals.value) {
        const airport = airports.find(x => (x.airport.iata || atc.airport.iata) ? x.airport.iata === atc.airport.iata : x.airport.icao === atc.airport.icao);
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

    //Strict check
    for (const sector of dataStore.simaware.value?.data.features ?? []) {
        const prefixes = getTraconPrefixes(sector);
        const airport = airports.find(x =>
            x.airport.iata === sector.properties?.id ||
            x.airport.icao === sector.properties?.id ||
            prefixes.some(y => y.split('_')[0] === x.airport.icao) ||
            prefixes.some(y => y.split('_')[0] === x.airport.iata),
        );

        if (!airport?.arrAtc.length) continue;

        for (const controller of airport.arrAtc) {
            const splittedCallsign = controller.callsign.split('_');

            if (
                //Match AIRPORT_TYPE_NAME
                prefixes.includes(splittedCallsign.slice(0, 2).join('_')) ||
                //Match AIRPORT_NAME
                (splittedCallsign.length === 2 && prefixes.includes(splittedCallsign[0])) ||
                //Match AIRPORT_TYPERANDOMSTRING_NAME
                (splittedCallsign.length === 3 && prefixes.some(x => x.split('_').length === 2 && controller.callsign.startsWith(x)))
            ) {
                addToAirportSector(sector, airport, controller);
            }
        }
    }

    //Non-strict check
    for (const sector of dataStore.simaware.value?.data.features ?? []) {
        const prefixes = getTraconPrefixes(sector);
        const airport = airports.find(x =>
            x.airport.iata === sector.properties?.id ||
            x.airport.icao === sector.properties?.id ||
            prefixes.some(y => y.split('_')[0] === x.airport.icao) ||
            prefixes.some(y => y.split('_')[0] === x.airport.iata),
        );
        if (!airport?.arrAtc.length) continue;

        const id = JSON.stringify(sector.properties);

        //Only non found
        for (const controller of airport.arrAtc.filter(x => !airport.features.some(y => y.controllers.some(y => y.cid === x.cid)))) {
            if (prefixes.some(x => controller.callsign.startsWith(x))) {
                addToAirportSector(sector, airport, controller);
            }
        }

        //Still nothing found
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

async function setVisibleAirports() {
    const extent = mapStore.extent.slice();
    extent[0] -= 100000;
    extent[1] -= 100000;
    extent[2] += 100000;
    extent[3] += 100000;

    //@ts-expect-error
    visibleAirports.value = dataStore.vatsim.data.airports.value.map((x) => {
        let airport = x.isSimAware ? x : dataStore.vatspy.value!.data.airports.find(y => x.iata ? y.iata === x.iata : y.icao === x.icao);
        if (!x.isSimAware && airport?.icao !== x.icao) {
            //@ts-expect-error
            airport = {
                ...airport,
                icao: x.icao,
                isIata: true,
            };
        }
        if (!airport) return null;

        if (x.isSimAware) {
            const simawareFeature = dataStore.simaware.value?.data.features.find(y => y.properties?.id === x.icao);
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
                ...(await Promise.all(navigraphAirports.filter(x => !originalAirportsData.value.some(y => y.airport === x.vatsimAirport.icao)).map(x => $fetch(`/data/navigraph/airport/${ x.vatsimAirport.icao }`)))).flatMap(x => x ?? []),
            ];
        }

        airportsData.value = originalAirportsData.value.map((data) => {
            const gatesWithPixel = data.gates.map(x => ({
                ...x,
                pixel: map.value!.getPixelFromCoordinate([x.gate_longitude, x.gate_latitude]),
            }));

            return {
                airport: data.airport,
                gates: gatesWithPixel.filter((x, xIndex) => !gatesWithPixel.some((y, yIndex) => yIndex < xIndex && (Math.abs(y.pixel[0] - x.pixel[0]) < 15 && Math.abs(y.pixel[1] - x.pixel[1]) < 15))),
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
