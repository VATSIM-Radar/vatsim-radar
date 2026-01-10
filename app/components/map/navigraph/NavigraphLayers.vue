<template>
    <div
        v-if="navigraphSource"
        class="layers"
    >
        <template v-if="mapStore.zoom > 5 && !store.localSettings.disableNavigraph">
            <navigraph-ndb v-if="store.mapSettings.navigraphData?.ndb || store.mapSettings.navigraphData?.vordme"/>
            <navigraph-airways v-if="store.mapSettings.navigraphData?.airways?.enabled"/>
            <navigraph-waypoints v-if="store.mapSettings.navigraphData?.waypoints"/>
            <navigraph-holdings/>
        </template>
        <navigraph-procedures/>
        <navigraph-route v-if="!store.localSettings.disableNavigraphRoute"/>
        <navigraph-nat
            v-if="store.localSettings.natTrak?.enabled"
            :key="JSON.stringify(store.localSettings.natTrak)"
        />
        <map-overlay
            v-if="activeFeature"
            model-value
            :settings="{ position: activeFeature!.coords, stopEvent: true }"
            :z-index="8"
            @update:modelValue="activeFeature = null"
        >
            <common-popup-block
                @mouseleave="activeFeature = null"
            >
                <template #title>
                    <template v-if="activeFeature && isNDB(activeFeature)">
                        {{ activeFeature.data.navaid.ident }}
                    </template>
                    <template v-if="activeFeature && isVHF(activeFeature)">
                        {{ activeFeature.data.navaid.ident ?? activeFeature.data.ident }}
                    </template>
                    <template v-else-if="activeFeature && isAirway(activeFeature)">
                        {{ activeFeature.data.airway.identifier }}
                    </template>
                    <template v-else-if="activeFeature && isHolding(activeFeature)">
                        {{ activeFeature.data.name }}
                    </template>
                    <template v-else-if="activeFeature && isNat(activeFeature)">
                        {{ activeFeature.data.identifier }}
                    </template>
                </template>
                <div
                    class="layers_info"
                    :class="[`layers_info--type-${ activeFeature.type }`]"
                >
                    <template v-if="activeFeature && isVHF(activeFeature)">
                        <div
                            v-for="field in ([
                                ['Name', activeFeature.data.navaid.name],
                                ['DME Ident', activeFeature.data.navaid.ident],
                                ['Frequency', activeFeature.data.frequency],
                                ['Magnetic Variation', `${ activeFeature.data.magneticVariation }°`],
                                ['Elevation', `${ activeFeature.data.elevation } ft`],
                                ['Range', activeFeature.data.range],
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
                                ['Range', activeFeature.data.range],
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
                                ['Inbound course', activeFeature.additionalData?.waypoint?.inbound],
                                ['Outbound course', activeFeature.additionalData?.waypoint?.outbound],
                                ['Minimum altitude', activeFeature.additionalData?.waypoint?.minAlt],
                                ['Maximum altitude', activeFeature.additionalData?.waypoint?.maxAlt],
                                ['Direction restriction', activeFeature.additionalData?.waypoint?.direction === 'F' ? 'Forward' : activeFeature.additionalData?.waypoint?.direction === 'B' ? 'Backwards' : null],
                                ['Level', activeFeature.additionalData?.waypoint?.flightLevel === 'H' ? 'High' : activeFeature.additionalData?.waypoint?.flightLevel === 'L' ? 'Low' : 'Both'],
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
                                ['Max Speed', activeFeature.data.speed],
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
                    <div
                        v-else-if="activeFeature && isNat(activeFeature)"
                        class="layers__nat"
                    >
                        <div
                            v-if="activeFeature.data.valid_from"
                            class="__grid-info-sections __grid-info-sections--large-title"
                        >
                            <div class="__grid-info-sections_title">
                                Active from
                            </div>
                            <span>
                                {{ datetime.format(activeFeature.data.valid_from) }}Z
                            </span>
                        </div>
                        <div
                            v-if="activeFeature.data.valid_to"
                            class="__grid-info-sections __grid-info-sections--large-title"
                        >
                            <div class="__grid-info-sections_title">
                                Active to
                            </div>
                            <span>
                                {{ datetime.format(activeFeature.data.valid_to) }}Z
                            </span>
                        </div>
                        <div
                            v-if="activeFeature.data.flight_levels?.length"
                            class="__grid-info-sections __grid-info-sections--large-title"
                        >
                            <div class="__grid-info-sections_title">
                                Valid at
                            </div>
                            <div>
                                <span
                                    v-for="(level, index) in activeFeature.data.flight_levels"
                                    :key="level + index"
                                >
                                    FL{{level / 100}}
                                </span>
                            </div>
                        </div>
                        <div
                            v-if="activeFeature.data.direction"
                            class="__grid-info-sections __grid-info-sections--large-title"
                        >
                            <div class="__grid-info-sections_title">
                                Direction
                            </div>
                            <div>
                                <template v-if="activeFeature.data.direction === 'west'">
                                    West
                                </template>
                                <template v-else-if="activeFeature.data.direction === 'east'">
                                    East
                                </template>
                                <template v-else>
                                    Bidirectional track
                                </template>
                            </div>
                        </div>
                        <common-copy-info-block
                            :text="activeFeature.data.last_routeing"
                        >
                            Route
                        </common-copy-info-block>
                    </div>
                </div>
            </common-popup-block>
        </map-overlay>
    </div>
