<template>
    <div class="distance">
        <map-overlay
            v-if="tooltip"
            model-value
            persistent
            :settings="{ position: tooltip, positioning: 'center-center' }"
        >
            <div class="distance_tooltip">
                {{currentResult}}
            </div>
        </map-overlay>
    </div>
</template>

<script setup lang="ts">
import type { ShallowRef } from 'vue';
import type { Map, MapBrowserEvent } from 'ol';
import { Feature } from 'ol';
import { useMapStore } from '~/store/map';
import { Draw } from 'ol/interaction';
import { Fill, Stroke, Style, Text } from 'ol/style';
import type { Coordinate } from 'ol/coordinate';
import VectorSource from 'ol/source/Vector';
import type { EventsKey } from 'ol/events';
import { getLength } from 'ol/sphere';
import type { Geometry } from 'ol/geom';
import { LineString } from 'ol/geom';
import { unByKey } from 'ol/Observable';
import VectorLayer from 'ol/layer/Vector';
import { useStore } from '~/store';

const map = inject<ShallowRef<Map | null>>('map')!;
const mapStore = useMapStore();
const dataStore = useDataStore();
const store = useStore();

let drawing: Draw | null = null;

const tooltip = ref<Coordinate | null>(null);
const source = new VectorSource();
const distanceSource = new VectorSource();
let layer: VectorLayer | undefined;
const sketch = shallowRef<null | Feature>(null);
const currentResult = ref<string | null>(null);
let features: Feature[] = [];

const style = new Style({
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

watch(() => store.localSettings.distance?.units, () => {
    features = [];
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
            const exisingItem = features.find(x => x.getProperties().id === item.date);
            if (exisingItem) {
                newFeatures.push(exisingItem);
                continue;
            }

            const geometry = new LineString(item.coordinates);

            newFeatures.push(new Feature({
                geometry,
                id: item.date,
                length: formatLength(geometry),
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

        const geometry = new LineString([coordinate1, coordinate2]);

        newFeatures.push(new Feature({
            geometry,
            id: item.date,
            length: formatLength(geometry),
        }));
    }

    distanceSource.clear();
    distanceSource.addFeatures(newFeatures);
    features = newFeatures;
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
        style,
    });

    let listener: EventsKey | undefined;

    drawing.on('drawstart', event => {
        sketch.value = event.feature;

        listener = sketch.value.getGeometry()!.on('change', function(evt) {
            const geom = evt.target;

            currentResult.value = formatLength(geom);
            const coordinates = geom.getCoordinates();
            if (coordinates.length !== 2) return;

            const firstCoordinate = coordinates[0];
            const secondCoordinate = coordinates[1];

            tooltip.value = [(firstCoordinate[0] + secondCoordinate[0]) / 2, (firstCoordinate[1] + secondCoordinate[1]) / 2];
        });
    });

    drawing.on('drawend', function() {
        // Save
        mapStore.distance.items.push({
            date: Date.now(),
            length: formatLength(sketch.value!.getGeometry()!),
            initAircraft: mapStore.distance.initAircraft,
            targetAircraft: mapStore.distance.targetAircraft,
            coordinates: (sketch.value!.getGeometry() as LineString)!.getCoordinates(),
        });

        // Reset
        mapStore.distance.pixel = null;
        mapStore.distance.initAircraft = null;
        mapStore.distance.targetAircraft = null;

        sketch.value = null;
        tooltip.value = null;

        if (listener) {
            unByKey(listener);
        }
    });

    map.value?.addInteraction(drawing);

    drawing.appendCoordinates([pixel]);
});

function handleMapClick(e: MapBrowserEvent<any>) {
    const features = map.value?.getFeaturesAtPixel(e.pixel, { hitTolerance: 5, layerFilter: x => x === layer });

    if (features?.length !== 1) return;

    const pilots = getPilotsForPixel(map.value!, e.pixel);

    if (pilots.length) return;

    const id = features[0].getProperties().id;
    const index = mapStore.distance.items.findIndex(x => x.date === id);
    if (index === -1) return;

    mapStore.distance.items.splice(index, 1);
}

watch(map, val => {
    if (!val || layer) return;
    layer = new VectorLayer({
        zIndex: 6,
        source: distanceSource,
        style: function(val) {
            return [
                style,
                new Style({
                    text: new Text({
                        text: val.getProperties().length,
                        placement: 'point',
                        textAlign: 'center',
                        font: '10px Montserrat',
                        fill: new Fill({
                            color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.8)`,
                        }),
                        padding: [2, 0, 2, 2],
                    }),
                }),
            ];
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
        font-size: 10px;
    }
}
</style>
