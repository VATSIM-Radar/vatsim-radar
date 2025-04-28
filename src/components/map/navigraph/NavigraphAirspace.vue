<template>
    <slot/>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import { Feature } from 'ol';
import type { ShallowRef } from 'vue';
import type VectorSource from 'ol/source/Vector';
import type { AirspaceCoordinate } from '~/utils/backend/navigraph/navdata';
import type SimpleGeometry from 'ol/geom/SimpleGeometry';
import circle from '@turf/circle';
import union from '@turf/union';
import { featureCollection } from '@turf/helpers';
import { turfGeometryToOl } from '~/utils';
import difference from '@turf/difference';
import type { Coordinate } from 'ol/coordinate';
import type { Feature as TurfFeature, Polygon as TurfPolygon, MultiPolygon as TurfMultiPolygon, LineString as TurfLineString } from 'geojson';
import greatCircle from '@turf/great-circle';
import lineToPolygon from '@turf/line-to-polygon';
import Polygon from 'ol/geom/Polygon';
import { Point } from 'ol/geom';
import destination from '@turf/destination';

defineSlots<{ default: () => any }>();

const source = inject<ShallowRef<VectorSource>>('navigraph-source');

const store = useStore();
const dataStore = useDataStore();

const controlledAirspace = computed(() => store.mapSettings.navigraphData?.airspaces?.controlled !== false);
const restrictedAirspace = computed(() => store.mapSettings.navigraphData?.airspaces?.restricted === false);
let controlled: Feature[] = [];
let restricted: Feature[] = [];

type ICircle = {
    type: 'circle';
    rawCoord: Coordinate;
    coordinate: Coordinate[][];
    distance: number;
    bearing: number;
};

type ICircleExcluded = {
    type: 'circle-excluded';
    rawCoord: Coordinate;
    coordinate: Coordinate[][];
    distance: number;
    bearing: number;
};

type IPoint = {
    type: 'point';
    coordinate: Coordinate;
};

type ILine = {
    type: 'line';
    coordinate: Coordinate[];
};

type IData = ICircle | ICircleExcluded | IPoint | ILine;

function getAirspacePolygon(coordinates: AirspaceCoordinate[], index: number): SimpleGeometry {
    if (coordinates.every(x => !x[2])) {
        return new Polygon([
            [
                ...coordinates.map(x => x[0]),
                coordinates[0][0],
            ],
        ]);
    }

    const isDebug = index === 743;

    const data: IData[] = [];

    for (const [coordinate, boundary, bearing, distance] of coordinates) {
        switch (boundary[0]) {
            case 'R':
                data.push({
                    type: 'circle',
                    coordinate: circle(
                        coordinate,
                        distance!,
                        { units: 'nauticalmiles', properties: { distance } },
                    ).geometry.coordinates,
                    rawCoord: coordinate,
                    bearing: bearing!,
                    distance: distance!,
                });
                break;
            case 'L':
                data.push({
                    type: 'circle-excluded',
                    coordinate: circle(
                        coordinate,
                        distance!,
                        { units: 'nauticalmiles', properties: { distance } },
                    ).geometry.coordinates,
                    rawCoord: coordinate,
                    bearing: bearing!,
                    distance: distance!,
                });
                break;
            case 'G':
                data.push({
                    type: 'point',
                    coordinate,
                });
                break;
        }
    }

    if (isDebug) console.log(coordinates);

    const polygons: TurfFeature<TurfPolygon>[] = [];
    const excluded: TurfFeature<TurfPolygon>[] = [];

    for (let i = 0; i < data.length; i++) {
        const item = data[i];

        if (item.type === 'point' && isDebug) {
            const previousFeature = data[i - 1];
            const nextFeature = data[i + 1];

            if (previousFeature?.type === 'circle' || previousFeature?.type === 'circle-excluded') {
                if (isDebug) console.log(i - 1, previousFeature);

                const dest = destination(previousFeature.rawCoord, previousFeature.distance, previousFeature.bearing, { units: 'nauticalmiles' });

                data.splice(i, 1, {
                    type: 'line',
                    coordinate: ((greatCircle(item.coordinate, dest, { npoints: 8 })) as TurfFeature<TurfLineString>).geometry.coordinates,
                });
            }
            else if (previousFeature?.type === 'line') {
                previousFeature.coordinate.push(item.coordinate);
            }
        }
    }

    if (isDebug) {
        console.log(data);
    }

    if (isDebug) console.log(data);

    for (let i = 0; i < data.length; i++) {
        const item = data[i];

        /* if (item.type === 'circle') {
            polygons.push({
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'Polygon',
                    coordinates: item.coordinate,
                },
            });
        }
        else if (item.type === 'circle-excluded') {
            excluded.push({
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'Polygon',
                    coordinates: item.coordinate,
                },
            });
        }*/

        if (item.type === 'line') {
            polygons.push(lineToPolygon({ type: 'LineString', coordinates: item.coordinate }) as TurfFeature<TurfPolygon>);
        }
    }

    if (isDebug) console.log(polygons);

    if (!polygons.length) {
        return new Polygon([
            [
                ...coordinates.map(x => x[0]),
                coordinates[0][0],
            ],
        ]);
    }


    const mergedBig = polygons.length === 1 ? polygons[0] : union(featureCollection(polygons));
    if (!excluded.length) return turfGeometryToOl(mergedBig);
    const mergedSmall = excluded.length === 1 ? excluded[0] : union(featureCollection(excluded));

    // TODO: other geometries, see EYKA
    const withHole = difference(featureCollection([
        mergedBig,
        mergedSmall,
    ]));

    return turfGeometryToOl(withHole);
}

watch([controlledAirspace, restrictedAirspace], () => {
    if (!controlledAirspace.value) {
        source?.value.removeFeatures(controlled);
        controlled = [];
    }
    else if (!controlled.length) {
        controlled = Object.entries(dataStore.navigraph.data.value!.controlledAirspace).map(([key, [classification, low, up, coords, flightLevel]], index) => new Feature({
            geometry: getAirspacePolygon(coords, index),
            key,
            classification,
            low,
            up,
            flightLevel,
            type: 'controlledAirspace',
        }));
        source?.value.addFeatures(controlled);
    }

    if (!restrictedAirspace.value) {
        source?.value.removeFeatures(restricted);
        restricted = [];
    }
    else if (!restricted.length) {
        restricted = Object.entries(dataStore.navigraph.data.value!.restrictedAirspace).map(([key, [type, designation, low, up, coords, flightLevel]], index) => new Feature({
            geometry: getAirspacePolygon(coords, index),
            key,
            airspaceType: type,
            designation,
            low,
            up,
            flightLevel,
            type: 'restrictedAirspace',
        }));
        source?.value.addFeatures(restricted);
    }
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    source?.value.removeFeatures(restricted);
    source?.value.removeFeatures(controlled);
});
</script>