</template>

<script setup lang="ts">
import type { ShallowRef } from 'vue';
import type { Map, MapBrowserEvent } from 'ol';
import VectorSource from 'ol/source/Vector';
import { Fill, Style, Text, Icon, Stroke } from 'ol/style';
import { getCurrentThemeRgbColor } from '~/composables';
import NavigraphNdb from '~/components/map/navigraph/NavigraphNdb.vue';
import type { Coordinate } from 'ol/coordinate';
import { useStore } from '~/store';
import NavigraphAirways from '~/components/map/navigraph/NavigraphAirways.vue';
import VectorImageLayer from 'ol/layer/VectorImage';
import CircleStyle from 'ol/style/Circle';
import type { FeatureLike } from 'ol/Feature';
import NavigraphWaypoints from '~/components/map/navigraph/NavigraphWaypoints.vue';
import NavigraphHoldings from '~/components/map/navigraph/NavigraphHoldings.vue';
import type { NavigraphGetData, NavigraphNavData } from '~/utils/backend/navigraph/navdata/types';
import { useMapStore } from '~/store/map';
import NavigraphProcedures from '~/components/map/navigraph/NavigraphProcedures.vue';
import NavigraphRoute from '~/components/map/navigraph/NavigraphRoute.vue';
import NavigraphNat from '~/components/map/navigraph/NavigraphNat.vue';
import CommonCopyInfoBlock from '~/components/common/blocks/CommonCopyInfoBlock.vue';
import type { VatsimNattrakClient } from '~/types/data/vatsim';
import MapOverlay from '~/components/map/MapOverlay.vue';
import CommonPopupBlock from '~/components/common/popup/CommonPopupBlock.vue';

const navigraphSource = shallowRef<VectorSource | null>(null);
let navigraphLayer: VectorImageLayer<any> | undefined;
let navigraphFakeLayer: VectorImageLayer<any> | undefined;

const store = useStore();

provide('navigraph-source', navigraphSource);

const map = inject<ShallowRef<Map | null>>('map')!;
const mapStore = useMapStore();

type ActiveFeature<T extends keyof NavigraphNavData> = {
    coords: Coordinate;
    type: T;
    data: NavigraphGetData<T>;
    additionalData?: Record<string, any>;
    properties: Record<string, any>;
};

const datetime = new Intl.DateTimeFormat(['ru-RU'], {
    hourCycle: store.user?.settings.timeFormat === '12h' ? 'h12' : 'h23',
    day: '2-digit',
    year: 'numeric',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
});

