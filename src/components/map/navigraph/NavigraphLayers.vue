<template>
    <div
        v-if="navigraphSource"
        class="layers"
    >
        <navigraph-ndb/>
        <navigraph-airways/>
        <navigraph-waypoints/>
        <navigraph-waypoints/>
        <navigraph-holdings/>
        <navigraph-airspace/>
        <map-overlay
            v-if="activeFeature || activeAirspaces.length"
            model-value
            :settings="{ position: activeAirspaces[0]?.coords ?? activeFeature!.coords, stopEvent: true }"
            :z-index="8"
        >
            <common-popup-block
                @mouseleave="[activeFeature = null, activeAirspaces = []]"
            >
                <template #title>
                    <template v-if="activeFeature && (isVHF(activeFeature) || isNDB(activeFeature))">
                        {{ activeFeature.data.icaoCode }}
                    </template>
                    <template v-else-if="activeFeature && isAirway(activeFeature)">
                        {{ activeFeature.data.airway.identifier }}
                    </template>
                    <template v-else-if="activeFeature && isHolding(activeFeature)">
                        {{ activeFeature.data.name }}
                    </template>
                    <template v-else-if="activeAirspaces.length">
                        <template v-if="activeAirspaces.length === 1">
                            <!-- @vue-ignore -->
                            {{ activeAirspaces[0].data.name }}
                        </template>
                        <template v-else>
                            Airspaces
                        </template>
                    </template>
                </template>
                <div class="layers_info">
                    <template v-if="activeFeature && isVHF(activeFeature)">
                        <div
                            v-for="field in ([
                                ['Name', activeFeature.data.navaid.name],
                                ['Frequency', activeFeature.data.frequency],
                                ['Magnetic Variation', `${ activeFeature.data.magneticVariation }°`],
                                ['Elevation', `${ activeFeature.data.elevation } ft`],
                            ] as [string, any][]).filter(x => x[1])"
                            :key="field[0]"
                            class="__grid-info-sections __grid-info-sections--flex"
                        >
                            <div class="__grid-info-sections_title">
                                {{ field[0] }}
                            </div>
                            <span>
                                {{ field[1] }}
                            </span>
                        </div>
                    </template>
                    <template v-else-if="activeFeature && isNDB(activeFeature)">
                        <div
                            v-for="field in ([
                                ['Name', activeFeature.data.navaid.name],
                                ['Frequency', `${ activeFeature.data.frequency } kHz`],
                                ['Magnetic Variation', `${ activeFeature.data.magneticVariation }°`],
                            ] as [string, any][]).filter(x => x[1])"
                            :key="field[0]"
                            class="__grid-info-sections __grid-info-sections--flex"
                        >
                            <div class="__grid-info-sections_title">
                                {{ field[0] }}
                            </div>
                            <span>
                                {{ field[1] }}
                            </span>
                        </div>
                    </template>
                    <template v-else-if="activeFeature && isAirway(activeFeature)">
                        <div
                            v-for="field in ([
                                ['Inbound course', activeFeature.additionalData?.waypoint.inbound],
                                ['Outbound course', activeFeature.additionalData?.waypoint.outbound],
                                ['Minimum altitude', activeFeature.additionalData?.waypoint.minAlt],
                                ['Maximum altitude', activeFeature.additionalData?.waypoint.maxAlt],
                                ['Level', activeFeature.additionalData?.waypoint.flightLevel === 'H' ? 'High' : activeFeature.additionalData?.waypoint.flightLevel === 'L' ? 'Low' : 'Both'],
                            ] as [string, any][]).filter(x => x[1])"
                            :key="field[0]"
                            class="__grid-info-sections __grid-info-sections--vertical"
                        >
                            <div class="__grid-info-sections_title">
                                {{ field[0] }}
                            </div>
                            <span>
                                {{ field[1] }}
                            </span>
                        </div>
                    </template>
                    <template v-else-if="activeFeature && isHolding(activeFeature)">
                        <div
                            v-for="field in ([
                                ['Speed', activeFeature.data.speed],
                                ['Inbound Course', activeFeature.data.inboundCourse],
                                ['Leg length', activeFeature.data.legLength],
                                ['Leg time', activeFeature.data.legTime],
                                ['Min alt', activeFeature.data.minAlt],
                                ['Max alt', activeFeature.data.maxAlt],
                                ['Turns', activeFeature.data.turns === 'L' ? 'Left' : 'Right'],
                                ['Waypoint', activeFeature.data.waypoint?.identifier],
                            ] as [string, any][]).filter(x => x[1])"
                            :key="field[0]"
                            class="__grid-info-sections __grid-info-sections--vertical"
                        >
                            <div class="__grid-info-sections_title">
                                {{ field[0] }}
                            </div>
                            <span>
                                {{ field[1] }}
                            </span>
                        </div>
                    </template>
                    <template v-else-if="activeAirspaces.length">
                        <div
                            v-for="airspace in activeAirspaces"
                            :key="airspace.additionalData!.key"
                            :style="{ '--color': airspace.additionalData!.color.join(',') }"
                        >
                            {{airspace.data}}
                        </div>
                    </template>
                </div>
            </common-popup-block>
        </map-overlay>
    </div>
