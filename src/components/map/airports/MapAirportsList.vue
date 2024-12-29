<template>
    <template v-if="!isHideMapObject('airports')">
        <map-airport
            v-for="({ airport, aircraft, localAtc, arrAtc, features }, index) in getShownAirports"
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
</template>

<script setup lang="ts">
import VectorSource from 'ol/source/Vector';
import type { ShallowRef } from 'vue';
import type { Map, MapBrowserEvent } from 'ol';
import { Feature } from 'ol';
import { attachMoveEnd, isPointInExtent, useIsMobileOrTablet } from '~/composables';
import type { MapAircraft, MapAircraftList, MapAirport as MapAirportType } from '~/types/map';

import type { VatsimShortenedAircraft, VatsimShortenedController } from '~/types/data/vatsim';
import type {
    NavigraphAirportData,
    NavigraphGate,
    NavigraphLayout,
    NavigraphLayoutType,
    NavigraphRunway,
} from '~/types/data/navigraph';
import { Point } from 'ol/geom';
import { Fill, Style, Text } from 'ol/style';
import { adjustPilotLonLat, checkIsPilotInGate, getTraconPrefixes, getTraconSuffix } from '~/utils/shared/vatsim';
import { useMapStore } from '~/store/map';
import MapAirport from '~/components/map/airports/MapAirport.vue';
import type { Coordinate } from 'ol/coordinate';
import type { GeoJSONFeature } from 'ol/format/GeoJSON';
import type { VatSpyAirport, VatSpyData, VatSpyDataLocalATC } from '~/types/data/vatspy';
import { intersects } from 'ol/extent';
import { GeoJSON } from 'ol/format';
import { useStore } from '~/store';
import type { GeoJsonProperties, MultiPolygon, Feature as GeoFeature, Polygon } from 'geojson';
import VectorLayer from 'ol/layer/Vector';
import type { FeatureLike } from 'ol/Feature';
import VectorImageLayer from 'ol/layer/VectorImage';
import { airportLayoutStyles } from '~/composables/airport-layout';

let vectorLayer: VectorLayer<any>;
let airportsLayer: VectorLayer<any>;
let airportVectorLayer: VectorImageLayer<any>;
let gatesLayer: VectorLayer<any>;

const vectorSource = shallowRef<VectorSource | null>(null);
const airportsSource = shallowRef<VectorSource | null>(null);
const airportLayerSource = shallowRef<VectorSource | null>(null);
const gatesSource = shallowRef<VectorSource | null>(null);
provide('vector-source', vectorSource);
provide('airports-source', airportsSource);
provide('layer-source', airportLayerSource);
provide('gates-source', gatesSource);

let settingAirports = false;
const map = inject<ShallowRef<Map | null>>('map')!;
const dataStore = useDataStore();
const mapStore = useMapStore();
const store = useStore();
const airportsList = shallowRef<{
    vatspyAirport: VatSpyData['airports'][0];
    vatsimAirport: MapAirportType;
    visible: boolean;
}[]>([]);
const visibleAirports = shallowRef<{
    vatspyAirport: VatSpyData['airports'][0];
    vatsimAirport: MapAirportType;
}[]>([]);
const airportsData = shallowRef<{ airport: string; gates: NavigraphGate[]; runways: NavigraphRunway[]; layout?: NavigraphLayout }[]>([]);
const originalAirportsData = shallowRef<{ airport: string; gates: NavigraphGate[]; runways: NavigraphRunway[]; layout?: NavigraphLayout }[]>([]);
const isManualHover = ref(false);

const hoveredAirportName = ref<string | null>(null);
const hoveredArrAirport = ref<string | null>(null);
const hoveredPixel = ref<Coordinate | null>(null);
const hoveredId = ref<string | null>(null);
const isMobileOrTablet = useIsMobileOrTablet();

const getShownAirports = computed(() => {
    let list = getAirportsList.value.filter(x => visibleAirports.value.some(y => y.vatspyAirport.icao === x.airport.icao));

    switch (store.mapSettings.airportsMode) {
        case 'staffedOnly':
            list = list.filter(x => {
                const hasForAircraft = mapStore.overlays.some(y => y.type === 'pilot' && (y.data.pilot.flight_plan?.departure === x.airport.icao || y.data.pilot.flight_plan?.arrival === x.airport.icao));

                return hasForAircraft || mapStore.overlays.some(y => y.type === 'airport' && y.key === x.airport.icao) || x.arrAtc.length || x.localAtc.length;
            });
            break;
        case 'staffedAndGroundTraffic':
            list = list.filter(x => {
                const hasForAircraft = mapStore.overlays.some(y => y.type === 'pilot' && (y.data.pilot.flight_plan?.departure === x.airport.icao || y.data.pilot.flight_plan?.arrival === x.airport.icao));

                return hasForAircraft || mapStore.overlays.some(y => y.type === 'airport' && y.key === x.airport.icao) || x.arrAtc.length || x.localAtc.length || x.aircraftList.groundArr?.length || x.aircraftList.groundDep?.length;
            });
            break;
    }

    return list;
});

