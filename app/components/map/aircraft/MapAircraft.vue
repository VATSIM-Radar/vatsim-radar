<template>
    <template v-if="!props.isHovered  || store.mapSettings.heatmapLayer">
        <slot/>
    </template>
    <template v-else>
        <map-overlay
            class="aircraft-overlay"
            :model-value="props.isHovered"
            :settings="{
                position: getCoordinates,
                offset: overlayOffset,
                positioning: overlayPosition,
            }"
            :style="{ '--overlay-width': `${ overlayWidth }px` }"
            :z-index="20"
            @update:overlay="mapStore.openPilotOverlay = !!$event"
        >
            <common-popup-block
                v-if="pilot && !store.isTouch"
                class="aircraft-hover"
                @mouseleave="hoveredOverlay = false"
                @mouseover="handleMouseEnter($event as MouseEvent)"
            >
                <template
                    v-if="!isShortInfo"
                    #title
                >
                    {{ pilot.callsign }}
                </template>
                <template
                    v-if="pilot.aircraft_faa && !isShortInfo"
                    #additionalTitle
                >
                    {{ pilot.aircraft_faa }}
                </template>
                <template
                    v-if="pilot.frequencies.length >= 1 && !isShortInfo"
                    #titleAppend
                >
                    <common-bubble
                        class="aircraft-hover__frequency"
                        type="primary-flat"
                    >
                        {{ pilot.frequencies[0] }}
                    </common-bubble>
                    <common-bubble
                        v-if="pilot.frequencies[1] && store.config.airport"
                        class="aircraft-hover__frequency"
                        type="primary-flat"
                    >
                        {{ pilot.frequencies[1] }}
                    </common-bubble>
                    <common-bubble
                        v-if="pilot.transponder && store.config.airport"
                        class="aircraft-hover__frequency"
                        type="primary-flat"
                    >
                        {{ pilot.transponder }}
                    </common-bubble>
                </template>
                <div class="aircraft-hover_body">
                    <common-info-block v-if="isShortInfo">
                        <template #top>
                            {{pilot.callsign}}
                            <template v-if="pilot.aircraft_faa">
                                - {{pilot.aircraft_faa}}
                            </template>
                            <template v-if="pilot.frequencies.length >= 1 && isShortInfo">
                                - <common-bubble
                                    class="aircraft-hover__frequency"
                                    type="primary-flat"
                                >
                                    {{ pilot.frequencies[0] }}
                                </common-bubble>
                            </template>
                        </template>
                    </common-info-block>
                    <common-info-block
                        class="aircraft-hover__pilot"
                        is-button
                        :top-items="[pilot.name, friend?.comment]"
                        @click="mapStore.addPilotOverlay(aircraft.cid.toString())"
                    >
                        <template #top="{ index,item }">
                            <common-spoiler
                                v-if="index === 0"
                                type="pilot"
                            >
                                <template v-if="!isNaN(Number(pilot.name)) && friend">
                                    {{friend.name}}
                                </template>
                                <template v-else>
                                    {{ parseEncoding(pilot.name) }}
                                </template>
                            </common-spoiler>
                            <template v-else>
                                {{item}}
                            </template>
                        </template>
                        <template
                            v-if="(pilot.pilot_rating !== 0 || pilot.military_rating) && !isShortInfo"
                            #bottom
                        >
                            {{ usePilotRating(pilot).join(' | ') }}
                        </template>
                    </common-info-block>
                    <common-pilot-destination
                        :pilot
                        :short="isShortInfo"
                    />
                    <div class="aircraft-hover_sections">
                        <common-info-block
                            v-if="typeof pilot.groundspeed === 'number'"
                            text-align="center"
                        >
                            <template
                                v-if="!isShortInfo"
                                #top
                            >
                                GS
                            </template>
                            <template #bottom>
                                {{ pilot.groundspeed }} kts
                            </template>
                        </common-info-block>
                        <common-info-block
                            v-if="typeof pilot.altitude === 'number'"
                            text-align="center"
                        >
                            <template
                                v-if="!isShortInfo"
                                #top
                            >
                                Altitude
                            </template>
                            <template #bottom>
                                {{ getPilotTrueAltitude(pilot) }} ft
                            </template>
                        </common-info-block>
                        <common-info-block
                            v-if="typeof getHeading === 'number' && !isShortInfo"
                            text-align="center"
                        >
                            <template
                                #top
                            >
                                Heading
                            </template>
                            <template #bottom>
                                {{ getHeading }}°
                            </template>
                        </common-info-block>
                    </div>
                </div>
            </common-popup-block>
        </map-overlay>
    </template>
