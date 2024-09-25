<template>
    <template v-if="!isHideAtcType('firs') && store.localSettings.traffic?.vatglassesLevel === false"">
        <map-sector
            v-for="(sector, index) in firs"
            :key="sector.fir.feature.id as string + index"
            :atc="sector.atc"
            :fir="sector.fir"
        />
    </template>

    <template v-if="store.localSettings.traffic?.vatglassesLevel !== false">
        <template
            v-for="(countryEntries, countryId) in dataStore.vatglassesActivePositions.value"
            :key="countryId"
        >
            <map-vatglasses-position
                v-for="(position, PositionId) in countryEntries"
                :key="countryId + '-' + PositionId"
                :position="position"
            />
        </template>


        <map-overlay
            class="vatglasses-overlay"
            :model-value="vatglassesPopupIsShown"
            :settings="{
                position: getCoordinates,
                offset: [15, -15],
            }"
            :z-index="20"
        >
            <common-popup-block
                class="aircraft-hover"
            >
                <template #title>
                    Positions
                </template>
                <ul>
                    <li
                        v-for="(sector, index) in sectorsAtClick"
                        :key="index"
                    >
                        {{ sector.vatglassesPositionId }} ({{ dataStore.vatglassesActivePositions.value[sector.countryGroupId][sector.vatglassesPositionId].callsign }}) FL{{ sector.altrangeMin ?? sector.min }} - FL{{ sector.altrangeMax ?? sector.max }}
                    </li>
                </ul>

            </common-popup-block>
        </map-overlay>
    </template>
</template>

<script setup lang="ts">
import VectorSource from 'ol/source/Vector';
import type { ShallowRef } from 'vue';
import type { Map, MapBrowserEvent } from 'ol';
import { Fill, Stroke, Style } from 'ol/style';
import MapVatglassesPosition from '~/components/map/sectors/MapVatglassesPosition.vue';
import VectorImageLayer from 'ol/layer/VectorImage';
import { useStore } from '~/store';
import MapSector from '~/components/map/sectors/MapSector.vue';

import { updateVatglassesState } from '~/utils/data/vatglasses';

import type { Pixel } from 'ol/pixel';


let vectorLayer: VectorImageLayer<any>;
const vectorSource = shallowRef<VectorSource | null>(null);
provide('vector-source', vectorSource);
const map = inject<ShallowRef<Map | null>>('map')!;
const dataStore = useDataStore();
const store = useStore();


const firs = computed(() => {
    const list = dataStore.vatspy.value!.data.firs;
    const firs = list.map(fir => ({
        fir,
        atc: dataStore.vatsim.data.firs.value.filter(x => x.firs.some(x => x.boundaryId === fir.feature.id && (fir.icao === x.icao || (fir.callsign && fir.callsign === x.callsign)))) ?? [],
    }));
    return firs.filter((x, xIndex) => !firs.some((y, yIndex) => y.fir.icao === x.fir.icao && x.fir.feature.id === y.fir.feature.id && yIndex < xIndex));
});


interface FeatureProperties {
    [key: string]: any;
}
const sectorsAtClick = ref<FeatureProperties>([]);
const getCoordinates = ref([0, 0]);
const vatglassesPopupIsShown = ref(false);

let lastEventPixel: Pixel | null = null;
async function handleClick(e: MapBrowserEvent<any>) {
    const eventPixel = map.value!.getPixelFromCoordinate(e.coordinate);

    if (lastEventPixel && lastEventPixel[0] === eventPixel[0] && lastEventPixel[1] === eventPixel[1]) {
        // same location, close popup
        sectorsAtClick.value = [];
        vatglassesPopupIsShown.value = false;
        lastEventPixel = null;
        return;
    }
    lastEventPixel = eventPixel;
    const featureSectors = map.value!.getFeaturesAtPixel(eventPixel, {
        hitTolerance: 0, // we use 6 instead of 5 because of the aircraft icons size, it is just for cosmetic reasons
        layerFilter: layer => layer.getProperties().type === 'sectors',
    });


    console.log('clicksectors', featureSectors);
    const sectors: FeatureProperties = [];
    featureSectors.map(feature => {
        const properties = feature.getProperties() as FeatureProperties;
        sectors.push(properties);
        console.log(properties);
    });

    sectorsAtClick.value = sectors;

    getCoordinates.value = e.coordinate;
    vatglassesPopupIsShown.value = sectorsAtClick.value.length ? true : false;
}


function hexToRgb(hex: string): string {
    // Remove the hash at the start if it's there
    hex = hex.replace(/^#/, '');

    // Parse the r, g, b values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Return the RGB color
    return `${ r }, ${ g }, ${ b }`;
}

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

        const vatglassesStyle = (color: string, altMax: number = 1): Style => {
            return new Style({

                fill: new Fill({
                    color: `rgb(${ hexToRgb(color) }, 0.2)`,
                }),
                stroke: new Stroke({
                    color: `rgb(${ hexToRgb(color) }, 0.2)`,
                    width: 1,
                }),
                zIndex: altMax,
            });
        };

        vectorLayer = new VectorImageLayer<any>({
            source: vectorSource.value,
            zIndex: 2,
            properties: {
                type: 'sectors',
            },
            style: function(feature) {
                // if (feature.getGeometry()?.getType() !== 'MultiPolygon') return;

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
                    case 'vatglasses':
                        return vatglassesStyle(feature.getProperties().colour, feature.getProperties().max);
                    default:
                        return localStyle;
                }
            },
        });
    }

    val.addLayer(vectorLayer);
    updateVatglassesState();
    val.on('click', handleClick);
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    if (vectorLayer) map.value?.removeLayer(vectorLayer);
});
</script>