function handlePointerMove(e: MapBrowserEvent<any>) {
    if (mapStore.openOverlayId && !mapStore.openApproachOverlay) return;

    const features = map.value!.getFeaturesAtPixel(e.pixel, {
        hitTolerance: 0,
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

    let appropriateFeature: FeatureLike | undefined;

    function clear() {
        if (!isManualHover.value) {
            hoveredArrAirport.value = null;
            hoveredPixel.value = null;
            hoveredId.value = null;
            mapStore.openApproachOverlay = false;
        }
        if (mapStore.mapCursorPointerTrigger === 2) mapStore.mapCursorPointerTrigger = false;
    }

    if (isManualHover.value || !features.length) {
        clear();
        return;
    }

    for (const feature of features) {
        const isInvalid = (feature.getProperties().type !== 'tracon-label');

        if (!isInvalid && mapStore.canShowOverlay) {
            appropriateFeature = feature;
            break;
        }
    }

    if (!appropriateFeature) {
        clear();

        return;
    }

    isManualHover.value = false;

    const extent = appropriateFeature.getGeometry()?.getExtent();
    const bottomMiddle = [(extent![0] + extent![2]) / 2, extent![1]];
    const pixel = map.value!.getPixelFromCoordinate(bottomMiddle);
    pixel[1] += 5; // Move overlay by 5 pixels to the bottom
    hoveredPixel.value = map.value!.getCoordinateFromPixel(pixel);

    hoveredId.value = appropriateFeature.getProperties().id;
    hoveredArrAirport.value = appropriateFeature.getProperties().iata || appropriateFeature.getProperties().icao;
    mapStore.mapCursorPointerTrigger = 2;
    mapStore.openApproachOverlay = true;
}

function handleMapClick(e: MapBrowserEvent<any>) {
    if (hoveredAirportName.value) mapStore.addAirportOverlay(hoveredAirportName.value);

    if (isMobileOrTablet.value) handlePointerMove(e);
}

watch(() => String(store.mapSettings.navigraphLayers?.disable) + String(store.mapSettings.navigraphLayers?.gatesFallback), () => {
    originalAirportsData.value = [];
    airportsData.value = [];

    setVisibleAirports();
});

watch(map, val => {
    if (!val || vectorLayer) return;

    if (!vectorLayer) {
        vectorSource.value = new VectorSource<any>({
            features: [],
            wrapX: false,
        });

        vectorLayer = new VectorLayer<any>({
            source: vectorSource.value,
            zIndex: 7,
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
            zIndex: 8,
            properties: {
                type: 'airports',
            },
        });

        val.addLayer(airportsLayer);
    }

    if (!airportVectorLayer) {
        airportLayerSource.value = new VectorSource<any>({
            features: [],
            wrapX: false,
        });

        const styles = airportLayoutStyles();

        airportVectorLayer = new VectorImageLayer<any>({
            source: airportLayerSource.value,
            zIndex: 5,
            declutter: true,
            properties: {
                type: 'airport-layer',
            },
            imageRatio: 2,
            minZoom: 12,
            style: function(feature) {
                const type = feature.getProperties().type as NavigraphLayoutType;
                const style = styles[type];

                if (typeof style === 'function') return style(feature);

                return style;
            },
        });

        val.addLayer(airportVectorLayer);
    }

    if (!gatesLayer) {
        gatesSource.value = new VectorSource<any>({
            features: [],
            wrapX: false,
        });

        const styles = airportLayoutStyles();

        gatesLayer = new VectorLayer<any>({
            source: gatesSource.value,
            properties: {
                type: 'airport-layer',
            },
            style: function(feature) {
                const type = feature.getProperties().type as NavigraphLayoutType;
                const style = styles[type];

                if (typeof style === 'function') return style(feature);

                return style;
            },
            zIndex: 6,
        });

        val.addLayer(gatesLayer);
    }

    attachMoveEnd(setVisibleAirports);
    useUpdateInterval(setVisibleAirports);
    watch(() => String(isHideMapObject('gates')) + isHideMapObject('runways'), setVisibleAirports);
    attachPointerMove(handlePointerMove);
    val.on('click', handleMapClick);
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    if (vectorLayer) map.value?.removeLayer(vectorLayer);
    if (vectorLayer) map.value?.removeLayer(vectorLayer);
    if (airportsLayer) map.value?.removeLayer(airportsLayer);
    if (airportVectorLayer) map.value?.removeLayer(airportVectorLayer);
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
            runways: isHideMapObject('runways') ? [] : gateAirport.runways,
            layout: gateAirport.layout,
        };
    }).filter(x => !!x) as typeof airportsData['value'];
});