</template>

<script setup lang="ts">
import type { PropType, ShallowRef } from 'vue';
import { onMounted } from 'vue';
import type { VatsimMandatoryPilot } from '~/types/data/vatsim';
import type VectorSource from 'ol/source/Vector';
import { Feature } from 'ol';
import { Stroke, Style } from 'ol/style';
import { LineString, MultiLineString, Point } from 'ol/geom';
import type { MapAircraftStatus } from '~/composables/pilots';
import {
    getAircraftStatusColor,
    isPilotOnGround,
    loadAircraftIcon,
    ownFlight,
    usePilotRating,
} from '~/composables/pilots';
import { sleep, turfGeometryToOl } from '~/utils';
import { aircraftIcons } from '~/utils/icons';
import { getPilotTrueAltitude } from '~/utils/shared/vatsim';
import type { StoreOverlayPilot } from '~/store/map';
import { useMapStore } from '~/store/map';
import { useStore } from '~/store';
import { parseEncoding } from '../../../utils/data';
import { getFeatureStyle } from '~/composables';
import MapOverlay from '~/components/map/MapOverlay.vue';
import CommonPopupBlock from '~/components/common/popup/CommonPopupBlock.vue';
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';
import { calculateDistanceInNauticalMiles } from '~/utils/shared/flight';
import { point } from '@turf/helpers';
import greatCircle from '@turf/great-circle';
import type { Feature as GeoFeature, Point as GeoPoint, Position } from 'geojson';
import type { InfluxGeojson, InfluxGeojsonFeatureCollection } from '~/utils/backend/influx/converters';
import CommonBubble from '~/components/common/basic/CommonBubble.vue';
import CommonPilotDestination from '~/components/common/vatsim/CommonPilotDestination.vue';
import CommonSpoiler from '~/components/common/vatsim/CommonSpoiler.vue';
import { useRadarError } from '~/composables/errors';
import type { Positioning } from 'ol/Overlay';
import { getZoomScaleMultiplier } from '~/utils/map/aircraft-scale';

