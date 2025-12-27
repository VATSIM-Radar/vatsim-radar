<template>
    <div class="distance">
        <map-overlay
            v-if="tooltip"
            model-value
            persistent
            :settings="{ position: tooltip, positioning: 'center-center' }"
        >
            <div
                class="distance_tooltip"
                :style="{ transform: `rotate(${ tooltipRotation }deg)` }"
            >
                {{ distanceDisplay }}
            </div>
        </map-overlay>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ShallowRef } from 'vue';
import type { Map, MapBrowserEvent } from 'ol';
import { Feature } from 'ol';
import type { FeatureLike } from 'ol/Feature';
import { useMapStore } from '~/store/map';
import { Draw } from 'ol/interaction';
import { Fill, Stroke, Style, Text } from 'ol/style';
import type { Coordinate } from 'ol/coordinate';
import VectorSource from 'ol/source/Vector';
import type { EventsKey } from 'ol/events';
import { getLength } from 'ol/sphere';
import type { Geometry } from 'ol/geom';
import { LineString, Point } from 'ol/geom';
import { unByKey } from 'ol/Observable';
import VectorLayer from 'ol/layer/Vector';
import { useStore } from '~/store';
import {
    calculateHeadingPair,
    buildHeadingStyles,
    getMidpointOrientation,
    toGeodesicLine,
    createGeodesicGeometry,
} from '~/utils/map/distance';
import type { HeadingPair } from '~/utils/map/distance';

const map = inject<ShallowRef<Map | null>>('map')!;
const mapStore = useMapStore();
const dataStore = useDataStore();
const store = useStore();

let drawing: Draw | null = null;

const tooltip = ref<Coordinate | null>(null);
const tooltipRotation = ref(0);
const source = new VectorSource();
const distanceSource = new VectorSource();
let layer: VectorLayer | undefined;
const sketch = shallowRef<null | Feature>(null);
const currentResult = ref<string | null>(null);
const features = shallowRef<Feature[]>([]);
const fromHeading = ref<string>('---');
const toHeading = ref<string>('---');

const distanceDisplay = computed(() => {
    const distance = currentResult.value ?? '';
    return `${ distance }`;
});

