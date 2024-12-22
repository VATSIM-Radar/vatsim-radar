<template>
    <slot v-if="isPrimaryAirport"/>
    <template v-else>
        <map-overlay
            v-if="localAtc.length && 'lon' in airport && !isPseudoAirport"
            :active-z-index="21"
            persistent
            :popup="!!hoveredFacility"
            :settings="{ position: [airport.lon, airport.lat], positioning: 'center-center', stopEvent: hoveredController && facilityScroll }"
            :z-index="15"
            @update:popup="!$event ? hoveredFacility = false : undefined"
        >
            <div
                class="airport"
                :style="{ '--color': getAirportColor, '--opacity': store.mapSettings.colors?.[store.getCurrentTheme]?.staffedAirport ?? 1 }"
                @click="mapStore.addAirportOverlay(airport.icao)"
                @mouseleave="hoveredFacility = false"
            >
                <div
                    class="airport_title"
                    @mouseover="!isMobileOrTablet && (hoveredFacility = true)"
                >
                    {{ airportName }}
                </div>
                <div
                    v-if="!store.mapSettings.visibility?.atcLabels && !isHideAtcType('ground') && (!store.mapSettings.hideATISOnly || localsFacilities.some(x => x.facility !== -1))"
                    class="airport_facilities"
                >
                    <div
                        v-for="local in localsFacilities"
                        :key="local.facility"
                        class="airport_facilities_facility"
                        :class="{ 'airport_facilities_facility--hovered': hoveredFacility === local.facility }"
                        :style="{ background: getControllerPositionColor(local.atc[0]) }"
                        @click.stop="hoveredFacility = local.facility"
                        @mouseover="hoveredFacility = local.facility"
                    >
                        {{
                            local.facility === -1 ? 'A' : dataStore.vatsim.data.facilities.value.find(x => x.id === local.facility)?.short.slice(0, 1)
                        }}
                    </div>
                </div>
                <common-controller-info
                    v-if="hoveredFacility && mapStore.canShowOverlay"
                    ref="atcPopup"
                    absolute
                    class="airport_atc-popup"
                    :class="{ 'airport_atc-popup--all': hoveredFacility === true }"
                    :controllers="hoveredFacilities"
                    :show-atis="hoveredFacility !== true"
                    :show-facility="hoveredFacility === true"
                    @click.stop
                    @mouseleave="hoveredController = false"
                    @mouseover="hoveredController = true"
                >
                    <template #title>
                        {{ airport.name }}
                        <template v-if="hoveredFacility === true">
                            Controllers
                        </template>
                        <template v-else>
                            {{
                                hoveredFacility === -2 ? 'ATIS' : dataStore.vatsim.data.facilities.value.find(x => x.id === hoveredFacility)?.long
                            }}
                        </template>
                    </template>
                </common-controller-info>
            </div>
        </map-overlay>
        <map-airport-counts
            v-if="'lon' in airport && !isPseudoAirport"
            :aircraft="aircraft"
            :airport="airport"
            class="airport__square"
            :hide="!isVisible"
            :offset="localAtc.length ? [localATCOffsetX, 0] : [25, 'isIata' in props.airport && props.airport.isIata ? -30 : -10]"
        />
        <map-overlay
            v-if="!localAtc.length && 'lon' in airport && !isPseudoAirport && isVisible"
            class="airport__square"
            persistent
            :settings="{ position: [airport.lon, airport.lat], offset: [0, -7], positioning: 'top-center', stopEvent: !!hoveredFacility }"
            :z-index="14"
        >
            <div
                class="airport-square"
                @click="mapStore.addAirportOverlay(airport.icao)"
            >
                <div
                    class="airport-square_self"
                    :style="{ '--color': getAirportColor }"
                />
            </div>
        </map-overlay>
        <map-overlay
            v-if="hoveredFeature && !hoveredFacility"
            model-value
            :settings="{ position: hoveredPixel!, positioning: 'top-center', stopEvent: approachScroll }"
            :z-index="21"
            @mouseleave="$emit('manualHide')"
            @mouseover="$emit('manualHover')"
        >
            <common-controller-info
                ref="approachPopup"
                :controllers="hoveredFeature.controllers"
                show-atis
            >
                <template #title>
                    {{
                        hoveredFeature.feature.getProperties()?.name ?? `${ 'name' in airport ? airport.name : airport.icao } Approach/Departure`
                    }}
                </template>
            </common-controller-info>
        </map-overlay>
    </template>
