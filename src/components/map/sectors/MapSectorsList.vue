<template>
    <template v-if="!isHideAtcType('firs')">
        <map-sector
            v-for="(sector, index) in firs"
            :key="sector.fir.feature.id as string + index"
            :atc="sector.atc"
            :fir="sector.fir"
        />
    </template>
</template>

<script setup lang="ts">
import VectorSource from 'ol/source/Vector';
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import { Fill, Stroke, Style } from 'ol/style';
import MapSector from '~/components/map/sectors/MapSector.vue';
import VectorImageLayer from 'ol/layer/VectorImage';

let vectorLayer: VectorImageLayer<any>;
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

        const firColor = getSelectedColorFromSettings('firs');
        const uirColor = getSelectedColorFromSettings('uirs');

        const firColorRaw = getSelectedColorFromSettings('firs', true);
        const uirColorRaw = getSelectedColorFromSettings('uirs', true);

        const defaultStyle = new Style({
            stroke: new Stroke({
                color: `rgb(${ getCurrentThemeRgbColor('mapSectorBorder').join(',') }, 0.5)`,
                width: 1,
            }),
            zIndex: 2,
        });

        const localStyle = new Style({
            fill: new Fill({
                color: firColor || `rgba(${ getCurrentThemeRgbColor('success500').join(',') }, 0.07)`,
            }),
            stroke: new Stroke({
                color: `rgba(${ firColorRaw || getCurrentThemeRgbColor('success500').join(',') }, 0.5)`,
                width: 1,
            }),
            zIndex: 4,
        });

        const rootStyle = new Style({
            fill: new Fill({
                color: uirColor || `rgba(${ getCurrentThemeRgbColor('info400').join(',') }, 0.07)`,
            }),
            stroke: new Stroke({
                color: `rgba(${ uirColorRaw || getCurrentThemeRgbColor('info400').join(',') }, 0.5)`,
                width: 1,
            }),
            zIndex: 3,
        });

        const hoveredStyle = new Style({
            fill: new Fill({
                color: `rgba(${ firColorRaw || getCurrentThemeRgbColor('success300').join(',') }, 0.2)`,
            }),
            stroke: new Stroke({
                color: `rgba(${ firColorRaw || getCurrentThemeRgbColor('success300').join(',') }, 0.6)`,
                width: 1,
            }),
            zIndex: 5,
        });

        const hoveredRootStyle = new Style({
            fill: new Fill({
                color: `rgba(${ uirColorRaw || getCurrentThemeRgbColor('info600').join(',') }, 0.2)`,
            }),
            stroke: new Stroke({
                color: `rgba(${ uirColorRaw || getCurrentThemeRgbColor('info600').join(',') }, 0.6)`,
                width: 1,
            }),
            zIndex: 5,
        });

        vectorLayer = new VectorImageLayer<any>({
            source: vectorSource.value,
            zIndex: 2,
            imageRatio: 2,
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
