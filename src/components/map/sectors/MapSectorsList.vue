<template>
    <template v-if="!isHideAtcType('firs')">
        <map-sector
            v-for="(sector, index) in firs"
            :key="sector.fir.feature.id as string + index"
            :atc="sector.atc"
            :fir="sector.fir"
        />
    </template>

    <template v-if="!isHideAtcType('firs') && vatGlassesActive">
        <template
            v-for="(countryEntries, countryId) in dataStore.vatglassesActivePositions.value"
            :key="countryId"
        >
            <map-vatglasses-position
                v-for="(position, positionId) in countryEntries"
                :key="countryId + '-' + positionId"
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
                class="atc-popup"
            >
                <template #title>
                    Positions
                </template>
                <div
                    v-for="(sector, index) in sectorsAtClick"
                    :key="index"
                >
                    <div
                        class="atc-popup_list"
                        @mouseleave="vatglassesPopupIsShown = false"
                    >
                        <template v-if="vatGlassesCombinedActive">
                            <template v-if="index === 0 || sector.max !== sectorsAtClick[index - 1].min">
                                <span class="atc-popup_level">{{ getPositionLevel(sector.max) }}</span>
                            </template>

                            <common-single-controller-info
                                :controller="sector.atc"
                            />
                            <template v-if="sector.min === 0">
                                <span class="atc-popup_level">GND</span>
                            </template>
                            <template v-else>
                                <span class="atc-popup_level">{{ getPositionLevel(sector.min) }}</span>
                            </template>
                        </template>
                        <template v-else>
                            <common-single-controller-info
                                :controller="sector.atc"
                                show-atis
                                small
                            />
                        </template>
                    </div>
                </div>
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
import { attachMoveEnd, collapsingWithOverlay } from '~/composables';

import { initVatglasses, isVatGlassesActive } from '~/utils/data/vatglasses';
import type { VatglassesSectorProperties } from '~/utils/data/vatglasses';

import type { Pixel } from 'ol/pixel';
import CommonSingleControllerInfo from '~/components/common/vatsim/CommonSingleControllerInfo.vue';

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


const sectorsAtClick = shallowRef<VatglassesSectorProperties[]>([]);
const getCoordinates = ref([0, 0]);
const vatglassesPopupIsShown = ref(false);
const vatGlassesActive = isVatGlassesActive();
const vatGlassesCombinedActive = computed(() => store.mapSettings.vatglasses?.combined);

function getPositionLevel(_level: number) {
    const level = _level.toString().padStart(3, '0');
    if (level === '999') return 'UNL';
    return `FL${ level }`;
}

let lastEventPixel: Pixel | null = null;
async function handleClick(e: MapBrowserEvent<any>) {
    // TODO: don't show popup when clicked target has an aircraft
    const eventPixel = map.value!.getPixelFromCoordinate(e.coordinate);

    if (collapsingWithOverlay(map, eventPixel, [])) return;

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

    const sectors: VatglassesSectorProperties[] = [];
    featureSectors.map(feature => {
        const properties = feature.getProperties() as VatglassesSectorProperties;
        sectors.push(properties);
    });

    sectorsAtClick.value = sectors.filter(x => x.atc).sort((a, b) => b.min - a.min);

    getCoordinates.value = e.coordinate;
    vatglassesPopupIsShown.value = !!sectorsAtClick.value.length;
}


attachMoveEnd(() => {
    // Change of map position
    sectorsAtClick.value = [];
    vatglassesPopupIsShown.value = false;
    lastEventPixel = null;
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

        if (store.localSettings.filters?.layers?.layer === 'basic') {
            defaultStyle.getStroke()?.setColor(`rgb(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.03)`);
        }

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
            // console.log('color',color)
            return new Style({

                fill: new Fill({
                    color: `rgb(${ hexToRgb(color) }, 0.2)`,
                }),
                stroke: new Stroke({
                    color: `rgb(${ hexToRgb(color) }, 0.6)`,
                    width: 1,
                }),
                zIndex: altMax,
            });
        };

        vectorLayer = new VectorImageLayer<any>({
            source: vectorSource.value,
            zIndex: 2,
            imageRatio: 2,
            properties: {
                type: 'sectors',
            },
            style: function(feature) {
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
                        // console.log(feature.getProperties());
                        return vatglassesStyle(feature.getProperties().colour, feature.getProperties().max);
                    default:
                        return localStyle;
                }
            },
        });
    }

    val.addLayer(vectorLayer);
    initVatglasses();
    val.on('click', handleClick);
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    if (vectorLayer) map.value?.removeLayer(vectorLayer);
});
</script>

<style scoped lang="scss">
.atc-popup {
    max-width: min(450px, 100%);

    @include mobileOnly {
        max-width: 80vw;
    }

    &_list {
        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    &_level {
        font-size: 14px;
        font-weight: 600;
    }
}
</style>