interface NatFeature {
    coords: Coordinate;
    type: 'nat';
    data: VatsimNattrakClient;
    additionalData?: Record<string, any>;
    properties: Record<string, any>;
}

const activeFeature: Ref<ActiveFeature<keyof NavigraphNavData> | NatFeature | null> = ref(null);

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

function isNat(activeFeature: ActiveFeature<any>): activeFeature is NatFeature {
    return activeFeature.type === 'nat';
}

const ndbStyle = new Icon({
    src: '/icons/compressed/ndb.png',
    width: 16,
    color: `rgb(${ getCurrentThemeRgbColor('lightgray125').join(',') })`,
    opacity: 0.6,
});

const vordmeStyle = new Icon({
    src: '/icons/compressed/vordme.png',
    width: 16,
    color: `rgb(${ getCurrentThemeRgbColor('lightgray125').join(',') })`,
    opacity: 0.6,
});

const ndbStyleSmall = new Icon({
    src: '/icons/compressed/ndb.png',
    width: 12,
    color: `rgb(${ getCurrentThemeRgbColor('lightgray125').join(',') })`,
    opacity: 0.6,
});

const vordmeStyleSmall = new Icon({
    src: '/icons/compressed/vordme.png',
    width: 12,
    color: `rgb(${ getCurrentThemeRgbColor('lightgray125').join(',') })`,
    opacity: 0.6,
});

const fakeCircle = new CircleStyle({
    radius: 1,
    fill: new Fill({ color: 'rgba(0,0,0,0)' }),
});

const showAirwaysLabels = computed(() => store.mapSettings.navigraphData?.airways?.showAirwaysLabel !== false);
const showWaypointsLabels = computed(() => store.mapSettings.navigraphData?.airways?.showWaypointsLabel !== false);

watch([showAirwaysLabels, showWaypointsLabels], () => navigraphSource.value?.changed());

