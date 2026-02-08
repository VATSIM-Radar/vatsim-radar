<template>
    <div/>
</template>

<script setup lang="ts">
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { FEATURES_Z_INDEX } from '~/composables/render';
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import { useMapStore } from '~/store/map';
import { useStore } from '~/store';
import { isVatGlassesActive } from '~/utils/data/vatglasses';

let vectorLayer: VectorLayer<any>;
let vectorSource: VectorSource;
const map = inject<ShallowRef<Map | null>>('map')!;
const dataStore = useDataStore();
const mapStore = useMapStore();
const store = useStore();
const sectorsList = ref([]);

const vatGlassesActive = isVatGlassesActive;
const vatGlassesCombinedActive = computed(() => store.mapSettings.vatglasses?.combined);

const facilities = useFacilitiesIds();

const bookingsData = computed(() => (((store.mapSettings.visibility?.bookings ?? true) && !store.config.hideBookings) || store.bookingOverride) ? store.bookings.filter(x => x.atc.facility === facilities.CTR) : []);

onMounted(() => {
    if (!map.value) throw new Error('Map is not initialized');

    vectorSource = new VectorSource<any>({
        features: [],
        wrapX: false,
    });

    vectorLayer = new VectorLayer<any>({
        source: vectorSource,
        zIndex: FEATURES_Z_INDEX.AIRPORTS,
        properties: {
            type: 'airports',
        },
        declutter: 'airports',
    });

    map.value.addLayer(vectorLayer);

    const mapSettings = computed(() => store.mapSettings);
    const mapRender = computed(() => mapStore.renderedAirports.length === 0);

    watch([sectorsList, mapSettings, mapRender], async () => {

    });
});

onBeforeUnmount(() => {
    vectorLayer?.dispose();

    vectorSource?.clear();

    map.value?.removeLayer(vectorLayer);
});
</script>

<style scoped lang="scss">
div {

}
</style>
