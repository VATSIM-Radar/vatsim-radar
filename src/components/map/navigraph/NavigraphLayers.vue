<template>
    <div
        v-if="navigraphSource"
        class="layers"
    >
        <navigraph-ndb/>
        <navigraph-airways/>
        <map-overlay
            v-if="activeFeature"
            model-value
            :settings="{ position: activeFeature.coords, stopEvent: true }"
            :z-index="8"
        >
            <common-popup-block
                @mouseleave="activeFeature = null"
            >
                <template #title>
                    <template v-if="isVHF(activeFeature)">
                        VORDME
                    </template>
                    <template v-if="isNDB(activeFeature)">
                        NDB
                    </template>
                    <template v-if="isAirway(activeFeature)">
                        Airway
                    </template>
                </template>
                <div class="layers_info">
                    <template v-if="isVHF(activeFeature)">
                        <div
                            v-for="field in ([
                                ['Ident', activeFeature.data.icaoCode],
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
                    <template v-else-if="isNDB(activeFeature)">
                        <div
                            v-for="field in ([
                                ['Ident', activeFeature.data.icaoCode],
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
                    <template v-else-if="isAirway(activeFeature)">
                        <div
                            v-for="field in ([
                                ['Route', activeFeature.data.airway.identifier],
                                ['Inbound course', activeFeature.additionalData?.waypoint.inbound],
                                ['Outbound course', activeFeature.additionalData?.waypoint.outbound],
                                ['Minimum altitude', activeFeature.additionalData?.waypoint.minAlt],
                                ['Maximum altitude', activeFeature.additionalData?.waypoint.maxAlt],
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
import VectorLayer from 'ol/layer/Vector';
import type { NavigraphGetData, NavigraphNavData } from '~/utils/backend/navigraph/navdata';
import { useStore } from '~/store';
import NavigraphAirways from '~/components/map/navigraph/NavigraphAirways.vue';

const navigraphSource = shallowRef<VectorSource | null>(null);
let navigraphLayer: VectorLayer<any> | undefined;

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

const showAirwaysLabels = computed(() => store.mapSettings.navigraphData?.airways?.showAirwaysLabel !== false);
const showWaypointsLabels = computed(() => store.mapSettings.navigraphData?.airways?.showWaypointsLabel !== false);

async function handleMapClick(event: MapBrowserEvent<any>) {
    const feature = map.value?.getFeaturesAtPixel(event.pixel, { hitTolerance: 5, layerFilter: val => val === navigraphLayer })?.[0];
    if (!feature) return activeFeature.value = null;

    const properties = feature.getProperties();
    if (properties.type === 'vhf' || properties.type === 'ndb' || properties.type === 'airways') {
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
            color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.1)`,
            width: 1,
        });

        navigraphLayer = new VectorLayer<any>({
            source: navigraphSource.value,
            zIndex: 6,
            minZoom: 6,
            declutter: true,
            properties: {
                type: 'navigraph',
            },
            style: function(feature) {
                const properties = feature.getProperties();

                if (properties.type === 'vhf') {
                    return new Style({
                        image: vordmeStyle,
                        zIndex: 6,
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

                if (properties.type === 'ndb') {
                    return new Style({
                        image: ndbStyle,
                        zIndex: 6,
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
                }

                if (properties.type.endsWith('waypoint')) {
                    return new Style({
                        image: waypointCircle,
                        text: showWaypointsLabels.value
                            ? new Text({
                                font: '8px Montserrat',
                                text: `${ properties.waypoint }`,
                                offsetX: 15,
                                offsetY: 2,
                                textAlign: 'left',
                                justify: 'center',
                                padding: [6, 6, 6, 6],
                                fill: new Fill({
                                    color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 1)`,
                                }),
                            })
                            : undefined,
                    });
                }

                if (properties.type === 'airways') {
                    return new Style({
                        stroke: waypointStroke,
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
                                    color: `rgba(${ getCurrentThemeRgbColor('primary300').join(',') }, 1)`,
                                }),
                            })
                            : undefined,
                    });
                }
            },
        });

        map.value?.addLayer(navigraphLayer);
        map.value?.on('click', handleMapClick);
    }
}, {
    immediate: true,
});

onBeforeUnmount(() => {
    if (navigraphLayer) {
        map.value?.removeLayer(navigraphLayer);
    }
    navigraphLayer?.dispose();
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