</template>

<script setup lang="ts">
import type { ShallowRef } from 'vue';
import type { Map, MapBrowserEvent } from 'ol';
import VectorSource from 'ol/source/Vector';
import { Fill, Style, Text, Icon, Stroke, Circle } from 'ol/style';
import { getCurrentThemeRgbColor } from '~/composables';
import NavigraphNdb from '~/components/map/navigraph/NavigraphNdb.vue';
import type { Coordinate } from 'ol/coordinate';
import type { NavigraphGetData, NavigraphNavData } from '~/utils/backend/navigraph/navdata';
import { useStore } from '~/store';
import NavigraphAirways from '~/components/map/navigraph/NavigraphAirways.vue';
import VectorImageLayer from 'ol/layer/VectorImage';
import CircleStyle from 'ol/style/Circle';
import type { FeatureLike } from 'ol/Feature';
import NavigraphWaypoints from '~/components/map/navigraph/NavigraphWaypoints.vue';
import NavigraphHoldings from '~/components/map/navigraph/NavigraphHoldings.vue';
import NavigraphAirspace from '~/components/map/navigraph/NavigraphAirspace.vue';

const navigraphSource = shallowRef<VectorSource | null>(null);
let navigraphLayer: VectorImageLayer<any> | undefined;
let navigraphFakeLayer: VectorImageLayer<any> | undefined;

const store = useStore();

provide('navigraph-source', navigraphSource);

const map = inject<ShallowRef<Map | null>>('map')!;

type ActiveFeature<T extends keyof NavigraphNavData> = {
    coords: Coordinate;
    type: T;
    data: NavigraphGetData<T>;
    additionalData?: Record<string, any>;
    properties: Record<string, any>;
};

const activeFeature: Ref<ActiveFeature<keyof NavigraphNavData> | null> = ref(null);

function isVHF(activeFeature: ActiveFeature<any>): activeFeature is ActiveFeature<'vhf'> {
    return activeFeature.type === 'vhf';
}

function isNDB(activeFeature: ActiveFeature<any>): activeFeature is ActiveFeature<'ndb'> {
    return activeFeature.type === 'ndb';
}

function isAirway(activeFeature: ActiveFeature<any>): activeFeature is ActiveFeature<'airways'> {
    return activeFeature.type === 'airways';
}

function isHolding(activeFeature: ActiveFeature<any>): activeFeature is ActiveFeature<'holdings'> {
    return activeFeature.type === 'holdings';
}

function isControlledAirspace(activeFeature: ActiveFeature<any>): activeFeature is ActiveFeature<'controlledAirspace'> {
    return activeFeature.type === 'controlledAirspace';
}

function isRestrictedAirspace(activeFeature: ActiveFeature<any>): activeFeature is ActiveFeature<'restrictedAirspace'> {
    return activeFeature.type === 'restrictedAirspace';
}

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

const fakeCircle = new CircleStyle({
    radius: 1,
    fill: new Fill({ color: 'rgba(0,0,0,0)' }),
});

const showAirwaysLabels = computed(() => store.mapSettings.navigraphData?.airways?.showAirwaysLabel !== false);
const showWaypointsLabels = computed(() => store.mapSettings.navigraphData?.airways?.showWaypointsLabel !== false);

