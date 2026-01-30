<template>
    <slot/>
</template>

<script setup lang="ts">
import { injectMap } from '~/composables/map';
import type { NavigraphAirportData } from '~/types/data/navigraph';
import VectorLayer from 'ol/layer/Vector';
import VectorImageLayer from 'ol/layer/VectorImage';
import VectorSource from 'ol/source/Vector';
import { FEATURES_Z_INDEX } from '~/composables/render';

if (!getCurrentScope()) throw new Error('Airports list should only be initiated in runtime');

const store = useStore();
const dataStore = useDataStore();
const mapStore = useMapStore();
const map = injectMap();
const navigraphData = shallowRef<Record<string, NavigraphAirportData>>({});

let airportsLayer: VectorLayer<any>;
let airportsSource: VectorSource;

let traconsLayer: VectorLayer<any>;
let traconsSource: VectorSource;

let labelsLayer: VectorLayer<any>;
let labelsSource: VectorSource;

let navigraphLayer: VectorLayer<any>;
let navigraphSource: VectorSource;

let gatesLayer: VectorLayer<any>;
let gatesSource: VectorSource;

const now = new Date();
const end = ref(new Date());
const mapSettings = computed(() => store.mapSettings);

watch(mapSettings, val => {
    const currentDate = new Date();
    currentDate.setTime(now.getTime() + ((((val.bookingHours ?? 0.5) * 60) * 60) * 1000));
    end.value = currentDate;
}, {
    immediate: true,
});

const getShownAirports = computed(() => {
    // TODO
    /* let list = getAirportsList.value.filter(x => visibleAirports.value.some(y => y.vatspyAirport.icao === x.airport.icao || x.bookings.length > 0));

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

  return list;*/
});

function setVisibleAirports() {

}

watch(() => String(store.mapSettings.navigraphLayers?.disable) + String(store.mapSettings.navigraphLayers?.gatesFallback), () => {
    navigraphData.value = {};

    setVisibleAirports();
});

onMounted(() => {
    if (!map.value) throw new Error('Map is not initialized');

    airportsSource = new VectorSource<any>({
        features: [],
        wrapX: false,
    });

    traconsSource = new VectorSource<any>({
        features: [],
        wrapX: false,
    });

    labelsSource = new VectorSource<any>({
        features: [],
        wrapX: false,
    });

    navigraphSource = new VectorSource<any>({
        features: [],
        wrapX: false,
    });

    gatesSource = new VectorSource<any>({
        features: [],
        wrapX: false,
    });

    airportsLayer = new VectorLayer<any>({
        source: airportsSource,
        zIndex: FEATURES_Z_INDEX.AIRPORTS,
        properties: {
            type: 'airports',
        },
    });

    traconsLayer = new VectorLayer<any>({
        source: traconsSource,
        zIndex: FEATURES_Z_INDEX.AIRPORTS_TRACONS,
        properties: {
            type: 'airports-tracons',
        },
    });

    labelsLayer = new VectorLayer<any>({
        source: labelsSource,
        zIndex: FEATURES_Z_INDEX.AIRPORTS_LABELS,
        properties: {
            type: 'airports-labels',
        },
    });

    navigraphLayer = new VectorLayer<any>({
        source: navigraphSource,
        zIndex: FEATURES_Z_INDEX.AIRPORTS_NAVIGRAPH,
        properties: {
            type: 'airports-navigraph',
        },
    });

    gatesLayer = new VectorLayer<any>({
        source: gatesSource,
        zIndex: FEATURES_Z_INDEX.AIRPORTS_GATES,
        properties: {
            type: 'airports-gates',
        },
    });

    map.value.addLayer(airportsLayer);
    map.value.addLayer(traconsLayer);
    map.value.addLayer(labelsLayer);
    map.value.addLayer(navigraphLayer);
    map.value.addLayer(gatesLayer);
});

// TODO can be useful for BARS v2
/* watch(dataStore.vatsim.data.bars, val => {
  if (!Object.keys(val).length) return;
  airportLayerSource.value?.dispatchEvent('change');
});*/

onBeforeUnmount(() => {
    airportsLayer?.dispose();
    traconsLayer?.dispose();
    labelsLayer?.dispose();
    navigraphLayer?.dispose();
    gatesLayer?.dispose();

    map.value?.removeLayer(airportsLayer);
    map.value?.removeLayer(traconsLayer);
    map.value?.removeLayer(labelsLayer);
    map.value?.removeLayer(navigraphLayer);
    map.value?.removeLayer(gatesLayer);
});
</script>

<style scoped lang="scss">
.airport {

}
</style>
