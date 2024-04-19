<template>
    <map-airport
        v-for="{airport, aircrafts, localAtc, arrAtc} in getAirportsList.filter(x => visibleAirports.includes(x.airport.icao))"
        :key="airport.icao + airport.iata ?? 'undefined'"
        :airport="airport"
        :aircrafts="aircrafts"
        :is-visible="visibleAirports.length < 100 && visibleAirports.includes(airport.icao)"
        :local-atc="localAtc"
        :arr-atc="arrAtc"
        :is-hovered="airport.iata ? airport.iata === hoveredAirport : airport.icao === hoveredAirport"
        :gates="getAirportsGates.find(x => x.airport === airport.icao)?.gates"
        @manualHover="[isManualHover = true, hoveredAirport = airport.iata || airport.icao]"
        @manualHide="[isManualHover = false, hoveredAirport = null]"
    />
</template>

<script setup lang="ts">
import VectorSource from 'ol/source/Vector';
import type { ShallowRef } from 'vue';
import type { Map, MapBrowserEvent } from 'ol';
import { Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import { attachMoveEnd, isPointInExtent } from '~/composables';
import { useStore } from '~/store';
import type { MapAircraft } from '~/types/map';

import type { VatsimShortenedAircraft, VatsimShortenedController, VatsimShortenedPrefile } from '~/types/data/vatsim';
import type { NavigraphGate } from '~/types/data/navigraph';
import { Point } from 'ol/geom';
import { Fill, Style, Text } from 'ol/style';

let vectorLayer: VectorLayer<any>;
const vectorSource = shallowRef<VectorSource | null>(null);
provide('vector-source', vectorSource);
const map = inject<ShallowRef<Map | null>>('map')!;
const store = useStore();
const dataStore = useDataStore();
const visibleAirports = shallowRef<string[]>([]);
const airportsGates = shallowRef<{ airport: string, gates: NavigraphGate[] }[]>([]);
const originalGates = shallowRef<NavigraphGate[]>([]);
const isManualHover = ref(false);
const hoveredAirport = ref<string | null>(null);

function handlePointerMove(e: MapBrowserEvent<any>) {
    const features = map.value!.getFeaturesAtPixel(e.pixel, {
        hitTolerance: 5,
        layerFilter: layer => layer === vectorLayer,
    });

    let isInvalid = features.length !== 1 || features[0].getProperties().type !== 'circle';

    if (!isInvalid) {
        const airport = getAirportsList.value.find(x => (features[0].getProperties().iata || x.airport.iata) ? x.airport.iata === features[0].getProperties().iata : x.airport.icao === features[0].getProperties().icao);
        const pixel = map.value!.getCoordinateFromPixel(e.pixel);
        isInvalid = pixel[1] - airport!.airport.lat < 80000;
    }

    if (isInvalid) {
        if (!isManualHover.value) {
            hoveredAirport.value = null;
        }
        if (store.mapCursorPointerTrigger === 2) store.mapCursorPointerTrigger = false;
        return;
    }

    if (isManualHover.value) return;
    isManualHover.value = false;

    hoveredAirport.value = features[0].getProperties().iata || features[0].getProperties().icao;
    store.mapCursorPointerTrigger = 2;
}

watch(map, (val) => {
    if (!val) return;

    let hasLayer = false;
    val.getLayers().forEach((layer) => {
        if (hasLayer) return;
        hasLayer = layer.getProperties().type === 'airports';
    });
    if (hasLayer) return;

    if (!vectorLayer) {
        vectorSource.value = new VectorSource({
            features: [],
            wrapX: false,
        });

        vectorLayer = new VectorLayer({
            source: vectorSource.value,
            zIndex: 5,
            properties: {
                type: 'airports',
            },
        });
    }

    val.addLayer(vectorLayer);
    val.on('pointermove', handlePointerMove);
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    if (vectorLayer) map.value?.removeLayer(vectorLayer);
    map.value?.un('pointermove', handlePointerMove);
});

const getAirportsGates = computed<typeof airportsGates['value']>(() => {
    if (!airportsGates.value || store.zoom < 13) return [];

    return getAirportsList.value.map((airport) => {
        const gateAirport = airportsGates.value.find(x => x.airport === airport.airport.icao);
        if (!gateAirport) return null;

        const gates: NavigraphGate[] = gateAirport.gates;

        for (const pilot of [...airport.aircrafts.groundDep ?? [], ...airport.aircrafts.groundArr ?? []] as VatsimShortenedAircraft[]) {
            let pilotLon = pilot.longitude;
            let pilotLat = pilot.latitude;

            let lonAdjustment = 0;
            let latAdjustment = 0;
            let direction = pilot.heading;

            if (direction >= 0 && direction < 90) {
                lonAdjustment = (direction / 90) * 30;
                latAdjustment = (1 - direction / 90) * 30;
            }
            else if (direction >= 90 && direction < 180) {
                direction -= 90;
                lonAdjustment = (1 - direction / 90) * 30;
                latAdjustment = (direction / 90) * -30;
            }
            else if (direction >= 180 && direction < 270) {
                direction -= 180;
                lonAdjustment = (direction / 90) * -30;
                latAdjustment = (1 - direction / 90) * -30;
            }
            else {
                direction -= 270;
                lonAdjustment = (1 - direction / 90) * -30;
                latAdjustment = (direction / 90) * 30;
            }

            let trulyOccupied = false;
            let maybeOccupied = false;

            for (const gate of gates.filter(x => Math.abs(x.gate_longitude - pilotLon) < 25 && Math.abs(x.gate_latitude - pilotLat) < 25)) {
                const index = gates.findIndex(x => x.gate_identifier === gate.gate_identifier);
                if (index === -1) continue;
                gates[index] = {
                    ...gates[index],
                    trulyOccupied: true,
                };
                trulyOccupied = true;
            }

            pilotLon += lonAdjustment;
            pilotLat += latAdjustment;

            if (pilot.callsign === 'QAC3404') {
                console.log(pilot.heading);
                const feature = new Feature({
                    geometry: new Point([pilotLon, pilotLat]),
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

            if (!trulyOccupied) {
                for (const gate of gates.filter(x => Math.abs(x.gate_longitude - pilotLon) < 25 && Math.abs(x.gate_latitude - pilotLat) < 25)) {
                    const index = gates.findIndex(x => x.gate_identifier === gate.gate_identifier);
                    if (index === -1) continue;
                    gates[index] = {
                        ...gates[index],
                        trulyOccupied: true,
                    };
                }
            }

            for (const gate of gates.filter(x => Math.abs(x.gate_longitude - pilot.longitude) < 50 && Math.abs(x.gate_latitude - pilot.latitude) < 50)) {
                const index = gates.findIndex(x => x.gate_identifier === gate.gate_identifier);
                if (index === -1) continue;
                gates[index] = {
                    ...gates[index],
                    maybeOccupied: true,
                };
                maybeOccupied = true;
            }

            if (!maybeOccupied) {
                for (const gate of gates.filter(x => Math.abs(x.gate_longitude - pilotLon) < 50 && Math.abs(x.gate_latitude - pilotLat) < 50)) {
                    const index = gates.findIndex(x => x.gate_identifier === gate.gate_identifier);
                    if (index === -1) continue;
                    gates[index] = {
                        ...gates[index],
                        maybeOccupied: true,
                    };
                    maybeOccupied = true;
                }
            }
        }

        return {
            airport: gateAirport.airport,
            gates,
        };
    }).filter(x => !!x) as typeof airportsGates['value'];
});

const getAirportsList = computed(() => {
    const facilities = useFacilitiesIds();
    const airports = dataStore.vatsim.data.airports.value.map(x => ({
        aircrafts: {} as MapAircraft,
        aircraftsList: x.aircrafts,
        aircraftsCids: Object.values(x.aircrafts).flatMap(x => x),
        airport: dataStore.vatspy.value!.data.airports.find(y => y.iata ? y.iata === x.iata : y.icao === x.icao)!,
        localAtc: [] as VatsimShortenedController[],
        arrAtc: [] as VatsimShortenedController[],
    }));

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

    return airports;
});

async function setVisibleAirports() {
    const extent = useStore().extent.slice();
    extent[0] -= 100000;
    extent[1] -= 100000;
    extent[2] += 100000;
    extent[3] += 100000;

    const airports = getAirportsList.value.filter((x) => {
        const coordinates = [x.airport.lon, x.airport.lat];

        return isPointInExtent(coordinates, extent);
    }) ?? [];

    visibleAirports.value = airports.map(x => x.airport.icao);

    if ((map.value!.getView().getZoom() ?? 0) > 13) {
        if (!visibleAirports.value.every(x => airportsGates.value.some(y => y.airport === x))) {
            originalGates.value = (await Promise.all(visibleAirports.value.map(x => $fetch(`/data/navigraph/gates/${ x }`)))).flatMap(x => x ?? []);
        }

        airportsGates.value = await Promise.all(visibleAirports.value.map((airport) => {
            const gatesWithPixel = originalGates.value.filter(x => x.airport_identifier === airport).map(x => ({
                ...x,
                pixel: map.value!.getPixelFromCoordinate([x.gate_longitude, x.gate_latitude]),
            }));

            return {
                airport,
                gates: gatesWithPixel.filter((x, xIndex) => !gatesWithPixel.some((y, yIndex) => yIndex < xIndex && (Math.abs(y.pixel[0] - x.pixel[0]) < 15 && Math.abs(y.pixel[1] - x.pixel[1]) < 15))),
            };
        }));
    }
}

attachMoveEnd(setVisibleAirports);

watch(dataStore.vatsim.updateTimestamp, () => {
    setVisibleAirports();
}, {
    immediate: true,
});
</script>
