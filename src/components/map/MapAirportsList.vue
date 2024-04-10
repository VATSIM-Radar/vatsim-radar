<template>
    <map-airport
        v-for="{airport, aircrafts} in getAirportsList.filter(x => visibleAirports.includes(x.airport.icao))"
        :key="airport.icao"
        :airport="airport"
        :aircrafts="aircrafts"
        :is-visible="visibleAirports.length < 100 && visibleAirports.includes(airport.icao)"
    />
</template>

<script setup lang="ts">
import { useDataStore } from '~/store/data';
import VectorSource from 'ol/source/Vector';
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import { isPointInExtent } from '~/composables';
import { useStore } from '~/store';

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
    val.on('moveend', setVisibleAirports);
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    if (vectorLayer) map.value?.removeLayer(vectorLayer);
    map.value?.un('moveend', setVisibleAirports);
});

const getAirportsList = computed(() => {
    return dataStore.vatsim.data?.airports.map(x => ({
        aircrafts: x.aircrafts,
        airport: dataStore.vatspy!.data.airports.find(y => y.icao === x.icao)!,
    })).filter(x => x.airport) ?? [];
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

watch(() => dataStore.vatsim.data?.general.update_timestamp, () => {
    setVisibleAirports();
}, {
    immediate: true,
});
</script>
