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
import type { GeometryFunction } from 'ol/interaction/Draw';
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
import greatCircle from '@turf/great-circle';
import { point } from '@turf/helpers';
import { transform } from 'ol/proj';

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
let features: Feature[] = [];
const fromHeading = ref<string>('---');
const toHeading = ref<string>('---');

type HeadingPair = {
    from: string | null;
    to: string | null;
};

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

const GREAT_CIRCLE_POINTS = 128;
const HEADING_SAMPLE_STEP = 0.01;


/**
 * we noralize the angle for the label, so if it's more than 90 degrees, we flip it
 * this way the label is always readable otherwise if could be upside down if we measure anything over 90 deg
 */

function normalizeAngle(angleRad: number) {
    let angle = angleRad;

    if (angle > Math.PI / 2) angle -= Math.PI;
    if (angle < -Math.PI / 2) angle += Math.PI;

    return angle;
}

function headingToString(value: number | null) {
    if (value == null || Number.isNaN(value)) return '---';
    return String(((Math.round(value) % 360) + 360) % 360).padStart(3, '0');
}

function sampleEndpointInfo(line: LineString, position: 'start' | 'end') {
    const fraction = position === 'start' ? 0 : 1;
    const neighborFraction = position === 'start'
        ? Math.min(1, fraction + HEADING_SAMPLE_STEP)
        : Math.max(0, fraction - HEADING_SAMPLE_STEP);

    const anchor = line.getCoordinateAt(fraction);
    const neighbor = line.getCoordinateAt(neighborFraction);

    if (!anchor || !neighbor) return null;

    const anchorProjected = projectForOrientation(anchor);
    const neighborProjected = projectForOrientation(neighbor);

    if (!anchorProjected || !neighborProjected) return null;

    const dx = neighborProjected[0] - anchorProjected[0];
    const dy = neighborProjected[1] - anchorProjected[1];

    if (!dx && !dy) return null;

    const rawAngle = Math.atan2(dy, dx);
    const segmentLength = Math.hypot(dx, dy);

    const directionX = dx / segmentLength;
    const directionY = dy / segmentLength;
    const offsetSign = position === 'start' ? -1 : 1;
    const resolution = map.value?.getView().getResolution() ?? 1;
    const offsetBase = Math.max(
        segmentLength * HEADING_LABEL_FRACTION,
        resolution * HEADING_LABEL_MIN_PIXELS,
    );
    const offsetMagnitude = offsetBase * offsetSign;
    const labelProjected: Coordinate = [
        anchorProjected[0] + directionX * offsetMagnitude * (position === 'start' ? 1 : -1),
        anchorProjected[1] + directionY * offsetMagnitude * (position === 'start' ? 1 : -1),
    ];
    const labelCoordinate = unprojectFromOrientation(labelProjected) ?? anchor;

    return {
        coordinate: anchor,
        labelCoordinate,
        rotation: normalizeAngle(rawAngle),
        direction: rawAngle,
        heading: (Math.atan2(dx, dy) * (180 / Math.PI) + 360) % 360,
    };
}

function calculateHeadingPair(line: LineString): HeadingPair {
    const start = sampleEndpointInfo(line, 'start');
    const end = sampleEndpointInfo(line, 'end');

    return {
        from: headingToString(start?.heading ?? null),
        to: headingToString(end?.heading ?? null),
    };
}

const HEADING_LABEL_FRACTION = 0.02;
const HEADING_LABEL_MIN_PIXELS = 12;