</template>

<script setup lang="ts">
import type { VatSpyData, VatSpyDataLocalATC } from '~/types/data/vatspy';
import type { PropType, ShallowRef } from 'vue';
import type { MapAircraft } from '~/types/map';
import { Feature } from 'ol';
import type VectorSource from 'ol/source/Vector';
import { Circle, Point } from 'ol/geom';
import { Fill, Stroke, Style, Text } from 'ol/style';
import { fromCircle } from 'ol/geom/Polygon';
import type { VatsimShortenedController } from '~/types/data/vatsim';
import { sortControllersByPosition } from '~/composables/atc';
import MapAirportCounts from '~/components/map/airports/MapAirportCounts.vue';
import type { NavigraphAirportData, NavigraphLayoutType } from '~/types/data/navigraph';
import { useMapStore } from '~/store/map';
import { getCurrentThemeRgbColor, useScrollExists } from '~/composables';
import type { Coordinate } from 'ol/coordinate';
import type { AirportTraconFeature } from '~/components/map/airports/MapAirportsList.vue';
import { useStore } from '~/store';
import MapOverlay from '~/components/map/MapOverlay.vue';
import CommonControllerInfo from '~/components/common/vatsim/CommonControllerInfo.vue';
import { GeoJSON } from 'ol/format';
import type { GeoJSONFeature } from 'ol/format/GeoJSON';
import { toRadians } from 'ol/math';
import { fromLonLat } from 'ol/proj';
import { getSelectedColorFromSettings } from '~/composables/colors';

const props = defineProps({
    airport: {
        type: Object as PropType<VatSpyData['airports'][0] | VatSpyDataLocalATC['airport']>,
        required: true,
    },
    aircraft: {
        type: Object as PropType<MapAircraft>,
        required: true,
    },
    navigraphData: {
        type: Object as PropType<NavigraphAirportData | undefined>,
    },
    isVisible: {
        type: Boolean,
        default: false,
    },
    localAtc: {
        type: Array as PropType<VatsimShortenedController[]>,
        required: true,
    },
    arrAtc: {
        type: Array as PropType<VatsimShortenedController[]>,
        required: true,
    },
    features: {
        type: Array as PropType<AirportTraconFeature[]>,
        required: true,
    },
    isHoveredAirport: {
        type: Boolean,
        default: false,
    },
    hoveredId: {
        type: String as PropType<string | null>,
        default: null,
    },
    hoveredPixel: {
        type: Array as PropType<Coordinate | null>,
        default: null,
    },
});

defineEmits({
    manualHover() {
        return true;
    },
    manualHide() {
        return true;
    },
});

defineSlots<{ default: () => any }>();

const store = useStore();
const dataStore = useDataStore();
const mapStore = useMapStore();
const vectorSource = inject<ShallowRef<VectorSource | null>>('vector-source')!;
const airportsSource = inject<ShallowRef<VectorSource | null>>('airports-source')!;
const layerSource = inject<ShallowRef<VectorSource | null>>('layer-source')!;
const atcPopup = ref<{ $el: HTMLDivElement } | null>(null);
const approachPopup = ref<{ $el: HTMLDivElement } | null>(null);
const hoveredFacility = ref<boolean | number>(false);
const hoveredController = ref<boolean>(false);
const isMobileOrTablet = useIsMobileOrTablet();

const facilityScroll = useScrollExists(computed(() => {
    return atcPopup.value?.$el.querySelector('.atc-popup_list');
}));

const approachScroll = useScrollExists(computed(() => {
    return approachPopup.value?.$el.querySelector('.atc-popup_list');
}));

const hoveredFacilities = computed(() => {
    if (!hoveredFacility.value) return [];
    if (hoveredFacility.value === true) return localsFacilities.value.flatMap(x => x.atc);
    return localsFacilities.value.find(x => x.facility === hoveredFacility.value)?.atc ?? [];
});

const localATCOffsetX = computed(() => {
    const offset = (localsFacilities.value.length * 14) + 10;
    if (offset < 30) return 30;
    return (offset / 2) + 5;
});

const isPseudoAirport = computed(() => {
    return !('lon' in props.airport) || props.airport?.isPseudo;
});

