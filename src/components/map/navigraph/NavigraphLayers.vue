<template>
    <div class="layers"/>
</template>

<script setup lang="ts">
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import { Feature } from 'ol';
import VectorSource from 'ol/source/Vector';
import { LineString, Point } from 'ol/geom';
import { Fill, Style, Text, Icon, Stroke, Circle } from 'ol/style';
import { getCurrentThemeRgbColor } from '~/composables';
import VectorImageLayer from 'ol/layer/VectorImage';
import greatCircle from '@turf/great-circle';
import { greatCircleGeometryToOL } from '~/utils';
import { getSelectedColorFromSettings } from '~/composables/colors';
import { useMapStore } from '~/store/map';
import { toRadians } from 'ol/math';

let ndbSource: VectorSource | undefined;
let ndbLayer: VectorImageLayer<any> | undefined;

let airwaySource: VectorSource | undefined;
let airwayLayer: VectorImageLayer<any> | undefined;

const ndbEnabled = ref(true);
const mapStore = useMapStore();
const airwaysEnabled = ref(true);

const map = inject<ShallowRef<Map | null>>('map')!;
const dataStore = useDataStore();

const ndbStyle = new Icon({
    src: '/icons/ndb.png',
    width: 16,
    color: `rgb(${ getCurrentThemeRgbColor('lightgray125').join(',') })`,
    opacity: 0.6,
});

const vordmeStyle = new Icon({
    src: '/icons/vordme.png',
    width: 16,
    color: `rgb(${ getCurrentThemeRgbColor('lightgray125').join(',') })`,
    opacity: 0.6,
});

function initNDB() {
    if (ndbEnabled.value) {
        if (!ndbLayer) {
            ndbLayer = new VectorImageLayer<any>({
                source: ndbSource = new VectorSource(),
                zIndex: 7,
                minZoom: 7,
                declutter: true,
                properties: {
                    type: 'navigraph',
                },
                style: function(feature) {
                    const properties = feature.getProperties();

                    if (properties.isVHF) {
                        return new Style({
                            image: vordmeStyle,
                            text: new Text({
                                font: '8px Montserrat',
                                text: `${ properties.name }\nVORDME ${ properties.frequency } ${ properties.code }`,
                                offsetX: 15,
                                offsetY: 2,
                                textAlign: 'left',
                                justify: 'center',
                                fill: new Fill({
                                    color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.8)`,
                                }),
                            }),
                        });
                    }

                    return new Style({
                        image: ndbStyle,
                        text: new Text({
                            font: '8px Montserrat',
                            text: `${ properties.name }\nNDB ${ properties.frequency } ${ properties.code }`,
                            offsetX: 15,
                            offsetY: 2,
                            textAlign: 'left',
                            justify: 'center',
                            fill: new Fill({
                                color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.8)`,
                            }),
                        }),
                    });
                },
            });
        }

        ndbSource?.clear();

        ndbSource?.addFeatures(Object.values(dataStore.navigraph.data.value!.vhf).map(([name, code, frequency, longitude, latitude]) => new Feature({
            geometry: new Point([longitude, latitude]),
            name,
            code,
            frequency,
            isVHF: true,
        })));

        ndbSource?.addFeatures(Object.values(dataStore.navigraph.data.value!.ndb).map(([name, code, frequency, longitude, latitude]) => new Feature({
            geometry: new Point([longitude, latitude]),
            name,
            code,
            frequency,
        })));

        map.value?.addLayer(ndbLayer);
    }
    else {
        if (ndbLayer) {
            map.value?.removeLayer(ndbLayer);
        }
        ndbLayer?.dispose();
    }
}

async function initAirways() {
    if (airwaysEnabled.value) {
        if (!airwayLayer) {
            airwayLayer = new VectorImageLayer<any>({
                source: airwaySource = new VectorSource(),
                zIndex: 7,
                minZoom: 6,
                declutter: true,
                properties: {
                    type: 'navigraph',
                },
                style: function(feature) {
                    const properties = feature.getProperties();

                    if (properties.type === 'point') {
                        return new Style({
                            image: new Circle({
                                radius: 4,
                                stroke: new Stroke({
                                    color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.2)`,
                                    width: 2,
                                }),
                            }),
                            text: new Text({
                                font: '8px Montserrat',
                                text: `${ properties.waypoint }`,
                                offsetX: 15,
                                offsetY: 2,
                                textAlign: 'left',
                                justify: 'center',
                                padding: [12, 12, 12, 12],
                                fill: new Fill({
                                    color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 1)`,
                                }),
                            }),
                        });
                    }

                    return new Style({
                        stroke: new Stroke({
                            color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.2)`,
                            width: 1,
                        }),
                        text: new Text({
                            font: 'bold 10px Montserrat',
                            text: `${ properties.identifier }`,
                            placement: 'line',
                            keepUpright: true,
                            justify: 'center',
                            padding: [12, 12, 12, 12],
                            rotateWithView: false,
                            fill: new Fill({
                                color: `rgba(${ getCurrentThemeRgbColor('primary300').join(',') }, 1)`,
                            }),
                        }),
                    });
                },
            });
        }

        airwaySource?.clear();

        const features: Feature[] = [];

        console.time('features add');

        const entries = Object.entries(dataStore.navigraph.data.value!.airways);
        const len = entries.length;

        for (let i = 0; i < len; i++) {
            const entry = entries[i];
            const [key, [identifier, type, waypoints]] = entry;

            if (type === 'C') continue;
            waypoints.forEach((waypoint, index) => {
                const nextWaypoint = waypoints[index + 1];

                features.push(new Feature({
                    geometry: new Point([waypoint[3], waypoint[4]]),
                    key,
                    identifier,
                    waypoint: waypoint[0],
                    type: 'point',
                }));

                if (!nextWaypoint) return;

                features.push(new Feature({
                    geometry: greatCircleGeometryToOL(greatCircle([waypoint[3], waypoint[4]], [nextWaypoint[3], nextWaypoint[4]])),
                    // geometry: new LineString([[waypoint[1], waypoint[2]], [nextWaypoint[1], nextWaypoint[2]]]),
                    key,
                    identifier,
                    inbound: waypoint[1],
                    waypoint: waypoint[0],
                }));
            });
        }

        console.timeLog('features add');

        airwaySource?.addFeatures(features);

        console.timeEnd('features add');

        map.value?.addLayer(airwayLayer);
    }
    else {
        if (airwayLayer) {
            map.value?.removeLayer(airwayLayer);
        }
        airwayLayer?.dispose();
    }
}

watch(map, val => {
    if (!val) return;

    initNDB();
    initAirways();
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    if (ndbLayer) {
        map.value?.removeLayer(ndbLayer);
    }
    ndbLayer?.dispose();

    if (airwayLayer) {
        map.value?.removeLayer(airwayLayer);
    }
    airwayLayer?.dispose();
});
</script>

<style scoped lang="scss">
.layers {

}
</style>
