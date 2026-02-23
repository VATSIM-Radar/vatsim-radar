<template>
    <div/>
</template>

<script setup lang="ts">
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { FEATURES_Z_INDEX } from '~/composables/render';
import type { EffectScope, ShallowRef } from 'vue';
import type { Map } from 'ol';
import { useMapStore } from '~/store/map';
import { useStore } from '~/store';
import { initVatglasses, isVatGlassesActive } from '~/utils/data/vatglasses';
import type { VatsimBooking } from '~/types/data/vatsim';
import type { VatSpyData, VatSpyDataFeature } from '~/types/data/vatspy';
import { makeFakeAtcFeatureFromBooking } from '~/utils';
import { setMapSectors } from '~/composables/render/sectors';
import { debounce } from '~/utils/shared';

let vectorLayer: VectorLayer<any>;
let vectorSource: VectorSource;

let labelsLayer: VectorLayer<any>;
let labelsSource: VectorSource;

const map = inject<ShallowRef<Map | null>>('map')!;
const dataStore = useDataStore();
const mapStore = useMapStore();
const store = useStore();

const facilities = useFacilitiesIds();

const bookingsData = computed(() => (((store.mapSettings.visibility?.bookings ?? true) && !store.config.hideBookings) || store.bookingOverride) ? store.bookings.filter(x => x.atc.facility === facilities.CTR) : []);

const hideOnZoom = computed(() => {
    return mapStore.zoom > 13;
});

const hideAtc = computed(() => isHideAtcType('firs'));

export interface MapFir {
    booking?: VatsimBooking;
    fir: VatSpyData['firs'][number];
    atc: VatSpyDataFeature[];
}

const firs = computed(() => {
    const allFirs: MapFir[] = [];

    if (!store.bookingOverride) {
        const list = dataStore.vatspy.value!.data.firs;
        const firs: MapFir[] = list.map(fir => ({
            fir,
            atc: dataStore.vatsim.data.firs.value.filter(x => x.firs.some(x => x.boundaryId === fir.feature.id && (fir.icao === x.icao || (fir.callsign && fir.callsign === x.callsign)))) ?? [],
        }));

        allFirs.push(...(firs.filter((x, xIndex) => !firs.some((y, yIndex) => y.fir.icao === x.fir.icao && x.fir.feature.id === y.fir.feature.id && yIndex < xIndex))));
    }

    const bookingFirs = store.bookingOverride ? dataStore.vatspy.value!.data.firs : allFirs;

    for (let i = 0; i < bookingFirs.length; i++) {
        const _fir = bookingFirs[i];

        if ('atc' in _fir && _fir.atc?.length) continue;

        const fir = 'fir' in _fir ? _fir.fir : _fir;

        const booking = bookingsData.value.find(
            x => (!fir.isOceanic && (x.atc.callsign === fir.callsign?.replaceAll('-', '_') + '_CTR' || x.atc.callsign === fir.icao?.replaceAll('-', '_') + '_CTR')) ||
                (fir.isOceanic && (x.atc.callsign === fir.callsign?.replaceAll('-', '_') + '_FSS' || x.atc.callsign === fir.icao?.replaceAll('-', '_') + '_FSS')),
        );

        if (booking) {
            const atc = makeFakeAtcFeatureFromBooking(booking.atc, booking);
            const item = { booking, fir, atc };
            if (store.bookingOverride) allFirs.push(item);
            else {
                allFirs.splice(i, 1, item);
            }
        }
    }

    return allFirs;
});

onMounted(async () => {
    if (!map.value) throw new Error('Map is not initialized');

    vectorSource = new VectorSource<any>({
        features: [],
        wrapX: true,
    });

    vectorLayer = new VectorLayer<any>({
        source: vectorSource,
        zIndex: FEATURES_Z_INDEX.SECTORS,
        properties: {
            type: 'sectors-list',
        },
    });

    labelsSource = new VectorSource<any>({
        features: [],
        wrapX: true,
    });

    labelsLayer = new VectorLayer<any>({
        source: labelsSource,
        zIndex: FEATURES_Z_INDEX.SECTORS_LABEL,
        declutter: 'airports',
        properties: {
            type: 'sectors-labels',
        },
    });

    map.value.addLayer(vectorLayer);
    map.value.addLayer(labelsLayer);

    const mapSettings = computed(() => store.mapSettings);
    const mapLevel = computed(() => store.localSettings.vatglassesLevel);
    let vgInit: false | EffectScope = false;

    const debouncedUpdate = debounce(async () => {
        if (hideAtc.value || hideOnZoom.value) {
            vectorSource.clear();
        }
        else {
            if (!vgInit && isVatGlassesActive.value) {
                const scope = effectScope();
                await scope.run(async () => {
                    await initVatglasses().then(() => {
                        vgInit = scope;
                    }).catch(() => {
                        scope.stop();
                    });
                });
            }
            else if (vgInit && !isVatGlassesActive.value) {
                vgInit.stop();
                vgInit = false;
            }
            setMapSectors({
                source: vectorSource,
                layer: vectorLayer,

                labelsSource,
                labelsLayer,

                firs: firs.value,
            });
        }
    }, 1000);

    watch([firs, mapSettings, dataStore.vatglassesActivePositions, mapLevel], debouncedUpdate, {
        immediate: true,
    });
});

onBeforeUnmount(() => {
    vectorLayer?.dispose();
    vectorSource?.clear();

    labelsLayer?.dispose();
    labelsSource?.clear();

    map.value?.removeLayer(vectorLayer);
    map.value?.removeLayer(labelsLayer);
});
</script>