const getAirportColor = computed(() => {
    const opacity = store.mapSettings.colors?.[store.getCurrentTheme]?.defaultAirport;
    const hasOverlay = mapStore.overlays.some(x => x.type === 'pilot' && (x.data.pilot.airport === props.airport.icao || x.data.pilot.flight_plan?.departure === props.airport.icao || x.data.pilot.flight_plan?.arrival === props.airport.icao));

    if (!hasOverlay) {
        if (!props.localAtc?.length) return `rgba(${ getCurrentThemeRgbColor('lightgray200').join(',') }, ${ opacity ?? 0.7 })`;
        return radarColors.lightgray150;
    }

    if (!props.localAtc?.length) return `rgba(${ radarColors.warning700Rgb.join(',') }, ${ opacity ?? 0.8 })`;
    return radarColors.warning700;
});

const localsFacilities = computed(() => {
    const facilities: { facility: number; atc: VatsimShortenedController[] }[] = [];

    for (const local of props.localAtc) {
        const existingFacility = facilities.find(x => x.facility === (local.isATIS ? -1 : local.facility));
        if (!existingFacility) {
            facilities.push({
                facility: local.isATIS ? -1 : local.facility,
                atc: [local],
            });
            continue;
        }

        existingFacility.atc.push(local);
    }

    return sortControllersByPosition(facilities);
});

let feature: Feature | null = null;
let hoverFeature: Feature | null = null;

interface ArrFeature {
    id: string;
    controllers: VatsimShortenedController[];
    feature: Feature;
    traconFeature?: GeoJSONFeature;
}

const arrFeatures = shallowRef<ArrFeature[]>([]);
let gatesFeatures: Feature[] = [];
let layoutFeatures: Feature[] = [];
let runwaysFeatures: Feature[] = [];

const airportName = computed(() => (props.airport.isPseudo && props.airport.iata) ? props.airport.iata : props.airport.icao);
const hoveredFeature = computed(() => arrFeatures.value.find(x => x.id === props.hoveredId));

function initAirport() {
    if (!('lon' in props.airport) || isPseudoAirport.value) return;
    feature = new Feature({
        geometry: new Point([props.airport.lon, props.airport.lat + (props.airport.isIata ? 300 : 0)]),
        type: 'airport',
        icao: props.airport.icao,
    });

    feature.setStyle(new Style({
        text: new Text({
            font: '12px Montserrat',
            text: airportName.value,
            offsetY: -10,
            fill: new Fill({
                color: getAirportColor.value,
            }),
        }),
    }));

    airportsSource.value?.addFeature(feature);
}

watch(getAirportColor, () => {
    if (!feature) return;

    feature.setStyle(new Style({
        text: new Text({
            font: '12px Montserrat',
            text: airportName.value,
            offsetY: -10,
            fill: new Fill({
                color: getAirportColor.value,
            }),
        }),
    }));
});

const geojson = new GeoJSON();

watch(hoveredFeature, val => {
    if (!val?.traconFeature && hoverFeature) {
        vectorSource.value?.removeFeature(hoverFeature);
        hoverFeature.dispose();
        hoverFeature = null;
    }
    else if (val?.traconFeature && !hoverFeature) {
        hoverFeature = geojson.readFeature(val.traconFeature) as Feature<any>;
        hoverFeature?.setProperties({
            ...hoverFeature?.getProperties(),
            type: 'background',
        });
        hoverFeature!.setStyle(new Style({
            fill: new Fill({
                color: `rgba(${ getSelectedColorFromSettings('approach', true) || radarColors.error300Rgb.join(',') }, 0.25)`,
            }),
            stroke: new Stroke({
                color: `transparent`,
            }),
        }));
        vectorSource.value?.addFeature(hoverFeature!);
    }
});

function setBorderFeatureStyle(feature: Feature) {
    feature.setStyle(new Style({
        stroke: new Stroke({
            color: getSelectedColorFromSettings('approach') || `rgba(${ radarColors.error300Rgb.join(',') }, 0.7)`,
            width: 2,
        }),
    }));
}

function setLabelFeatureStyle(feature: Feature) {
    const style = [
        new Style({
            text: new Text({
                font: 'bold 10px Montserrat',
                text: feature.getProperties()?._traconId || airportName.value,
                placement: 'point',
                overflow: true,
                fill: new Fill({
                    color: getSelectedColorFromSettings('approach') || radarColors.error400Hex,
                }),
                backgroundFill: new Fill({
                    color: getCurrentThemeHexColor('darkgray900'),
                }),
                backgroundStroke: new Stroke({
                    width: 2,
                    color: getSelectedColorFromSettings('approach') || radarColors.error400Hex,
                }),
                padding: [3, 1, 2, 3],
            }),
        }),
    ];

    feature.setStyle(style);
}

