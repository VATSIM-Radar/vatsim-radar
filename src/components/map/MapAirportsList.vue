<template>
    <map-airport
        v-for="{airport, aircrafts, localAtc, arrAtc} in getAirportsList.filter(x => visibleAirports.includes(x.airport.icao))"
        :key="airport.icao"
        :airport="airport"
        :aircrafts="aircrafts"
        :is-visible="visibleAirports.length < 100 && visibleAirports.includes(airport.icao)"
        :local-atc="localAtc"
        :arr-atc="arrAtc"
    />
</template>

<script setup lang="ts">
import { useDataStore } from '~/store/data';
import VectorSource from 'ol/source/Vector';
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import { attachMoveEnd, isPointInExtent } from '~/composables';
import { useStore } from '~/store';
import type { MapAircraft  } from '~/types/map';

import type { VatsimShortenedAircraft, VatsimShortenedController, VatsimShortenedPrefile } from '~/types/data/vatsim';

let vectorLayer: VectorLayer<any>;
const vectorSource = shallowRef<VectorSource | null>(null);
provide('vector-source', vectorSource);
const map = inject<ShallowRef<Map | null>>('map')!;
const dataStore = useDataStore();
const visibleAirports = shallowRef<string[]>([]);

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
            zIndex: 2,
            properties: {
                type: 'airports',
            },
        });
    }

    val.addLayer(vectorLayer);
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    if (vectorLayer) map.value?.removeLayer(vectorLayer);
});

const getAirportsList = computed(() => {
    const facilities = useFacilitiesIds();
    const airports = dataStore.vatsim.data?.airports.map(x => ({
        aircrafts: {} as MapAircraft,
        aircraftsList: x.aircrafts,
        aircraftsCids: Object.values(x.aircrafts).flatMap(x => x),
        airport: dataStore.vatspy!.data.airports.find(y => y.icao === x.icao)!,
        localAtc: [] as VatsimShortenedController[],
        arrAtc: [] as VatsimShortenedController[],
    })).filter(x => x.airport && x.aircraftsCids.length) ?? [];

    for (const pilot of dataStore.vatsim.data!.pilots) {
        const airport = airports.find(x => x.aircraftsCids.includes(pilot.cid));
        if (!airport) continue;

        if (airport.aircraftsList.departures?.includes(pilot.cid) && !airport.aircrafts.departures) airport.aircrafts.departures = true;
        if (airport.aircraftsList.arrivals?.includes(pilot.cid) && !airport.aircrafts.arrivals) airport.aircrafts.arrivals = true;

        if (airport.aircraftsList.groundArr?.includes(pilot.cid)) {
            if (!airport.aircrafts.groundArr) airport.aircrafts.groundArr = [pilot];
            else (airport.aircrafts.groundArr as VatsimShortenedAircraft[]).push(pilot);
        }

        if (airport.aircraftsList.groundDep?.includes(pilot.cid)) {
            if (!airport.aircrafts.groundDep) airport.aircrafts.groundDep = [pilot];
            else (airport.aircrafts.groundDep as VatsimShortenedAircraft[]).push(pilot);
        }
    }

    for (const pilot of dataStore.vatsim.data!.prefiles) {
        const airport = airports.find(x => x.aircraftsCids.includes(pilot.cid));
        if (!airport) continue;

        if (airport.aircraftsList.prefiles?.includes(pilot.cid)) {
            if (!airport.aircrafts.prefiles) airport.aircrafts.prefiles = [pilot];
            else (airport.aircrafts.prefiles as VatsimShortenedPrefile[]).push(pilot);
        }
    }

    for (const atc of dataStore.vatsim.data!.locals) {
        const airport = airports.find(x => (x.airport.iata && x.airport.iata === atc.airport.iata) || x.airport.icao === atc.airport.icao);
        if (!airport) continue;

        const isArr = !atc.isATIS && atc.atc.facility === facilities.APP;
        if (isArr) {
            airport.arrAtc.push(atc.atc);
            continue;
        }

        const isLocal = atc.isATIS || atc.atc.facility === facilities.DEL || atc.atc.facility === facilities.TWR || atc.atc.facility === facilities.GND;
        if (isLocal) airport.localAtc.push(atc.atc);
    }

    return airports;
});

function setVisibleAirports() {
    const extent = useStore().extent.slice();
    extent[0] -= 5000;
    extent[1] -= 5000;
    extent[2] += 5000;
    extent[3] += 5000;

    const airports = getAirportsList.value.filter((x) => {
        const coordinates = [x.airport.lon, x.airport.lat];

        return isPointInExtent(coordinates, extent);
    }) ?? [];

    visibleAirports.value = airports.map(x => x.airport.icao);
}

attachMoveEnd(setVisibleAirports);

const timestamp = computed(() => dataStore.vatsim.data?.general.update_timestamp);

watch(timestamp, () => {
    setVisibleAirports();
}, {
    immediate: true,
});
</script>