const activeAirspaces = shallowRef([] as ActiveFeature<keyof NavigraphNavData>[]);

const keys = [
    getCurrentThemeRgbColor('success300'),
    getCurrentThemeRgbColor('warning300'),
    getCurrentThemeRgbColor('info300'),
    getCurrentThemeRgbColor('success500'),
    getCurrentThemeRgbColor('warning500'),
    getCurrentThemeRgbColor('info500'),
    getCurrentThemeRgbColor('success700'),
    getCurrentThemeRgbColor('warning700'),
    getCurrentThemeRgbColor('info700'),
];

watch(activeAirspaces, () => {
    navigraphLayer?.changed();
});

async function handleMapClick(event: MapBrowserEvent<any>) {
    const features = map.value?.getFeaturesAtPixel(event.pixel, { hitTolerance: 5, layerFilter: val => val === navigraphLayer || val === navigraphFakeLayer });

    if (features?.some(x => x.getProperties().type.endsWith('Airspace'))) {
        activeAirspaces.value = await Promise.all(features.filter(x => x.getProperties().type.endsWith('Airspace')).map(async (feature, index) => {
            const properties = feature.getProperties();
            return {
                coords: event.coordinate,
                type: properties.type as keyof NavigraphNavData,
                data: await getNavigraphData({
                    data: properties.type,
                    key: properties.key,
                }),
                properties,
                additionalData: {
                    key: properties.key,
                    color: keys[index] ?? getCurrentThemeHexColor('primary300'),
                },
            };
        }));

        return;
    }

    activeAirspaces.value = [];

    if (!features?.length) return activeFeature.value = null;

    const feature = features[0];
    const properties = feature.getProperties();
    if (!properties.type.endsWith('waypoint')) {
        activeFeature.value = {
            coords: event.coordinate,
            type: properties.type as keyof NavigraphNavData,
            data: await getNavigraphData({
                data: properties.type,
                key: properties.key,
            }),
            properties,
        };

        if (isAirway(activeFeature.value)) {
            activeFeature.value.additionalData = {
                waypoint: activeFeature.value.data.waypoints.find(x => x.identifier === properties.waypoint),
            };
        }
    }
    else activeFeature.value = null;
}