function clearArrFeatures() {
    for (const { feature } of arrFeatures.value) {
        vectorSource.value?.removeFeature(feature);
        feature.dispose();
    }

    arrFeatures.value = [];
}

const isPrimaryAirport = computed(() => store.config.airport === props.airport.icao && !store.config.showInfoForPrimaryAirport);

onMounted(async () => {
    const localsLength = computed(() => props.localAtc.length);

    const arrAtcLocal = shallowRef(new Set<number>());
    const gates = computed(() => props.navigraphData?.gates);
    const layout = computed(() => props.navigraphData?.layout);
    const runways = computed(() => props.navigraphData?.runways);

    watch(localsLength, val => {
        if (isPrimaryAirport.value) return;

        if (!val && !feature) {
            return initAirport();
        }
        else if (val && feature) {
            airportsSource.value?.removeFeature(feature);
            feature.dispose();
            feature = null;
        }
    }, {
        immediate: true,
    });

    function initAndUpdateData(force = false) {
        if (!props.arrAtc?.length || isPrimaryAirport.value || isHideAtcType('approach')) {
            clearArrFeatures();
            arrAtcLocal.value.clear();

            return;
        }

        if (!force && props.arrAtc.every(x => arrAtcLocal.value.has(x.cid)) && [...arrAtcLocal.value].every(x => props.arrAtc.some(y => y.cid === x))) return;
        arrAtcLocal.value = new Set<number>(props.arrAtc.map(x => x.cid));
        clearArrFeatures();

        const features: ArrFeature[] = [];

        if (!props.features.length && 'lon' in props.airport && !isPseudoAirport.value) {
            const borderFeature = new Feature({
                geometry: fromCircle(new Circle([props.airport.lon, props.airport.lat], 80000), undefined, toRadians(-90)),
                icao: props.airport.icao,
                iata: props.airport.iata,
                id: 'circle',
                type: 'circle',
            });

            setBorderFeatureStyle(borderFeature);

            features.push({
                id: 'circle',
                feature: borderFeature,
                controllers: props.arrAtc,
            });


            if (!store.mapSettings.visibility?.atcLabels) {
                const feature = borderFeature;
                const geometry = feature.getGeometry();
                const extent = feature.getGeometry()?.getExtent();
                const topCoord = [extent![0], extent![3]];
                let textCoord = geometry?.getClosestPoint(topCoord) || topCoord;
                if (feature.getProperties().label_lat) {
                    textCoord = fromLonLat([feature.getProperties().label_lon, feature.getProperties().label_lat]);
                }

                const labelFeature = new Feature({
                    geometry: new Point(textCoord),
                    type: 'tracon-label',
                    icao: props.airport.icao,
                    iata: props.airport.iata,
                    id: 'circle',
                });

                setLabelFeatureStyle(labelFeature);

                features.push({
                    id: 'circle',
                    feature: labelFeature,
                    controllers: props.arrAtc,
                });
            }
        }
        else {
            const leftAtc = props.arrAtc.filter(x => !props.features.some(y => y.controllers.some(y => y.cid === x.cid)));

            for (const {
                id,
                traconFeature,
                controllers,
            } of props.features) {
                const borderFeature = geojson.readFeature(traconFeature) as Feature<any>;

                borderFeature.setProperties({
                    ...(borderFeature?.getProperties() ?? {}),
                    icao: props.airport.icao,
                    iata: props.airport.iata,
                    type: 'tracon',
                    _traconId: traconFeature.properties?.id,
                    id,
                });

                setBorderFeatureStyle(borderFeature);

                features.push({
                    id,
                    feature: borderFeature,
                    traconFeature,
                    controllers: [
                        ...controllers,
                        ...leftAtc,
                    ],
                });


                if (!store.mapSettings.visibility?.atcLabels) {
                    const feature = borderFeature;
                    const geometry = feature.getGeometry();
                    const extent = feature.getGeometry()?.getExtent();
                    const topCoord = [extent![0], extent![3]];
                    let textCoord = geometry?.getClosestPoint(topCoord) || topCoord;
                    if (feature.getProperties().label_lat) {
                        textCoord = fromLonLat([feature.getProperties().label_lon, feature.getProperties().label_lat]);
                    }

                    const labelFeature = new Feature({
                        geometry: new Point(textCoord),
                        type: 'tracon-label',
                        icao: props.airport.icao,
                        iata: props.airport.iata,
                        _traconId: traconFeature.properties?.id,
                        id,
                    });

                    setLabelFeatureStyle(labelFeature);

                    features.push({
                        id,
                        feature: labelFeature,
                        traconFeature,
                        controllers: [
                            ...controllers,
                            ...leftAtc,
                        ],
                    });
                }
            }
        }

        arrFeatures.value = features;

        for (const { feature } of features) {
            vectorSource.value?.addFeature(feature);
        }
    }

    watch(dataStore.vatsim.updateTimestamp, () => initAndUpdateData(), {
        immediate: true,
    });

    watch(() => String(store.mapSettings.visibility?.atcLabels) + JSON.stringify(store.mapSettings.visibility?.atc), () => {
        initAndUpdateData(true);
        triggerRef(localsLength);
    });

    watch(gates, val => {
        if (!val?.length) {
            gatesFeatures.forEach(feature => {
                vectorSource.value?.removeFeature(feature);
                feature.dispose();
            });
            gatesFeatures = [];
            return;
        }

        for (const gate of gatesFeatures) {
            if (!gates.value?.find(x => x.gate_identifier === gate.getProperties().identifier)) {
                vectorSource.value?.removeFeature(gate);
                gate.dispose();
            }
        }

        gatesFeatures = gatesFeatures.filter(x => gates.value?.some(y => y.gate_identifier === x.getProperties().identifier));

        for (const gate of gates.value ?? []) {
            const opacitySetting = store.mapSettings.colors?.[store.getCurrentTheme]?.gates;

            const color = gate.trulyOccupied ? `rgba(${ getCurrentThemeRgbColor('error500').join(',') }, ${ opacitySetting ?? 0.8 })` : gate.maybeOccupied ? `rgba(${ getCurrentThemeRgbColor('warning400').join(',') }, ${ opacitySetting ?? 0.8 })` : `rgba(${ getCurrentThemeRgbColor('success500').join(',') }, ${ opacitySetting ?? 1 })`;

            const existingFeature = gatesFeatures.find(x => x.getProperties().identifier === gate.gate_identifier);
            if (existingFeature) {
                const style = existingFeature.getStyle() as Style;
                if (style.getText()?.getFill()?.getColor() !== color) {
                    existingFeature.setStyle(new Style({
                        text: new Text({
                            font: '12px Montserrat',
                            text: gate.name || gate.gate_identifier,
                            textAlign: 'center',
                            fill: new Fill({
                                color,
                            }),
                            backgroundFill: new Fill({
                                color: `rgb(${ getCurrentThemeRgbColor('darkgray950').join(',') }, 0.5)`,
                            }),
                            backgroundStroke: new Stroke({
                                color: `rgb(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.15)`,
                            }),
                            rotation: toRadians(0),
                            padding: [2, 0, 2, 2],
                        }),
                        zIndex: 3,
                    }));
                }
            }
            else {
                const feature = new Feature({
                    geometry: new Point([gate.gate_longitude, gate.gate_latitude]),
                    identifier: gate.gate_identifier,
                });

                feature.setStyle(new Style({
                    text: new Text({
                        font: '12px Montserrat',
                        text: gate.name || gate.gate_identifier,
                        textAlign: 'center',
                        fill: new Fill({
                            color,
                        }),
                        backgroundFill: new Fill({
                            color: `rgb(${ getCurrentThemeRgbColor('darkgray950').join(',') }, 0.8)`,
                        }),
                        backgroundStroke: new Stroke({
                            color: `rgb(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.15)`,
                        }),
                        rotation: toRadians(0),
                        padding: [2, 0, 2, 2],
                    }),
                    zIndex: 3,
                }));
                gatesFeatures.push(feature);
                layerSource.value?.addFeature(feature);
            }
        }
    }, {
        immediate: true,
    });

    const supportedLayouts: NavigraphLayoutType[] = [
        'parkingstandarea',
        'apronelement',
        'arrestinggearlocation',
        'blastpad',
        'constructionarea',
        'deicingarea',
        'finalapproachandtakeoffarea',
        'runwaythreshold',
        'runwaydisplacedarea',
        'runwayelement',
        'runwayexitline',
        'runwayintersection',
        'runwaymarking',
        'runwayshoulder',
        'frequencyarea',
        'serviceroad',
        'standguidanceline',
        'taxiwayelement',
        'taxiwayholdingposition',
        'taxiwayshoulder',
        'verticallinestructure',
        'verticalpolygonalstructure',
        'taxiwayguidanceline',
    ];

    watch(layout, val => {
        if (!val) {
            layoutFeatures.forEach(feature => {
                layerSource.value?.removeFeature(feature);
                feature.dispose();
            });
            layoutFeatures = [];
            return;
        }

        for (const [_key, value] of Object.entries(val)) {
            const key = _key as NavigraphLayoutType;
            if (!supportedLayouts.includes(key)) continue;

            const features = geojson.readFeatures(value, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857',
            });

            for (const feature of features) {
                feature.setProperties({
                    ...feature.getProperties(),
                    type: key,
                });
                layerSource.value?.addFeature(feature);
                layoutFeatures.push(feature);
            }
        }
    }, {
        immediate: true,
    });

    watch(runways, val => {
        runwaysFeatures.forEach(feature => {
            vectorSource.value?.removeFeature(feature);
            feature.dispose();
        });
        runwaysFeatures = [];

        if (!val?.length) return;

        runwaysFeatures = val.map(feature => {
            const runwayFeature = new Feature({
                geometry: new Point([feature.runway_longitude, feature.runway_latitude]),
            });

            runwayFeature.setStyle(new Style({
                text: new Text({
                    font: 'bold 12px Montserrat',
                    text: feature.runway_identifier.replace('RW', ''),
                    rotation: toRadians(feature.runway_true_bearing),
                    rotateWithView: true,
                    fill: new Fill({
                        color: getSelectedColorFromSettings('runways') || `rgba(${ getCurrentThemeRgbColor('error300').join(',') }, 0.7)`,
                    }),
                }),
            }));
            vectorSource.value?.addFeature(runwayFeature);
            return runwayFeature;
        });
    }, {
        immediate: true,
        deep: true,
    });

    if (isPrimaryAirport.value) {
        const overlay = await mapStore.addAirportOverlay(props.airport.icao);
        if (overlay) {
            overlay.sticky = true;
        }
    }
});