const lineStyle = new Style({
    stroke: new Stroke({
        color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.15)`,
        lineDash: [10, 10],
        width: 2,
    }),
});

const units = {
    m: (meters: number) => ({ value: meters, suffix: 'm' }),
    km: (meters: number) => ({ value: meters / 1000, suffix: 'km' }),
    mi: (meters: number) => ({ value: meters / 1609.344, suffix: 'mi' }),
    nmi: (meters: number) => ({ value: meters / 1852, suffix: '' }),
};

const formatLength = function(line: Geometry) {
    const meters = getLength(line, { projection: 'EPSG:4326' });

    let unit: keyof typeof units = 'nmi';

    if (store.localSettings.distance?.units) {
        if (store.localSettings.distance.units === 'imperial') unit = 'mi';
        if (store.localSettings.distance.units === 'metric') unit = 'km';
    }

    const u = units[unit](meters);
    return `${ u.value.toFixed(1) } ${ u.suffix }`;
};


const drawStyle = (feature: FeatureLike) => {
    const geometry = feature.getGeometry();

    if (!(geometry instanceof LineString)) {
        return [lineStyle];
    }

    if (geometry.getCoordinates().length < 2 || mapStore.distance.initAircraft || mapStore.distance.targetAircraft) {
        return [lineStyle];
    }

    return [lineStyle, ...buildHeadingStyles({ map, geometry, drawing: true })];
};

watch(() => store.localSettings.distance?.units, () => {
    features.value = [];
    updateItems();
});

function handleClick(event: MapBrowserEvent) {
    const pilots = getPilotsForPixel(map.value!, event.pixel);

    if (pilots.length === 1) {
        mapStore.distance.targetAircraft = pilots[0].cid;
    }

    return true;
}

function updateItems() {
    const newFeatures: Feature[] = [];

    for (const item of mapStore.distance.items) {
        if (!item.initAircraft && !item.targetAircraft) {
            const coords = item.coordinates;
            const geometry = coords.length >= 2 ? toGeodesicLine(coords[0], coords[coords.length - 1]) : null;
            if (!geometry) continue;

            const headings = calculateHeadingPair(map, geometry);

            newFeatures.push(new Feature({
                geometry,
                id: item.date,
                length: formatLength(geometry),
                headings,
            }));

            continue;
        }

        let coordinate1 = item.coordinates[0];
        let coordinate2 = item.coordinates[1];

        if (item.initAircraft && dataStore.vatsim.data.keyedPilots.value[item.initAircraft]) {
            coordinate1 = [dataStore.vatsim.data.keyedPilots.value[item.initAircraft].longitude, dataStore.vatsim.data.keyedPilots.value[item.initAircraft].latitude];
        }

        if (item.targetAircraft && dataStore.vatsim.data.keyedPilots.value[item.targetAircraft]) {
            coordinate2 = [dataStore.vatsim.data.keyedPilots.value[item.targetAircraft].longitude, dataStore.vatsim.data.keyedPilots.value[item.targetAircraft].latitude];
        }

        const geometry = coordinate1 && coordinate2 ? toGeodesicLine(coordinate1, coordinate2) : null;
        if (!geometry) continue;

        newFeatures.push(new Feature({
            geometry,
            id: item.date,
            length: formatLength(geometry),
        }));
    }

    distanceSource.clear();
    distanceSource.addFeatures(newFeatures);
    features.value = newFeatures;
}

watch(() => mapStore.distance.items, updateItems, {
    deep: true,
    immediate: true,
});

watch(dataStore.vatsim.data.keyedPilots, updateItems);

watch(() => mapStore.distance.pixel, pixel => {
    if (drawing) {
        map.value?.removeInteraction(drawing);
        drawing.dispose();
    }

    if (!pixel) return;

    mapStore.openOverlayId = null;

    drawing = new Draw({
        source: source,
        type: 'LineString',
        stopClick: true,
        maxPoints: 2,
        minPoints: 2,
        condition: handleClick,
        style: drawStyle,
        geometryFunction: createGeodesicGeometry,
    });

    let listener: EventsKey | undefined;

    drawing.on('drawstart', event => {
        sketch.value = event.feature;

        listener = sketch.value.getGeometry()!.on('change', function(evt) {
            const geom = evt.target as LineString;

            const pair = calculateHeadingPair(map, geom);
            fromHeading.value = pair.from ?? '---';
            toHeading.value = pair.to ?? '---';

            currentResult.value = formatLength(geom);
            const { coordinate, angleRad } = getMidpointOrientation(map, geom);

            if (!coordinate) {
                tooltipRotation.value = 0;
                return;
            }

            tooltip.value = coordinate;
            tooltipRotation.value = -(angleRad * (180 / Math.PI));
        });
    });

    drawing.on('drawend', function() {
        const drawnGeometry = sketch.value!.getGeometry() as LineString;
        const drawnCoordinates = drawnGeometry.getCoordinates();
        const endpoints = drawnCoordinates.length >= 2 ? [drawnCoordinates[0], drawnCoordinates[drawnCoordinates.length - 1]] : drawnCoordinates;

        // Save
        mapStore.distance.items.push({
            date: Date.now(),
            length: formatLength(drawnGeometry),
            initAircraft: mapStore.distance.initAircraft,
            targetAircraft: mapStore.distance.targetAircraft,
            coordinates: endpoints,
        });

        // Reset
        mapStore.distance.pixel = null;
        mapStore.distance.initAircraft = null;
        mapStore.distance.targetAircraft = null;

        sketch.value = null;
        tooltip.value = null;
        tooltipRotation.value = 0;
        if (listener) {
            unByKey(listener);
        }
    });

    map.value?.addInteraction(drawing);

    drawing.appendCoordinates([pixel]);
});

function handleMapClick(e: MapBrowserEvent<any>) {
    const handleFeatures = map.value?.getFeaturesAtPixel(e.pixel, { hitTolerance: 5, layerFilter: x => x === layer });

    if (handleFeatures?.length !== 1) return;

    const pilots = getPilotsForPixel(map.value!, e.pixel);

    if (pilots.length) return;

    const id = handleFeatures[0].getProperties().id;
    const index = mapStore.distance.items.findIndex(x => x.date === id);
    if (index === -1) return;

    mapStore.distance.items.splice(index, 1);
}

watch(map, val => {
    if (!val || layer) return;
    layer = new VectorLayer({
        zIndex: 7,
        source: distanceSource,
        style: function(val) {
            const geometry = val.getGeometry();
            const stylesArr: Style[] = [lineStyle];

            if (geometry instanceof LineString) {
                const { coordinate, angleRad } = getMidpointOrientation(map, geometry);
                const labelStyle = new Style();

                if (coordinate) {
                    labelStyle.setGeometry(new Point(coordinate));
                }

                labelStyle.setText(new Text({
                    text: val.getProperties().length,
                    placement: 'point',
                    textAlign: 'center',
                    textBaseline: 'middle',
                    font: '10px Montserrat',
                    fill: new Fill({
                        color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.8)`,
                    }),
                    padding: [2, 0, 2, 2],
                    rotation: -angleRad,
                }));

                stylesArr.push(labelStyle);

                const headings = val.getProperties().headings as HeadingPair | null;
                if (headings) {
                    stylesArr.push(...buildHeadingStyles({ map, geometry, headings }));
                }
            }

            return stylesArr;
        },
    });
    val.addLayer(layer);
    val.on('singleclick', handleMapClick);
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    if (drawing) {
        map.value?.removeInteraction(drawing);
        drawing.dispose();
    }

    if (layer) {
        map.value?.removeLayer(layer);
    }

    map.value?.un('singleclick', handleMapClick);
});
</script>

<style scoped lang="scss">
.distance {
    &_tooltip {
        user-select: none;
        transform-origin: center;
        font-size: 10px;
    }
}
</style>