function makeHeadingStyles(type: 'start' | 'end', heading: string | null, info?: ReturnType<typeof sampleEndpointInfo> | null) {
    if (!info || !heading || heading === '---') {
        return [];
    }

    const fill = new Fill({
        color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.9)`,
    });

    const baseText = {
        textAlign: 'center' as CanvasTextAlign,
        textBaseline: 'middle' as CanvasTextBaseline,
        font: '10px Montserrat',
        fill,
        rotation: -info.rotation,
    };

    const headingValue = Number.parseInt(heading, 10);
    const arrowText = '>';

    const arrowStyle = new Style({
        geometry: new Point(info.coordinate),
        text: new Text({
            ...baseText,
            text: arrowText,
            rotation: -info.direction,
        }),
    });

    const labelCoordinate = info.labelCoordinate ?? info.coordinate;

    const headingStyle = new Style({
        geometry: new Point(labelCoordinate),
        text: new Text({
            ...baseText,
            text: heading,
        }),
    });

    return type === 'start' ? [headingStyle, arrowStyle] : [arrowStyle, headingStyle];
}

function buildHeadingStyles(line: LineString, headings?: HeadingPair | null) {
    const resolvedHeadings = headings ?? calculateHeadingPair(line);
    const styles: Style[] = [];

    const startInfo = sampleEndpointInfo(line, 'start');
    const endInfo = sampleEndpointInfo(line, 'end');

    styles.push(...makeHeadingStyles('start', resolvedHeadings.from, startInfo));
    styles.push(...makeHeadingStyles('end', resolvedHeadings.to, endInfo));

    return styles;
}

const drawStyle = (feature: FeatureLike) => {
    const geometry = feature.getGeometry();

    if (!(geometry instanceof LineString)) {
        return [lineStyle];
    }

    if (geometry.getCoordinates().length < 2) {
        return [lineStyle];
    }

    return [lineStyle, ...buildHeadingStyles(geometry)];
};


/** 
 * function to project coordinates for rotation calculation
 */

function projectForOrientation(coord?: Coordinate | null): Coordinate | null {
    if (!coord) {
        return null;
    }

    const projection = map.value?.getView().getProjection();

    if (!projection) {
        return coord;
    }

    if (projection.getCode() !== 'EPSG:4326') {
        return transform(coord.slice() as Coordinate, 'EPSG:4326', projection);
    }

    return coord;
}

function unprojectFromOrientation(coord?: Coordinate | null): Coordinate | null {
    if (!coord) {
        return null;
    }

    const projection = map.value?.getView().getProjection();

    if (!projection) {
        return coord;
    }

    if (projection.getCode() !== 'EPSG:4326') {
        return transform(coord.slice() as Coordinate, projection, 'EPSG:4326');
    }

    return coord;
}

/** 
 * function to get the midpoint coordinate and rotation for the label 
 */

function getMidpointOrientation(line: LineString) {
    if (!line.getCoordinates().length) {
        return {
            coordinate: null,
            angleRad: 0,
        };
    }
    
    // in order to calculate the angle we take a tiny sigment of the line assuming it's a straight lien
    // center is the midpoint, delta is the value that is used to calculate before and after
    // to make it more accurate for longer lines we do complex math (or not lol) to get more precise delta
    // before & after are offsets from the midpoint

    const center = line.getCoordinateAt(0.5);
    const delta = Math.min(0.01, 1 / Math.max(line.getLength(), 1));

    const before = line.getCoordinateAt(Math.max(0, 0.5 - delta));
    const after = line.getCoordinateAt(Math.min(1, 0.5 + delta));

    if (!center || !before || !after) {
        return {
            coordinate: center ?? null,
            angleRad: 0,
        };
    }

    // project coordinates to the great circle for angle calculation

    const beforeProjected = projectForOrientation(before);
    const afterProjected = projectForOrientation(after);

    if (!beforeProjected || !afterProjected) {
        return {
            coordinate: center,
            angleRad: 0,
        };
    }

    // geodesic formula for angle calculation -_-

    const dx = afterProjected[0] - beforeProjected[0];
    const dy = afterProjected[1] - beforeProjected[1];

    if (dx === 0 && dy === 0) {
        return {
            coordinate: center,
            angleRad: 0,
        };
    }

    const angleRad = normalizeAngle(Math.atan2(dy, dx));

    return {
        coordinate: center,
        angleRad,
    };
}

function getBearingsForLine(line: LineString): HeadingPair {
    const pair = calculateHeadingPair(line);
    fromHeading.value = pair.from ?? '---';
    toHeading.value = pair.to ?? '---';
    return pair;
}

function toGeodesicLine(start?: Coordinate, end?: Coordinate) {
    if (!start || !end) return null;

    try {
        const circle = greatCircle(point(start), point(end), { npoints: GREAT_CIRCLE_POINTS });
        const coordinates = circle.geometry.type === 'LineString'
            ? circle.geometry.coordinates as Coordinate[]
            : (circle.geometry.type === 'MultiLineString'
                ? (circle.geometry.coordinates as Coordinate[][]).flat()
                : null);

        if (!coordinates?.length) return null;

        return new LineString(coordinates);
    }
    catch {
        return new LineString([start, end]);
    }
}

const createGeodesicGeometry: GeometryFunction = (coordinates, geometry) => {
    let coords: Coordinate[] = [];

    if (Array.isArray(coordinates)) {
        const first = coordinates[0] as unknown;

        if (Array.isArray(first)) {
            const firstEntry = (first as unknown[])[0];

            if (Array.isArray(firstEntry)) {
                coords = (coordinates as Coordinate[][]).flat() as Coordinate[];
            }
            else {
                coords = coordinates as Coordinate[];
            }
        }
        else if (typeof first === 'number') {
            coords = [coordinates as unknown as Coordinate];
        }
    }

    const line = geometry instanceof LineString ? geometry : new LineString(coords);

    if (coords.length < 2) {
        line.setCoordinates(coords);
        return line;
    }

    const geodesic = toGeodesicLine(coords[0], coords[coords.length - 1]);

    if (geodesic) {
        line.setCoordinates(geodesic.getCoordinates());
    }
    else {
        line.setCoordinates(coords);
    }

    return line;
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
            const coords = item.coordinates;
            const geometry = coords.length >= 2 ? toGeodesicLine(coords[0], coords[coords.length - 1]) : null;
            if (!geometry) continue;

            const headings = calculateHeadingPair(geometry);

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

        const headings = calculateHeadingPair(geometry);

        newFeatures.push(new Feature({
            geometry,
            id: item.date,
            length: formatLength(geometry),
            headings,
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
        style: drawStyle,
        geometryFunction: createGeodesicGeometry,
    });

    let listener: EventsKey | undefined;

    drawing.on('drawstart', event => {
        sketch.value = event.feature;

        listener = sketch.value.getGeometry()!.on('change', function(evt) {
            const geom = evt.target as LineString;

            getBearingsForLine(geom);

            currentResult.value = formatLength(geom);
            const { coordinate, angleRad } = getMidpointOrientation(geom);

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
            const geometry = val.getGeometry();
            const stylesArr: Style[] = [lineStyle];

            if (geometry instanceof LineString) {
                const { coordinate, angleRad } = getMidpointOrientation(geometry);
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
                stylesArr.push(...buildHeadingStyles(geometry, headings));
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
        font-size: 10px;
        transform-origin: center;
    }
}
</style>