onBeforeUnmount(() => {
    if (feature) {
        airportsSource.value?.removeFeature(feature);
        feature.dispose();
        feature = null;
    }

    if (hoverFeature) {
        vectorSource.value?.removeFeature(hoverFeature);
        hoverFeature.dispose();
        hoverFeature = null;
    }

    clearArrFeatures();

    gatesFeatures.forEach(feature => {
        vectorSource.value?.removeFeature(feature);
        feature.dispose();
    });
    runwaysFeatures.forEach(feature => {
        vectorSource.value?.removeFeature(feature);
        feature.dispose();
    });
    layoutFeatures.forEach(feature => {
        vectorSource.value?.removeFeature(feature);
        feature.dispose();
    });
});
</script>

<style lang="scss" scoped>
.airport {
    cursor: pointer;

    display: flex;
    flex-direction: column;

    padding: 3px;

    font-size: 10px;
    text-align: center;

    background: varToRgba('darkgray800', 0.5);
    border-radius: 4px;

    &_title, &_facilities {
        user-select: none;
        opacity: var(--opacity);
    }

    &_title {
        cursor: pointer;
        font-weight: 600;
        color: var(--color);
    }

    &_facilities {
        display: flex;
        justify-content: center;

        margin-top: 2px;

        font-weight: 600;
        color: $lightgray0Orig;

        &_facility {
            cursor: pointer;

            display: flex;
            align-items: center;
            justify-content: center;

            width: 14px;
            height: 14px;

            transition: 0.3s;

            &:first-child {
                border-radius: 4px 0 0 4px;
            }

            &:last-child {
                border-radius: 0 4px 4px 0;
            }

            &:only-child {
                border-radius: 4px;
            }

            &--hovered:not(:only-child) {
                transform: scale(1.1);
            }
        }
    }

    &_atc-popup {
        top: 100%;
        align-self: center;

        &--all {
            top: auto;
            bottom: 100%;
        }
    }
}

.airport-square {
    cursor: pointer;

    display: flex;
    align-items: center;
    justify-content: center;

    width: 14px;
    height: 20px;

    &_self {
        width: 4px;
        height: 4px;
        background: var(--color);
        border-radius: 2px;
    }
}
</style>
