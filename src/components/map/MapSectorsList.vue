<template>
    <map-sector
        v-for="(sector, index) in firs"
        :key="sector.fir.feature.id as string + index"
        :fir="sector.fir"
        :atc="sector.atc"
    />
</template>

<script setup lang="ts">
import VectorSource from 'ol/source/Vector';
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import { Fill, Stroke, Style } from 'ol/style';

let vectorLayer: VectorLayer<any>;
const vectorSource = shallowRef<VectorSource | null>(null);
provide('vector-source', vectorSource);
const map = inject<ShallowRef<Map | null>>('map')!;
const dataStore = useDataStore();

const firs = computed(() => {
    const list = dataStore.vatspy.value!.data.firs;
    const firs = list.map(fir => ({
        fir,
        atc: dataStore.vatsim.data.firs.value.filter(x => x.firs.some(x => x.boundaryId === fir.feature.id && (fir.icao === x.icao || (fir.callsign && fir.callsign === x.callsign)))) ?? [],
    }));

    return firs.filter((x, xIndex) => !firs.some((y, yIndex) => y.fir.icao === x.fir.icao && yIndex < xIndex));
});

watch(map, (val) => {
    if (!val) return;

    let hasLayer = false;
    val.getLayers().forEach((layer) => {
        if (hasLayer) return;
        hasLayer = layer.getProperties().type === 'sectors';
    });
    if (hasLayer) return;

    if (!vectorLayer) {
        vectorSource.value = new VectorSource({
            features: [],
            wrapX: false,
        });

        vectorLayer = new VectorLayer({
            source: vectorSource.value,
            zIndex: 1,
            properties: {
                type: 'sectors',
            },
            style: function (feature) {
                if (feature.getGeometry()?.getType() !== 'MultiPolygon') return;

                const type = feature.getProperties().type;

                if (type === 'default') {
                    return new Style({
                        stroke: new Stroke({
                            color: '#2d2d30',
                            width: 1,
                        }),
                        zIndex: 1,
                    });
                }
                else if (type === 'local') {
                    return new Style({
                        fill: new Fill({
                            color: 'rgba(89, 135, 255, 0.07)',
                        }),
                        stroke: new Stroke({
                            color: '#3B6CEC',
                            width: 1,
                        }),
                        zIndex: 3,
                    });
                }
                else if (type === 'root') {
                    return new Style({
                        fill: new Fill({
                            color: 'rgba(230, 230, 235, 0.05)',
                        }),
                        stroke: new Stroke({
                            color: '#272878',
                            width: 1,
                        }),
                        zIndex: 2,
                    });
                }
                else if (type === 'hovered') {
                    return new Style({
                        fill: new Fill({
                            color: 'rgba(89, 135, 255, 0.3)',
                        }),
                        stroke: new Stroke({
                            color: '#3B6CEC',
                            width: 1,
                        }),
                        zIndex: 4,
                    });
                }
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
</script>