export interface AirportTraconFeature {
    id: string;
    traconFeature: GeoJSONFeature;
    controllers: VatsimShortenedController[];
}

export interface AirportsList {
    aircraft: MapAircraft;
    aircraftList: MapAircraftList;
    aircraftCids: number[];
    airport: VatSpyAirport;
    localAtc: VatsimShortenedController[];
    arrAtc: VatsimShortenedController[];
    arrAtcInfo: VatSpyDataLocalATC[];
    features: AirportTraconFeature[];
    isSimAware: boolean;
}

const getAirportsList = computed(() => {
    const facilities = useFacilitiesIds();
    const airports = ((store.featuredAirportsOpen && !store.featuredVisibleOnly) ? airportsList : visibleAirports).value.map(({
        vatsimAirport,
        vatspyAirport,
    }) => ({
        aircraft: {},
        aircraftList: vatsimAirport.aircraft,
        aircraftCids: Object.values(vatsimAirport.aircraft).flatMap(x => x),
        airport: vatspyAirport,
        localAtc: [],
        arrAtc: [],
        arrAtcInfo: [],
        features: [],
        isSimAware: vatsimAirport.isSimAware,
    } satisfies AirportsList as AirportsList));

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
            if (airport.aircraftList.departures?.includes(pilot.cid)) {
                airport.aircraft.departures ??= [];
                airport.aircraft.departures.push(pilot);
            }
            if (airport.aircraftList.arrivals?.includes(pilot.cid)) {
                airport.aircraft.arrivals ??= [];
                airport.aircraft.arrivals.push(pilot);
            }

            if (airport.aircraftList.groundArr?.includes(pilot.cid)) {
                airport.aircraft.groundArr ??= [];
                airport.aircraft.groundArr.push(pilot);
            }

            if (airport.aircraftList.groundDep?.includes(pilot.cid)) {
                airport.aircraft.groundDep ??= [];
                airport.aircraft.groundDep.push(pilot);
            }
        }
    }

    for (const pilot of dataStore.vatsim.data.prefiles.value) {
        const airport = airports.find(x => x.aircraftCids.includes(pilot.cid));
        if (!airport) continue;

        if (airport.aircraftList.prefiles?.includes(pilot.cid)) {
            airport.aircraft.prefiles ??= [];
            airport.aircraft.prefiles.push(pilot);
        }
    }

    for (const atc of dataStore.vatsim.data.locals.value) {
        const isArr = !atc.isATIS && atc.atc.facility === facilities.APP;
        const icaoOnlyAirport = airports.find(x => x.airport.icao === atc.airport.icao);
        const iataAirport = airports.find(x => (
            atc.airport.iata &&
            x.airport.iata === atc.airport.iata &&
            (isArr || !airports.some(y => y.airport.icao === x.airport.icao && y.airport.iata !== x.airport.iata && x.airport.lat === y.airport.lat && x.airport.lon === y.airport.lon))
        ));

        const airport = iataAirport || icaoOnlyAirport;

        if (!airport) continue;

        if (isArr) {
            airport.arrAtc.push(atc.atc);
            airport.arrAtcInfo.push(atc);
            continue;
        }

        const isLocal = atc.isATIS || atc.atc.facility === facilities.DEL || atc.atc.facility === facilities.TWR || atc.atc.facility === facilities.GND;
        if (isLocal) airport.localAtc.push(atc.atc);
    }

    function findSectorAirport(sector: GeoJSONFeature) {
        const prefixes = getTraconPrefixes(sector);

        let airport = airports.find(x => x.arrAtcInfo.some(x => x.airport.tracon && prefixes.includes(x.airport.tracon)));

        if (!airport) {
            airport = airports.find(x => x.airport.iata && prefixes.some(y => y.split('_')[0] === x.airport.iata));
        }

        if (!airport) {
            airport = airports.find(x => prefixes.some(y => y.split('_')[0] === x.airport.icao));
        }

        if (!airport) {
            airport = airports.find(x => x.airport.iata && sector.properties!.id === x.airport.iata);
        }

        if (!airport) {
            airport = airports.find(x => sector.properties!.id === x.airport.icao);
        }

        return airport;
    }

    const sectors: {
        sector: GeoFeature<MultiPolygon | Polygon, GeoJsonProperties>;
        prefixes: string[];
        suffix: string | null;
        airport: typeof airports[0];
    }[] = [];

    for (const sector of dataStore.simaware.value?.data.features ?? []) {
        const prefixes = getTraconPrefixes(sector);
        const suffix = getTraconSuffix(sector);
        const airport = findSectorAirport(sector);

        if (airport?.arrAtc.length) {
            sectors.push({
                sector,
                prefixes,
                suffix,
                airport,
            });
        }
    }

    // Strict check
    for (const { airport, prefixes, suffix, sector } of sectors) {
        for (const { atc: controller, airport: { tracon } } of airport.arrAtcInfo) {
            const splittedCallsign = controller.callsign.split('_');

            if (
                (!suffix || controller.callsign.endsWith(suffix)) &&
                (
                    (tracon && prefixes.includes(tracon)) ||
                    // Match AIRPORT_TYPE_NAME
                    prefixes.includes(splittedCallsign.slice(0, 2).join('_')) ||
                    // Match AIRPORT_NAME
                    (splittedCallsign.length === 2 && prefixes.includes(splittedCallsign[0])) ||
                    // Match AIRPORT_TYPERANDOMSTRING_NAME
                    (splittedCallsign.length === 3 && prefixes.some(x => x.split('_').length === 2 && controller.callsign.startsWith(x)))
                )
            ) {
                addToAirportSector(sector, airport, controller);
            }
        }
    }

    // Non-strict check
    for (const { airport, prefixes, suffix, sector } of sectors) {
        // Only non found
        for (const controller of airport.arrAtc.filter(x => !airport.features.some(y => y.controllers.some(y => y.cid === x.cid)))) {
            if (prefixes.some(x => controller.callsign.startsWith(x)) && (!suffix || controller.callsign.endsWith(suffix))) {
                addToAirportSector(sector, airport, controller);
            }
        }
    }

    // For non found
    for (const { airport, sector } of sectors) {
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

    const list = airports.filter(x => x.localAtc.length || x.arrAtc.length || x.aircraftCids.length);
    // eslint-disable-next-line vue/no-side-effects-in-computed-properties
    dataStore.vatsim.parsedAirports.value = list;

    return list;
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
    if (settingAirports) return;
    settingAirports = true;

    try {
        const extent = mapStore.extent.slice();
        extent[0] -= 100000;
        extent[1] -= 100000;
        extent[2] += 100000;
        extent[3] += 100000;

        // @ts-expect-error Dynamic return value
        airportsList.value = vatAirportsList.value.map(x => {
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

                const feature = geoJson.readFeature(simawareFeature) as Feature<any>;

                return {
                    vatspyAirport: airport,
                    vatsimAirport: x,
                    visible: intersects(extent, feature.getGeometry()!.getExtent()),
                };
            }

            const coordinates = 'lon' in airport ? [airport.lon, airport.lat] : [];

            return {
                vatspyAirport: airport,
                vatsimAirport: x,
                visible: isPointInExtent(coordinates, extent),
            };
        }).filter(x => !!x) ?? [];

        visibleAirports.value = airportsList.value.filter(x => x.visible);

        if ((map.value!.getView().getZoom() ?? 0) > 13) {
            const navigraphAirports = visibleAirports.value.filter(x => !x.vatsimAirport.isPseudo);

            if (!navigraphAirports.every(x => originalAirportsData.value.some(y => y.airport === x.vatsimAirport.icao))) {
                originalAirportsData.value = [
                    ...originalAirportsData.value,
                    ...(await Promise.all(
                        navigraphAirports.filter(x => !originalAirportsData
                            .value
                            .some(y => y.airport === x.vatsimAirport.icao))
                            .map(x => $fetch<NavigraphAirportData>(`/api/data/navigraph/airport/${ x.vatsimAirport.icao }?v=${ store.version }&layout=${ (store.user?.hasCharts && store.user?.hasFms && !store.mapSettings.navigraphLayers?.disable) ? '1' : '0' }&originalData=${ store.mapSettings.navigraphLayers?.gatesFallback ? '1' : '0' }`)),
                    )).flatMap(x => x ?? []),
                ];
            }

            airportsData.value = originalAirportsData.value.map(data => {
                const gatesWithPixel = isHideMapObject('gates')
                    ? []
                    : data.gates.map(x => ({
                        ...x,
                        pixel: map.value!.getPixelFromCoordinate([x.gate_longitude, x.gate_latitude]),
                    }));

                return {
                    airport: data.airport,
                    gates: gatesWithPixel.filter((x, xIndex) => !gatesWithPixel.some((y, yIndex) => yIndex < xIndex && (Math.abs(y.pixel?.[0] - x.pixel?.[0]) < 15 && Math.abs(y.pixel?.[1] - x.pixel?.[1]) < 15))),
                    runways: data.runways,
                    layout: data.layout,
                };
            }).filter(x => visibleAirports.value.find(y => y.vatsimAirport.icao === x.airport));
        }
    }
    finally {
        settingAirports = false;
    }
}
</script>