const props = defineProps({
    aircraft: {
        type: Object as PropType<VatsimMandatoryPilot>,
        required: true,
    },
    isHovered: {
        type: Boolean,
        default: false,
    },
    canShowTracks: {
        type: String as PropType<'short' | 'full' | null>,
        default: null,
    },
    isVisible: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits({
    manualHover() {
        return true;
    },
    manualHide() {
        return true;
    },
});

defineSlots<{ default: () => any }>();

const vectorSource = inject<ShallowRef<VectorSource | null>>('vector-source')!;
const linesSource = inject<ShallowRef<VectorSource | null>>('lines-source')!;
const hovered = ref(false);
const hoveredOverlay = ref(false);
const isInit = ref(false);
let feature: Feature | undefined;
let depLine: Feature | undefined;
let arrLine: Feature | undefined;
const lineFeatures = shallowRef<Feature[]>([]);
const store = useStore();
const mapStore = useMapStore();
const dataStore = useDataStore();
const flightPlan = ref('');
const turnsStart = ref('');
const turnsTimestamp = ref('');
const turnsFirstGroupTimestamp = ref('');
const turnsSecondGroupPoint = shallowRef<GeoFeature<GeoPoint> | null>(null);
const turnsFirstGroup = shallowRef<InfluxGeojsonFeatureCollection | null>(null);
const linesUpdateInProgress = ref(false);
const friend = computed(() => store.friends.find(x => x.cid === props.aircraft.cid));

function degreesToRadians(degrees: number) {
    return degrees * (Math.PI / 180);
}

const isShortInfo = computed(() => store.mapSettings.shortAircraftView);


const icon = computed(() => 'icon' in props.aircraft ? aircraftIcons[props.aircraft.icon] : getAircraftIcon(props.aircraft));
const isSelfFlight = computed(() => props.aircraft?.cid === ownFlight.value?.cid);

function checkForExpiredCoordinate() {
    if (dataStore.vatsim.selfCoordinate.value && dataStore.vatsim.localUpdateTime.value - dataStore.vatsim.selfCoordinate.value.date > 1000 * 5) {
        dataStore.vatsim.selfCoordinate.value = null;
        return [props.aircraft.longitude, props.aircraft.latitude];
    }
}

const getCoordinates = computed(() => {
    if (isSelfFlight.value && dataStore.vatsim.selfCoordinate.value) return dataStore.vatsim.selfCoordinate.value.coordinate;
    return [props.aircraft.longitude, props.aircraft.latitude];
});

const getHeading = computed(() => {
    if (isSelfFlight.value && dataStore.vatsim.selfCoordinate.value) return dataStore.vatsim.selfCoordinate.value.heading;
    return props.aircraft.heading;
});

const textCoordinates = computed(() => JSON.stringify(getCoordinates.value) + props.aircraft.longitude + props.aircraft.latitude);

const pilot = computed(() => dataStore.vatsim.data.keyedPilots.value[props.aircraft.cid.toString()]);

const aircraftScale = computed(() => {
    const baseScale = store.mapSettings.aircraftScale ?? 1;
    if (!isDynamicAircraftScale.value || !pilot.value) return baseScale;

    const iconWidth = radarIcons[icon.value.icon].width;
    const lat = getCoordinates.value?.[1];
    const pilotStatus = pilot.value.status;
    const isPilotOnGround = pilotStatus === 'depGate' || pilotStatus === 'depTaxi' || pilotStatus === 'arrTaxi' || pilotStatus === 'arrGate';

    return +(baseScale * getZoomScaleMultiplier({ zoom: mapStore.zoom, baseScale, iconPixelWidth: iconWidth, latitude: lat, isPilotOnGround })).toFixed(3);
});

const getStatus = computed<MapAircraftStatus>(() => {
    if (isSelfFlight.value || store.config.allAircraftGreen) return 'green';
    if (props.isHovered) return 'hover';

    const isEmergency = store.mapSettings.highlightEmergency && (pilot.value?.transponder === '7700' || pilot.value?.transponder === '7600' || pilot.value?.transponder === '7601' || pilot.value?.transponder === '7500');

    if (isEmergency) {
        return 'landed';
    }

    // color aircraft icon based on departure/arrival when the airport dashboard is in use
    if (store.config.airport && !activeCurrentOverlay.value) {
        const vatAirport = dataStore.vatsim.data.airports.value.find(x => x.icao === store.config.airport);
        if (vatAirport?.aircraft.groundDep?.includes(props.aircraft.cid)) return 'departing';
        if (vatAirport?.aircraft.departures?.includes(props.aircraft.cid)) return 'default';
        if (vatAirport?.aircraft.groundArr?.includes(props.aircraft.cid)) return 'landed';
        if (vatAirport?.aircraft.arrivals?.includes(props.aircraft.cid)) return 'arriving';
    }

    if (activeCurrentOverlay.value || (airportOverlayTracks.value && !isOnGround.value)) return 'active';

    return isOnGround.value ? 'ground' : 'default';
});

const handleMouseEnter = (event: MouseEvent) => {
    if ([...(event.target as HTMLDivElement).classList].some(x => x.startsWith('popup-block_title') && x !== 'popup-block_title_text' && x !== 'popup-block_title')) hoveredOverlay.value = false;
    else hoveredOverlay.value = true;
};

const setStyle = async (force = false) => {
    if (!feature) return;

    let style = getFeatureStyle(feature);

    if (!style) {
        style = new Style();
        feature.setStyle(style);
    }

    await loadAircraftIcon({
        feature,
        icon: icon.value.icon,
        rotation: degreesToRadians(getHeading.value ?? 0),
        status: getStatus.value,
        style,
        force,
        cid: props.aircraft.cid,
        scale: aircraftScale.value,
    });

    feature.changed();
};

let initActive = false;

let previousSetCallsign: string | undefined;

const init = async () => {
    if (isSelfFlight.value) {
        checkForExpiredCoordinate();
    }

    if (!vectorSource.value || initActive) return;

    initActive = true;

    try {
        await sleep(0);

        const iconFeature = feature || new Feature({
            id: props.aircraft.cid,
            type: 'aircraft',
            geometry: new Point(getCoordinates.value),
            status: getStatus.value,
            icon: icon.value.icon,
            callsign: pilot.value?.callsign,
            rotation: degreesToRadians(getHeading.value ?? 0),
        });

        if (pilot.value?.callsign && previousSetCallsign !== pilot.value?.callsign) {
            iconFeature.setProperties({ ...iconFeature.getProperties(), callsign: pilot.value.callsign });
        }

        previousSetCallsign = pilot.value?.callsign;

        const oldCoords = (feature?.getGeometry() as Point)?.getCoordinates();

        if (oldCoords && oldCoords[0] === getCoordinates.value[0] && oldCoords[1] === getCoordinates.value[1]) {
            setState();
            return;
        }

        setPilotRoute(canShowRoute.value);

        if (feature) (feature.getGeometry() as Point).setCoordinates(getCoordinates.value);

        if (!feature) {
            const foundFeatures = vectorSource.value?.getFeatures().filter(x => x.getProperties().id === props.aircraft.cid);

            if (foundFeatures?.length) {
                vectorSource.value?.removeFeatures(foundFeatures);
            }

            vectorSource.value.addFeature(iconFeature);

            feature = iconFeature;
        }

        isInit.value = true;
        setState();
    }
    catch (e) {
        useRadarError(e);
    }
    finally {
        initActive = false;
    }
};

const activeCurrentOverlay = computed(() => mapStore.overlays.find(x => x.type === 'pilot' && x.key === props.aircraft.cid.toString()) as StoreOverlayPilot | undefined);

const isPropsHovered = computed(() => props.isHovered);
const airportOverlayTracks = computed(() => props.canShowTracks);

const overlayPosition = ref<Positioning>('top-left');
const overlayOffset = ref<[number, number]>([15, -15]);
const overlayWidth = 248;
// const overlayMaxHeight = 212;

const isOnGround = computed(() => isPilotOnGround(props.aircraft));

function clearLineFeatures(features = lineFeatures.value) {
    if (!lineFeatures.value.length) return;

    linesSource.value?.removeFeatures(features);
    features.forEach(x => x.dispose());
    lineFeatures.value = lineFeatures.value.filter(x => !features.includes(x));
}

const canShowLines = ref(false);

const changeState = computed(() => {
    const values = [
        isInit.value,
        JSON.stringify(getCoordinates.value),
        !!feature && !!(isPropsHovered.value || airportOverlayTracks.value || activeCurrentOverlay.value?.data.pilot.status),
        dataStore.vatsim.updateTimestamp.value,
    ];

    return values.map(x => String(x)).join(',');
});

async function setState(val?: string, oldVal?: string) {
    if (!isInit.value || ((val !== undefined || oldVal !== undefined) && val === oldVal)) return;

    canShowLines.value = !!feature && !!(isPropsHovered.value || airportOverlayTracks.value || activeCurrentOverlay.value?.data.pilot.status);

    if (!canShowLines.value) {
        clearLines();
    }

    await Promise.allSettled([
        setStyle(),
        toggleAirportLines(),
    ]);
}

watch(changeState, setState);

watch(aircraftScale, (val, oldVal) => {
    if (val === oldVal) return;
    setStyle(true);
});

watch(() => store.mapSettings.heatmapLayer, () => {
    setStyle(true);
});

const depAirport = computed(() => pilot.value?.departure && dataStore.vatspy.value?.data.keyAirports.realIcao[pilot.value?.departure]);
const arrAirport = computed(() => pilot.value?.arrival && dataStore.vatspy.value?.data.keyAirports.realIcao[pilot.value?.arrival]);

let previousFlightPlan = '';

const distance = computed(() => {
    const arrivalAirport = arrAirport.value;

    if (!arrivalAirport) return null;
    return calculateDistanceInNauticalMiles(
        [arrivalAirport.lon, arrivalAirport.lat],
        getCoordinates.value,
    );
});

let settingPilotRoute = false;

async function setPilotRoute(enabled: boolean) {
    if (settingPilotRoute) return;
    settingPilotRoute = true;

    try {
        if (!flightPlan.value || !enabled) {
            const had = dataStore.navigraphWaypoints.value[props.aircraft.cid.toString()];
            delete dataStore.navigraphWaypoints.value[props.aircraft.cid.toString()];
            if (had) {
                triggerRef(dataStore.navigraphWaypoints);
            }

            settingPilotRoute = false;
            return;
        }

        if (!previousFlightPlan) previousFlightPlan = flightPlan.value;

        if (previousFlightPlan !== flightPlan.value) {
            delete dataStore.navigraphWaypoints.value[props.aircraft.cid.toString()];
            previousFlightPlan = flightPlan.value;
        }

        if (arrLine) {
            arrLine.dispose();
            linesSource.value?.removeFeature(arrLine);
            arrLine = undefined;
        }

        dataStore.navigraphWaypoints.value[props.aircraft.cid.toString()] = {
            pilot: pilot.value,
            coordinates: getCoordinates.value,
            full: typeof activeCurrentOverlay.value?.data?.fullRoute === 'boolean' ? activeCurrentOverlay.value?.data?.fullRoute : !!store.user?.settings.showFullRoute,
            calculatedArrival: dataStore.navigraphWaypoints.value[props.aircraft.cid.toString()]?.calculatedArrival,
            disableHoldings: store.localSettings.navigraphRouteAirportOverlay?.holds === false && !activeCurrentOverlay.value && !props.isHovered,
            disableWaypoints: store.localSettings.navigraphRouteAirportOverlay?.waypoints === false && !activeCurrentOverlay.value && !props.isHovered,
            disableLabels: store.localSettings.navigraphRouteAirportOverlay?.labels === false && !activeCurrentOverlay.value && !props.isHovered,
            waypoints: dataStore.navigraphWaypoints.value[props.aircraft.cid.toString()]?.waypoints ?? await getFlightPlanWaypoints({
                flightPlan: flightPlan.value,
                departure: pilot.value.departure!,
                arrival: pilot.value.arrival!,
                cid: pilot.value.cid,
                disableSidParsing: store.localSettings.navigraphRouteAirportOverlay?.sid === false,
                disableStarParsing: store.localSettings.navigraphRouteAirportOverlay?.star === false,
            }),
        };

        triggerRef(dataStore.navigraphWaypoints);
    }
    finally {
        settingPilotRoute = false;
    }
}

const canShowRoute = computed(() => {
    if (!activeCurrentOverlay.value && !isPropsHovered.value && !props.canShowTracks) return false;

    const airportOnly = !activeCurrentOverlay.value && !isPropsHovered.value;

    if (!activeCurrentOverlay.value && isPropsHovered.value && store.localSettings.disableNavigraphRouteHover) return false;

    if (airportOnly && store.localSettings.navigraphRouteAirportOverlay?.enabled === false) return false;

    return canShowLines.value &&
        !!arrAirport.value &&
        props.isVisible &&
        (pilot.value.groundspeed > 50 || !!activeCurrentOverlay.value || isPropsHovered.value) &&
        !store.localSettings.disableNavigraphRoute &&
        airportOverlayTracks.value !== 'short' &&
        !!dataStore.navigraph.data;
});

watch(canShowRoute, val => {
    setPilotRoute(val);
});

async function toggleAirportLines(value = canShowLines.value) {
    if (linesUpdateInProgress.value) return;

    linesUpdateInProgress.value = true;

    try {
        const departureAirport = value && depAirport.value;
        const arrivalAirport = value && arrAirport.value;

        let color = getAircraftStatusColor(getStatus.value, props.aircraft.cid);

        if (store.mapSettings.colors?.turnsTransparency) {
            const rgb = hexToRgb(color);

            color = `rgba(${ rgb }, ${ store.mapSettings.colors?.turnsTransparency })`;
        }

        let turns: InfluxGeojson | null | undefined = null;
        let firstUpdate = true;

        if (!lineFeatures.value.length) {
            turnsFirstGroupTimestamp.value = '';
            turnsStart.value = '';
        }

        const shortUpdate = !!turnsFirstGroupTimestamp.value && !!turnsFirstGroupTimestamp.value;

        if (!canShowLines.value) {
            clearLineFeatures();

            if (depLine) {
                depLine.dispose();
                linesSource.value?.removeFeature(depLine);
                depLine = undefined;
            }

            if (arrLine) {
                arrLine.dispose();
                linesSource.value?.removeFeature(arrLine);
                arrLine = undefined;
            }

            setPilotRoute(false);

            return;
        }

        if (canShowRoute.value && !flightPlan.value) {
            flightPlan.value = (await $fetch<{ flightPlan: string } | null | undefined>(`/api/data/vatsim/pilot/${ props.aircraft.cid }/plan`, {
                timeout: 1000 * 5,
            }).catch(console.error))?.flightPlan ?? '';
        }

        setPilotRoute(canShowRoute.value);

        if (!canShowRoute.value && arrivalAirport && props.isVisible && (!airportOverlayTracks.value || ((distance.value ?? 100) > 40 && pilot.value?.groundspeed && pilot.value.groundspeed > 50) || activeCurrentOverlay.value || isPropsHovered.value)) {
            const start = point(getCoordinates.value);
            const end = point([arrivalAirport.lon, arrivalAirport.lat]);

            const geometry = turfGeometryToOl(greatCircle(start, end));

            if (arrLine) {
                arrLine.setGeometry(geometry);
                getFeatureStyle(arrLine)?.getStroke()?.setColor(color);
                arrLine.changed();
            }
            else {
                arrLine = new Feature({
                    geometry,
                    type: 'arrLine',
                    color,
                });

                arrLine.setStyle(new Style({
                    stroke: new Stroke({
                        color,
                        width: 1,
                        lineDash: [4, 8],
                    }),
                }));

                linesSource.value?.addFeature(arrLine);
            }
        }
        else if (arrLine) {
            arrLine.dispose();
            linesSource.value?.removeFeature(arrLine);
            arrLine = undefined;
        }

        if (value) {
            turns = await new Promise<InfluxGeojson | null | undefined>(resolve => {
                if (airportOverlayTracks.value === 'short') {
                    resolve(null);
                    return;
                }

                requestIdleCallback(async () => {
                    resolve(
                        airportOverlayTracks.value !== 'short'
                            ? await $fetch<InfluxGeojson | null | undefined>(`/api/data/vatsim/pilot/${ props.aircraft.cid }/turns?start=${ turnsFirstGroupTimestamp.value ?? '' }`, {
                                timeout: 1000 * 5,
                            }).catch(console.error) ?? null
                            : null,
                    );
                });
            });

            flightPlan.value = turns?.flightPlan ?? '';

            if (turnsStart.value) {
                if (turns?.flightPlanTime === turnsStart.value) {
                    firstUpdate = false;
                }
                else {
                    turns = await $fetch<InfluxGeojson | null | undefined>(`/api/data/vatsim/pilot/${ props.aircraft.cid }/turns`, {
                        timeout: 1000 * 5,
                    }).catch(console.error) ?? null;
                }
            }

            if (turns?.features?.[0]?.features.length && turns?.flightPlanTime) {
                turnsTimestamp.value = turns.features[0]?.features[0]?.properties!.timestamp ?? '';
                turnsStart.value = turns.flightPlanTime;
            }
        }

        if (turns?.features?.length && airportOverlayTracks.value !== 'short') {
            if (depLine) {
                depLine.dispose();
                linesSource.value?.removeFeature(depLine);
                depLine = undefined;
            }

            const firstCollectionTimestamp = turns.features[0].features[turns.features[0].features.length - 1].properties!.timestamp;

            if (firstUpdate) {
                clearLineFeatures();
                turnsFirstGroup.value = null;
            }
            else {
                const toRemove = lineFeatures.value.filter(x => {
                    const properties = x.getProperties();
                    if (properties!.type === 'aircraft') return true;
                    return properties!.timestamp === firstCollectionTimestamp;
                });

                clearLineFeatures(toRemove);
            }

            if (turns.features[1]) {
                turnsSecondGroupPoint.value = turns.features[1].features[0];
            }
            else if (turnsFirstGroupTimestamp.value !== firstCollectionTimestamp) turnsSecondGroupPoint.value = null;

            turnsFirstGroup.value = turns.features[0];
            turnsFirstGroupTimestamp.value = firstCollectionTimestamp ?? '';

            for (let i = 0; i < turns.features.length; i++) {
                const collection = {
                    ...turns.features[i],
                };

                collection.features = [...collection.features];

                const nextCollection = turns.features[i + 1];

                const styles = [
                    getAircraftLineStyle(collection.features[0].properties!.color),
                ];

                if (i === 0) {
                    const coordinates = [
                        collection.features[0].geometry.coordinates.slice(),
                        getCoordinates.value,
                    ];
                    const points = coordinates.map(x => point(x));
                    const geometry = turfGeometryToOl(greatCircle(points[0], points[1], { npoints: 8 }));

                    const lineFeature = new Feature({
                        geometry,
                        timestamp: collection.features[0].properties!.timestamp,
                        color: collection.features[0].properties!.color,
                        type: 'aircraft',
                    });
                    lineFeature.setStyle(getAircraftLineStyle(collection.features[0].properties!.color));
                    linesSource.value?.addFeature(lineFeature);
                    lineFeatures.value.push(lineFeature);
                }

                if (nextCollection) {
                    collection.features.push({
                        type: 'Feature',
                        properties: {
                            type: 'turn',
                            color: collection.features[0].properties!.color,
                        },
                        geometry: {
                            type: 'Point',
                            coordinates: nextCollection.features[0].geometry.coordinates.slice(),
                        },
                    });
                }
                else if (shortUpdate && i === 0 && turnsSecondGroupPoint.value) {
                    collection.features.push({
                        type: 'Feature',
                        properties: {
                            type: 'turn',
                            color: turnsSecondGroupPoint.value.properties!.color,
                        },
                        geometry: {
                            type: 'Point',
                            coordinates: turnsSecondGroupPoint.value.geometry.coordinates.slice(),
                        },
                    });
                }

                if (i === turns.features.length - 1 && !shortUpdate && departureAirport && arrivalAirport && departureAirport.icao !== arrivalAirport?.icao && !turns.features.some(x => x.features.some(x => x.properties!.standing === true))) {
                    const coordinates = [
                        [departureAirport.lon, departureAirport.lat],
                        collection.features[collection.features.length - 1].geometry.coordinates.slice(),
                    ];
                    const points = coordinates.map(x => point(x));
                    const geometry = turfGeometryToOl(greatCircle(points[0], points[1]));

                    const lineFeature = new Feature({
                        geometry,
                        timestamp: collection.features[0].properties!.timestamp,
                        color: collection.features[0].properties!.color,
                        type: 'airportLine',
                    });
                    lineFeature.setStyle(getAircraftLineStyle(color));
                    linesSource.value?.addFeature(lineFeature);
                    lineFeatures.value.push(lineFeature);
                }

                const newFeatures: Array<LineString | Position[]> = [];

                function addFeature(geometry: Position | Position[]) {
                    if (typeof geometry[0] === 'number') {
                        if (newFeatures.length) {
                            const lineString = newFeatures.at(-1);
                            if (lineString instanceof LineString) {
                                lineString.appendCoordinate(geometry as Position);
                            }
                        }

                        const lineString = new LineString([geometry as Position]);
                        newFeatures.push(lineString);
                    }
                    else newFeatures.push(new LineString(geometry as Position[]));
                }

                for (let i = 0; i < collection.features.length; i++) {
                    const curPoint = collection.features[i];
                    const nextPoint = collection.features[i + 1];
                    if (!nextPoint) {
                        addFeature(curPoint.geometry.coordinates);
                        continue;
                    }

                    if (curPoint.geometry.coordinates[0] === nextPoint.geometry.coordinates[0] && curPoint.geometry.coordinates[1] === nextPoint.geometry.coordinates[1]) {
                        addFeature(curPoint.geometry.coordinates);
                        addFeature(nextPoint.geometry.coordinates);
                        continue;
                    }

                    const coords = [curPoint.geometry.coordinates, nextPoint.geometry.coordinates];

                    const points = coords.map(x => point(x));

                    let npoints = 4;

                    if (
                        Math.abs(coords[0][0] - coords[1][0]) > 0.9 ||
                        Math.abs(coords[0][1] - coords[1][1]) > 0.9
                    ) {
                        npoints = 100;
                    }

                    const circle = greatCircle(points[0], points[1], {
                        npoints,
                    });

                    const geometry = circle.geometry.type === 'LineString' ? circle.geometry.coordinates : circle.geometry.coordinates;

                    geometry.map(x => addFeature(x));
                }

                const lineFeature = new Feature({
                    geometry: new MultiLineString(newFeatures),
                    color: collection.features[0].properties!.color,
                    timestamp: i === 0 && turnsFirstGroupTimestamp.value,
                });

                lineFeature.setStyle(styles);
                linesSource.value?.addFeature(lineFeature);
                lineFeatures.value.push(lineFeature);
            }
        }
        else {
            clearLineFeatures();

            if (departureAirport && pilot.value?.depDist && pilot.value?.depDist > 20 && props.isVisible) {
                const start = point([departureAirport.lon, departureAirport.lat]);
                const end = point(getCoordinates.value);

                const geometry = turfGeometryToOl(greatCircle(start, end));

                if (depLine) {
                    depLine.setGeometry(geometry);

                    getFeatureStyle(depLine)?.getStroke()?.setColor(color);
                    depLine.changed();
                }
                else {
                    depLine = new Feature({
                        geometry,
                        type: 'depLine',
                        color,
                    });

                    depLine.setStyle(new Style({
                        stroke: new Stroke({
                            color,
                            width: 1,
                        }),
                    }));

                    linesSource.value?.addFeature(depLine);
                }
            }
            else if (depLine) {
                depLine.dispose();
                linesSource.value?.removeFeature(depLine);
                depLine = undefined;
            }
        }
    }
    catch (e) {
        useRadarError(e);
    }
    finally {
        linesUpdateInProgress.value = false;
    }
}

function clearLines() {
    clearLineFeatures();
    if (depLine) linesSource.value?.removeFeature(depLine);
    if (arrLine) linesSource.value?.removeFeature(arrLine);
    const hadWaypoint = dataStore.navigraphWaypoints.value[props.aircraft.cid.toString()];
    delete dataStore.navigraphWaypoints.value[props.aircraft.cid.toString()];
    if (hadWaypoint) {
        triggerRef(dataStore.navigraphWaypoints);
    }
    mapStore.localTurns.delete(props.aircraft.cid);
}

function clearAll() {
    if (mapStore.openPilotOverlay) mapStore.openPilotOverlay = false;
    if (feature) vectorSource.value?.removeFeature(feature);
    else {
        const feature = vectorSource.value?.getFeatures().find(x => x.getProperties().id === props.aircraft.cid);

        if (feature) {
            vectorSource.value?.removeFeature(feature);
        }
    }
    setPilotRoute(false);
    clearLines();
}

async function delayedLinesDestroy() {
    clearLines();

    for (let i = 0; i < 5; i++) {
        await sleep(3000);
        clearLines();
        if (dataStore.visiblePilotsObj.value[String(props.aircraft?.cid)]) break;
    }
}

onMounted(() => {
    init();
});

watch([hovered, hoveredOverlay], async () => {
    if (hovered.value || hoveredOverlay.value) {
        emit('manualHover');
    }
    else {
        await sleep(0);
        if (!hovered.value && !hoveredOverlay.value) {
            emit('manualHide');
        }
    }
});

const watcher = watch([dataStore.vatsim.updateTimestamp, textCoordinates], init);

onBeforeUnmount(() => {
    watcher();
    canShowLines.value = false;
    clearAll();
    delayedLinesDestroy();
});
</script>

<style lang="scss">
.aircraft-hover-container {
    z-index: 20;
}

.aircraft-label-container {
    z-index: 19;
}
</style>

<style lang="scss" scoped>
.aircraft-hover {
    display: flex;
    flex-direction: column;
    gap: 8px;

    width: var(--overlay-width);
    padding: 8px;
    border-radius: 8px;

    font-size: 13px;
    overflow-wrap: anywhere;

    background: $darkgray1000;

    &__frequency {
        font-size: 12px;
        font-weight: 600;
        text-align: right;
        white-space: nowrap;

        + .aircraft-hover__frequency{
            margin-left: 4px;
            padding-left: 4px;
            border-left: 1px solid varToRgba('lightgray150', 0.1);
        }
    }

    &__pilot {
        &__title, &__text {
            font-weight: 600;
        }

        &__text_rating {
            font-size: 11px;
            font-weight: normal;
        }
    }

    &__airport {
        font-size: 9px;
    }

    &_body {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    &_sections {
        display: flex;
        gap: 4px;

        > * {
            flex: 1 1 0;
            width: 0;
        }
    }
}

.__grid-info-sections_title {
    font-weight: 600;
}
</style>
