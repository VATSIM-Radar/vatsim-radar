<template>
    <map-sector
        v-for="(sector, index) in firs"
        :key="sector.fir.feature.id as string + index"
        :atc="sector.atc"
        :fir="sector.fir"
    />
</template>

<script setup lang="ts">
import VectorSource from 'ol/source/Vector';
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import { Fill, Stroke, Style } from 'ol/style';
import MapSector from '~/components/map/sectors/MapSector.vue';
import { useStore } from '~/store';

let vectorLayer: VectorLayer<any>;
const vectorSource = shallowRef<VectorSource | null>(null);
provide('vector-source', vectorSource);
const map = inject<ShallowRef<Map | null>>('map')!;
const store = useStore();
const dataStore = useDataStore();

const firs = computed(() => {
    const list = dataStore.vatspy.value!.data.firs;
    const firs = list.map(fir => ({
        fir,
        atc: dataStore.vatsim.data.firs.value.filter(x => x.firs.some(x => x.boundaryId === fir.feature.id && (fir.icao === x.icao || (fir.callsign && fir.callsign === x.callsign)))) ?? [],
    }));

    return firs.filter((x, xIndex) => !firs.some((y, yIndex) => y.fir.icao === x.fir.icao && x.fir.feature.id === y.fir.feature.id && yIndex < xIndex));
});

watch(map, val => {
    if (!val) return;

    let hasLayer = false;
    val.getLayers().forEach(layer => {
        if (hasLayer) return;
        hasLayer = layer.getProperties().type === 'sectors';
    });
    if (hasLayer) return;

    if (!vectorLayer) {
        vectorSource.value = new VectorSource<any>({
            features: [],
            wrapX: false,
        });

        const defaultStyle = new Style({
            stroke: new Stroke({
                color: getCurrentThemeHexColor('mapSectorBorder'),
                width: 1,
            }),
            zIndex: 1,
        });

        const localStyle = new Style({
            fill: new Fill({
                color: `rgb(${ getCurrentThemeRgbColor('success500').join(',') }, 0.07)`,
            }),
            stroke: new Stroke({
                color: `rgb(${ getCurrentThemeRgbColor('success500').join(',') }, 0.5)`,
                width: 1,
            }),
            zIndex: 3,
        });

        const rootStyle = new Style({
            fill: new Fill({
                color: `rgb(${ getCurrentThemeRgbColor('info400').join(',') }, 0.07)`,
            }),
            stroke: new Stroke({
                color: `rgb(${ getCurrentThemeRgbColor('info400').join(',') }, 0.5)`,
                width: 1,
            }),
            zIndex: 2,
        });

        const hoveredStyle = new Style({
            fill: new Fill({
                color: `rgb(${ getCurrentThemeRgbColor('success300').join(',') }, 0.2)`,
            }),
            stroke: new Stroke({
                color: `rgb(${ getCurrentThemeRgbColor('success300').join(',') }, 0.6)`,
                width: 1,
            }),
            zIndex: 4,
        });

        const hoveredRootStyle = new Style({
            fill: new Fill({
                color: `rgb(${ getCurrentThemeRgbColor('info600').join(',') }, 0.2)`,
            }),
            stroke: new Stroke({
                color: `rgb(${ getCurrentThemeRgbColor('info600').join(',') }, 0.6)`,
                width: 1,
            }),
            zIndex: 4,
        });

        vectorLayer = new VectorLayer<any>({
            source: vectorSource.value,
            zIndex: 1,
            properties: {
                type: 'sectors',
            },
            style: function(feature) {
                if (feature.getGeometry()?.getType() !== 'MultiPolygon') return;

                const type = feature.getProperties().type;

                switch (type) {
                    case 'default':
                        return defaultStyle;
                    case 'local':
                        return localStyle;
                    case 'root':
                        return rootStyle;
                    case 'hovered':
                        return hoveredStyle;
                    case 'hovered-root':
                        return hoveredRootStyle;
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