watch(map, val => {
    if (!val) return;

    if (!navigraphLayer) {
        navigraphSource.value = new VectorSource();

        const waypointCircle = new Circle({
            radius: 4,
            stroke: new Stroke({
                color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.1)`,
                width: 2,
            }),
        });

        const waypointStroke = new Stroke({
            color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.2)`,
            width: 1,
        });

        const holdingStroke = new Stroke({
            color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.2)`,
            width: 1,
        });

        const waypointBlueStroke = new Stroke({
            color: `rgba(${ getCurrentThemeRgbColor('primary300').join(',') }, 0.3)`,
            width: 1,
        });

        const restrictedStyle = new Style({
            stroke: new Stroke({
                color: `rgba(${ getCurrentThemeRgbColor('error500').join(',') }, 0.4)`,
                width: 2,
            }),
        });

        const controlledStyle = new Style({
            stroke: new Stroke({
                color: `rgba(${ getCurrentThemeRgbColor('primary300').join(',') }, 0.2)`,
                width: 2,
            }),
        });

        function getStyle(feature: FeatureLike, fake: boolean): (Style | Array<Style> | undefined) {
            const properties = feature.getProperties();

            if (properties.type === 'vhf') {
                return [
                    new Style({
                        image: fake ? fakeCircle : vordmeStyle,
                        zIndex: 6,
                    }),
                    new Style({
                        text: new Text({
                            font: '8px Montserrat',
                            text: `${ properties.name }\nVORDME ${ properties.frequency } ${ properties.code }`,
                            offsetX: 15,
                            offsetY: 2,
                            textAlign: 'left',
                            justify: 'center',
                            fill: new Fill({
                                color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, ${ fake ? 0 : 0.8 })`,
                            }),
                        }),
                        zIndex: 5,
                    }),
                ];
            }

            if (properties.type === 'ndb') {
                return [
                    new Style({
                        image: fake ? fakeCircle : ndbStyle,
                        zIndex: 6,
                    }),
                    new Style({
                        text: new Text({
                            font: '8px Montserrat',
                            text: `${ properties.name }\nNDB ${ properties.frequency } ${ properties.code }`,
                            offsetX: 15,
                            offsetY: 2,
                            textAlign: 'left',
                            justify: 'center',
                            fill: new Fill({
                                color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, ${ fake ? 0 : 0.8 })`,
                            }),
                        }),
                        zIndex: 4,
                    }),
                ];
            }

            if (fake) return;

            if (properties.type.endsWith('waypoint')) {
                return [
                    new Style({
                        image: waypointCircle,
                        zIndex: 6,
                    }),
                    new Style({
                        text: showWaypointsLabels.value
                            ? new Text({
                                font: '8px Montserrat',
                                text: `${ properties.waypoint }`,
                                offsetX: 15,
                                offsetY: 2,
                                textAlign: 'left',
                                justify: 'center',
                                padding: [2, 2, 2, 2],
                                fill: new Fill({
                                    color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.8)`,
                                }),
                            })
                            : undefined,
                        zIndex: 4,
                    }),
                ];
            }

            if (properties.type === 'airways') {
                return new Style({
                    stroke: properties.flightLevel === 'L' ? waypointStroke : waypointBlueStroke,
                    zIndex: 5,
                    text: showAirwaysLabels.value
                        ? new Text({
                            font: 'bold 10px Montserrat',
                            text: `${ properties.identifier }`,
                            placement: 'line',
                            keepUpright: true,
                            justify: 'center',
                            padding: [6, 6, 6, 6],
                            rotateWithView: false,
                            fill: new Fill({
                                color: `rgba(${ getCurrentThemeRgbColor('primary300').join(',') }, 0.7)`,
                            }),
                        })
                        : undefined,
                });
            }

            if (properties.type === 'holdings') {
                return new Style({
                    stroke: holdingStroke,
                    zIndex: 8,
                    text: new Text({
                        font: '11px bold Montserrat',
                        text: `${ properties.course }° ${ properties.turns }`,
                        maxAngle: 0,
                        placement: 'line',
                        textBaseline: 'bottom',
                        keepUpright: true,
                        overflow: true,
                        padding: [2, 2, 2, 2],
                        fill: new Fill({
                            color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.8)`,
                        }),
                    }),
                });
            }

            if (properties.type === 'controlledAirspace') {
                const activeAirspace = activeAirspaces.value.find(x => x.additionalData!.key === properties.key);

                if (activeAirspace) {
                    return new Style({
                        fill: new Fill({
                            color: `rgba(${ activeAirspace.additionalData!.color }, 0.2)`,
                        }),
                        stroke: new Stroke({
                            color: `rgba(${ activeAirspace.additionalData!.color }, 0.8)`,
                            width: 1,
                        }),
                    });
                }

                return controlledStyle;
            }

            if (properties.type === 'restrictedAirspace') {
                return restrictedStyle;
            }
        }

        navigraphFakeLayer = new VectorImageLayer<any>({
            source: navigraphSource.value,
            zIndex: 6,
            minZoom: 5,
            declutter: false,
            properties: {
                type: 'navigraph',
            },
            style: function(feature) {
                return getStyle(feature, true);
            },
        });

        navigraphLayer = new VectorImageLayer<any>({
            source: navigraphSource.value,
            zIndex: 6,
            minZoom: 5,
            declutter: true,
            properties: {
                type: 'navigraph',
            },
            style: function(feature) {
                return getStyle(feature, false);
            },
        });

        map.value?.addLayer(navigraphLayer);
        map.value?.addLayer(navigraphFakeLayer);
        map.value?.on('click', handleMapClick);
    }
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    if (navigraphLayer) {
        map.value?.removeLayer(navigraphLayer);
    }
    if (navigraphFakeLayer) map.value?.removeLayer(navigraphFakeLayer);
    navigraphLayer?.dispose();
    navigraphFakeLayer?.dispose();
    map.value?.un('click', handleMapClick);
});
</script>

<style scoped lang="scss">
.layers_info {
    cursor: initial;

    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    max-width: 300px;

    font-size: 14px;
}
</style>