async function handleMapClick(event: MapBrowserEvent<any>) {
    const features = map.value?.getFeaturesAtPixel(event.pixel, { hitTolerance: 21, layerFilter: val => val === navigraphLayer || val === navigraphFakeLayer });

    if (!features?.length) return activeFeature.value = null;

    const feature = features[0];
    const properties = feature.getProperties();

    if (properties.kind === 'nat') {
        activeFeature.value = {
            coords: event.coordinate,
            type: 'nat',
            // @ts-expect-error Dynamic type
            data: properties,
            additionalData: {},
            properties: {},
        };

        return;
    }

    if (!properties.type.endsWith('waypoint') && properties.key) {
        activeFeature.value = null;
        await sleep(0);
        const data = await getNavigraphData({
            data: properties.type.replace('enroute-', ''),
            key: properties.key,
        });
        mapStore.openOverlayId = null;
        await nextTick();
        activeFeature.value = {
            coords: event.coordinate,
            type: properties.type.replace('enroute-', '') as keyof NavigraphNavData,
            data,
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

        const waypointsTypes = {
            default: new Style({
                image: new Icon({
                    src: '/icons/compressed/compulsory-rep.png',
                    color: `rgb(${ getCurrentThemeRgbColor('lightgray125').join(',') })`,
                    width: 8,
                    opacity: 0.6,
                }),
                zIndex: 6,
            }),
            flyOver: new Style({
                image: new Icon({
                    src: '/icons/compressed/fly-over.png',
                    color: `rgb(${ getCurrentThemeRgbColor('lightgray125').join(',') })`,
                    width: 12,
                    opacity: 0.8,
                }),
                zIndex: 6,
            }),
            flyBy: new Style({
                image: new Icon({
                    src: '/icons/compressed/fly-by.png',
                    color: `rgb(${ getCurrentThemeRgbColor('lightgray125').join(',') })`,
                    width: 10,
                    opacity: 1,
                }),
                zIndex: 6,
            }),
            onRequest: new Style({
                image: new Icon({
                    src: '/icons/compressed/on-request.png',
                    color: `rgb(${ getCurrentThemeRgbColor('lightgray125').join(',') })`,
                    width: 8,
                    opacity: 0.6,
                }),
                zIndex: 6,
            }),
            compulsoryFlyBy: new Style({
                image: new Icon({
                    src: '/icons/compressed/compulsory-fly-by.png',
                    color: `rgb(${ getCurrentThemeRgbColor('lightgray125').join(',') })`,
                    width: 12,
                    opacity: 0.8,
                }),
                zIndex: 6,
            }),
            approachFix: new Style({
                image: new Icon({
                    src: '/icons/compressed/final-approach-fix.png',
                    color: `rgb(${ getCurrentThemeRgbColor('lightgray125').join(',') })`,
                    width: 12,
                    opacity: 0.8,
                }),
                zIndex: 6,
            }),
        };

        const waypointStroke = new Stroke({
            color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.2)`,
            width: 2,
        });


        const holdingStroke = new Stroke({
            color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.2)`,
            width: 2,
        });

        const waypointBlueStroke = new Stroke({
            color: `rgba(${ getCurrentThemeRgbColor('primary300').join(',') }, 0.3)`,
            width: 2,
        });

        const enrouteStroke = new Stroke({
            color: `rgba(${ getCurrentThemeRgbColor('primary500').join(',') }, 0.5)`,
            width: 4,
        });

        const enrouteSidStroke = new Stroke({
            color: `rgba(${ getCurrentThemeRgbColor('info500').join(',') }, 0.5)`,
            width: 4,
        });

        const sidStroke = new Stroke({
            color: `rgba(${ getCurrentThemeRgbColor('info500').join(',') }, 0.5)`,
            width: 5,
        });

        const enrouteStarStroke = new Stroke({
            color: `rgba(${ getCurrentThemeRgbColor('success400').join(',') }, 0.5)`,
            width: 4,
        });

        const starStroke = new Stroke({
            color: `rgba(${ getCurrentThemeRgbColor('success400').join(',') }, 0.5)`,
            width: 5,
        });

        const enrouteApproachStroke = new Stroke({
            color: `rgba(${ getCurrentThemeRgbColor('warning600').join(',') }, 0.5)`,
            width: 4,
        });

        const approachStroke = new Stroke({
            color: `rgba(${ getCurrentThemeRgbColor('warning600').join(',') }, 0.5)`,
            width: 5,
        });

        const missApproachStroke = new Stroke({
            color: `rgba(${ getCurrentThemeRgbColor('warning600').join(',') }, 0.5)`,
            width: 3,
            lineJoin: 'round',
            lineDash: [6, 12],
        });

        const strokesCache = {
            self: {} as Record<string, Stroke>,
            currentFlight: {} as Record<string, Stroke>,
        };

        const westTrack = new Style({
            zIndex: 5,
            text: new Text({
                font: '15px Montserrat',
                text: `←`,
                placement: 'line',
                keepUpright: true,
                justify: 'center',
                declutterMode: 'none',
                rotateWithView: false,
                fill: new Fill({
                    color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.7)`,
                }),
            }),
        });

        const eastTrack = new Style({
            zIndex: 5,
            text: new Text({
                font: '15px Montserrat',
                text: `→`,
                placement: 'line',
                keepUpright: true,
                justify: 'center',
                declutterMode: 'none',
                rotateWithView: false,
                fill: new Fill({
                    color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.7)`,
                }),
            }),
        });

        function getStyle(feature: FeatureLike, fake: boolean): (Style | Array<Style> | undefined) {
            const properties = feature.getProperties();

            const isEnroute = properties.type.startsWith('enroute');

            if (properties.type.endsWith('vhf')) {
                const text = !properties.type.startsWith('enroute') && properties.name ? `${ properties.name }\nVORDME ${ properties.frequency } ${ properties.ident }` : properties.identifier;

                return [
                    new Style({
                        image: fake ? fakeCircle : isEnroute ? vordmeStyleSmall : vordmeStyle,
                        zIndex: 7,
                    }),
                    new Style({
                        text: new Text({
                            font: '8px Montserrat',
                            text,
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

            if (properties.type.endsWith('ndb')) {
                const text = !properties.type.startsWith('enroute') && properties.name ? `${ properties.name }\nNDB ${ properties.frequency } ${ properties.ident }` : properties.identifier;

                return [
                    new Style({
                        image: fake ? fakeCircle : isEnroute ? ndbStyleSmall : ndbStyle,
                        zIndex: 7,
                    }),
                    new Style({
                        text: new Text({
                            font: '8px Montserrat',
                            text,
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
                let text = `${ properties.waypoint }`;
                let zIndex = 6;

                if (properties.altitude || properties.speedLimit) {
                    if (properties.altitude) {
                        text += '\n';
                        zIndex = 7;

                        switch (properties.altitude) {
                            case 'between':
                                text += `–${ properties.altitude1 } / +${ properties.altitude2 }`;
                                break;
                            case 'equals':
                                text += `${ properties.altitude1 }`;
                                break;
                            case 'above':
                                text += `+${ properties.altitude1 }`;
                                break;
                            case 'below':
                                text += `-${ properties.altitude1 }`;
                                break;
                        }
                    }

                    if (properties.speed) {
                        text += '\n';
                        zIndex = 7;

                        switch (properties.speed) {
                            case 'equals':
                                text += `AT ${ properties.speedLimit } KT`;
                                break;
                            case 'above':
                                text += `MIN ${ properties.speedLimit } KT`;
                                break;
                            case 'below':
                                text += `MAX ${ properties.speedLimit } KT`;
                                break;
                        }
                    }
                }

                let image = waypointsTypes.default;

                if (properties.usage) {
                    if (properties.usage[0] === 'W' && properties.usage[2]?.trim()) {
                        image = waypointsTypes.compulsoryFlyBy;
                    }
                    else if (properties.usage[0] === 'W') {
                        image = waypointsTypes.flyBy;
                    }
                    else if (properties.usage[0] === 'R') {
                        image = waypointsTypes.onRequest;
                    }
                }

                if (properties.description) {
                    if (properties.description[0] === 'R') {
                        image = waypointsTypes.onRequest;
                    }

                    if (properties.description[1] === 'Y') {
                        image = waypointsTypes.flyOver;
                    }

                    if (properties.description[2] === 'C' || properties.description[0] === 'V') {
                        image = waypointsTypes.compulsoryFlyBy;
                    }

                    if (properties.description[3] === 'E' || properties.description[3] === 'F') {
                        image = waypointsTypes.approachFix;
                    }
                }

                const styles = [
                    image,
                    new Style({
                        text: showWaypointsLabels.value || properties.type === 'waypoint'
                            ? new Text({
                                font: '8px Montserrat',
                                text,
                                offsetX: 12,
                                textBaseline: 'middle',
                                textAlign: 'left',
                                justify: 'left',
                                padding: [2, 2, 2, 2],
                                fill: new Fill({
                                    color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.8)`,
                                }),
                            })
                            : undefined,
                        zIndex,
                    }),
                ];

                return styles;
            }

            if (properties.type === 'airways') {
                let stroke = properties.flightLevel === 'L' ? waypointStroke : waypointBlueStroke;

                if (properties.kind) {
                    stroke = enrouteStroke;
                    if (properties.kind === 'sids') stroke = enrouteSidStroke;
                    if (properties.kind === 'stars') stroke = enrouteStarStroke;
                    if (properties.kind === 'approaches') stroke = enrouteApproachStroke;
                    if (properties.kind === 'missedApproach') stroke = missApproachStroke;

                    let selfSuffix = '';
                    const kind = properties.kind ?? 'default';

                    if (properties.self) {
                        strokesCache.self[kind] ||= new Stroke({
                            color: stroke.getColor(),
                            width: stroke.getWidth(),
                            lineDash: [4, 8],
                            lineJoin: 'round',
                        });

                        stroke = strokesCache.self[kind];

                        properties.kind = 'self';
                        selfSuffix = 'self';
                    }

                    if (properties.currentFlight) {
                        strokesCache.currentFlight[kind + selfSuffix] ||= new Stroke({
                            color: stroke.getColor(),
                            width: stroke.getWidth()! + 2,
                            lineDash: stroke.getLineDash()!,
                            lineJoin: stroke.getLineJoin(),
                        });

                        stroke = strokesCache.currentFlight[kind + selfSuffix];
                    }
                }

                const style = [
                    new Style({
                        stroke,
                        zIndex: 5,
                        text: showAirwaysLabels.value
                            ? new Text({
                                font: 'bold 10px Montserrat',
                                text: `${ properties.identifier }`,
                                placement: 'line',
                                keepUpright: true,
                                textBaseline: properties.kind === 'nat' ? 'bottom' : undefined,
                                offsetY: -4,
                                justify: 'center',
                                padding: [6, 6, 6, 6],
                                rotateWithView: false,
                                fill: new Fill({
                                    color: properties.kind === 'nat' ? `rgba(${ getCurrentThemeRgbColor('primary500').join(',') }, 0.7)` : `rgba(${ getCurrentThemeRgbColor('primary300').join(',') }, 0.7)`,
                                }),
                            })
                            : undefined,
                    }),
                ];

                if (properties.kind === 'nat' && properties.direction) {
                    style.push(properties.direction === 'west' ? westTrack : eastTrack);
                }

                return style;
            }

            if (properties.type === 'holdings') {
                return new Style({
                    stroke: holdingStroke,
                    zIndex: 5,
                    text: new Text({
                        font: 'bold 10px Montserrat',
                        text: `${ properties.course }° ${ properties.turns }`,
                        maxAngle: 0,
                        placement: 'line',
                        textBaseline: 'bottom',
                        keepUpright: true,
                        padding: [2, 2, 2, 2],
                        fill: new Fill({
                            color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.8)`,
                        }),
                    }),
                });
            }

            if (properties.type === 'enroute') {
                if (properties.procedure === 'sid') {
                    return new Style({
                        text: properties.name && new Text({
                            font: '7px Montserrat',
                            text: `${ properties.name }`,
                            textBaseline: 'middle',
                            padding: [2, 2, 2, 2],
                            textAlign: 'center',
                            placement: 'line',
                            justify: 'center',
                            fill: new Fill({
                                color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, ${ fake ? 0 : 0.8 })`,
                            }),
                        }),
                        stroke: sidStroke,
                        zIndex: 3,
                    });
                }

                if (properties.procedure === 'star') {
                    return new Style({
                        text: properties.name && new Text({
                            font: '7px Montserrat',
                            text: `${ properties.name }`,
                            textBaseline: 'middle',
                            padding: [2, 2, 2, 2],
                            textAlign: 'center',
                            placement: 'line',
                            justify: 'center',
                            fill: new Fill({
                                color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, ${ fake ? 0 : 0.8 })`,
                            }),
                        }),
                        stroke: starStroke,
                        zIndex: 3,
                    });
                }

                if (properties.procedure === 'approaches') {
                    return new Style({
                        stroke: approachStroke,
                        zIndex: 3,
                    });
                }

                if (properties.procedure === 'missedApproach') {
                    return new Style({
                        stroke: missApproachStroke,
                        zIndex: 3,
                    });
                }
            }
        }

        navigraphFakeLayer = new VectorImageLayer<any>({
            source: navigraphSource.value,
            zIndex: 6,
            // minZoom: 5,
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
            // minZoom: 5,
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
        map.value?.on('singleclick', handleMapClick);
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
    map.value?.un('singleclick', handleMapClick);
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

    &--type-nat {
        width: 300px;

        .layers__nat {
            width: 100%;
        }
    }

    @include mobileOnly {
        max-width: calc(100dvw - 48px);
    }
}
</style>
