<template>
    <template v-if="!props.isHovered && !isShowLabel">
        <slot/>
    </template>
    <template v-else>
        <map-overlay
            class="aircraft-overlay"
            :model-value="props.isHovered"
            :settings="{
                position: getCoordinates,
                offset: [15, -15],
            }"
            :z-index="20"
            @update:overlay="mapStore.openPilotOverlay = !!$event"
        >
            <common-popup-block
                class="aircraft-hover"
                @mouseleave="hoveredOverlay = false"
                @mouseover="hoveredOverlay = true"
            >
                <template #title>
                    {{ aircraft.callsign }}
                </template>
                <template
                    v-if="aircraft.aircraft_faa"
                    #additionalTitle
                >
                    {{ aircraft.aircraft_faa }}
                </template>
                <div class="aircraft-hover_body">
                    <common-info-block
                        class="aircraft-hover__pilot"
                        is-button
                        @click="mapStore.addPilotOverlay(aircraft.cid.toString())"
                    >
                        <template #bottom>
                            <div class="aircraft-hover__pilot_content">
                                <div class="aircraft-hover__pilot__title">
                                    Pilot

                                    <div
                                        v-if="aircraft.frequencies.length >= 1"
                                        class="aircraft-hover__pilot__frequency"
                                    >
                                        {{ aircraft.frequencies[0] }}
                                    </div>
                                </div>
                                <div class="aircraft-hover__pilot__text">
                                    {{ parseEncoding(aircraft.name) }}<br>
                                    <div class="aircraft-hover__pilot__text_rating">
                                        {{ usePilotRating(aircraft).join(' | ') }}
                                    </div>
                                </div>
                            </div>
                        </template>
                    </common-info-block>
                    <div
                        v-if="aircraft.departure || aircraft.arrival"
                        class="aircraft-hover_sections"
                    >
                        <common-info-block
                            v-if="aircraft.departure"
                            is-button
                            text-align="center"
                            @click="mapStore.addAirportOverlay(aircraft.departure)"
                        >
                            <template #top>
                                From
                            </template>
                            <template #bottom>
                                {{ aircraft.departure }}
                            </template>
                        </common-info-block>
                        <common-info-block
                            v-if="aircraft.arrival"
                            is-button
                            text-align="center"
                            @click="mapStore.addAirportOverlay(aircraft.arrival)"
                        >
                            <template #top>
                                To
                            </template>
                            <template #bottom>
                                {{ aircraft.arrival }}
                            </template>
                        </common-info-block>
                    </div>
                    <div class="aircraft-hover_sections">
                        <common-info-block
                            v-if="typeof aircraft.groundspeed === 'number'"
                            text-align="center"
                        >
                            <template #top>
                                Ground Speed
                            </template>
                            <template #bottom>
                                {{ aircraft.groundspeed }} kts
                            </template>
                        </common-info-block>
                        <common-info-block
                            v-if="typeof aircraft.altitude === 'number'"
                            text-align="center"
                        >
                            <template #top>
                                Altitude
                            </template>
                            <template #bottom>
                                {{ getPilotTrueAltitude(aircraft) }} ft
                            </template>
                        </common-info-block>
                    </div>
                </div>
            </common-popup-block>
        </map-overlay>
        <map-overlay
            class="aircraft-overlay"
            :model-value="isShowLabel"
            persistent
            :settings="{
                position: getCoordinates,
                offset: [0, 0],
            }"
            :style="{ '--imageHeight': `${ radarIcons[icon.icon].height }px` }"
            :z-index="19"
        >
            <div
                class="aircraft-label"
                :style="{ '--color': svgColors[getStatus] }"
                @click="mapStore.addPilotOverlay(aircraft.cid.toString())"
                @mouseleave="hovered = false"
                @mouseover="mapStore.canShowOverlay ? hovered = true : undefined"
            >
                <div class="aircraft-label_text">
                    {{ aircraft.callsign }}
                </div>
            </div>
        </map-overlay>
    </template>
</template>

<script setup lang="ts">
import type { PropType, ShallowRef } from 'vue';
import { onMounted } from 'vue';
import type { VatsimShortenedAircraft } from '~/types/data/vatsim';
import type VectorSource from 'ol/source/Vector';
import { Feature } from 'ol';
import { LineString, Point } from 'ol/geom';
import type { MapAircraftStatus } from '~/composables/pilots';
import {
    aircraftSvgColors,
    getAircraftLineStyle,
    isPilotOnGround,
    loadAircraftIcon,
    usePilotRating,
} from '~/composables/pilots';
import { greatCircleGeometryToOL, sleep } from '~/utils';
import { getAircraftIcon } from '~/utils/icons';
import { getPilotTrueAltitude } from '~/utils/shared/vatsim';
import type { StoreOverlayPilot } from '~/store/map';
import { useMapStore } from '~/store/map';
import { useStore } from '~/store';
import { parseEncoding } from '../../../utils/data';
import { getFeatureStyle } from '~/composables';
import { Fill, Stroke, Style, Text } from 'ol/style';
import type { InfluxGeojson } from '~/utils/backend/influx';
import MapOverlay from '~/components/map/MapOverlay.vue';
import CommonPopupBlock from '~/components/common/popup/CommonPopupBlock.vue';
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';
import { toRadians } from 'ol/math';
import type { Coordinate } from 'ol/coordinate';
import { calculateDistanceInNauticalMiles } from '~/utils/shared/flight';
import { toLonLat } from 'ol/proj';
import { point } from '@turf/helpers';
import greatCircle from '@turf/great-circle';

const props = defineProps({
    aircraft: {
        type: Object as PropType<VatsimShortenedAircraft>,
        required: true,
    },
    isHovered: {
        type: Boolean,
        default: false,
    },
    showLabel: {
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

const svgColors = aircraftSvgColors();

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
const turnsUpdate = ref(0);
const savedTurns = shallowRef<InfluxGeojson | null | undefined>(null);

function degreesToRadians(degrees: number) {
    return degrees * (Math.PI / 180);
}

const getCoordinates = computed(() => [props.aircraft.longitude, props.aircraft.latitude]);
const icon = computed(() => getAircraftIcon(props.aircraft));
const isSelfFlight = computed(() => props.aircraft?.cid.toString() === store.user?.cid);

const getStatus = computed<MapAircraftStatus>(() => {
    if (isSelfFlight.value || store.config.allAircraftGreen) return 'green';
    if (activeCurrentOverlay.value) return 'active';
    if (props.isHovered || (airportOverlayTracks.value && !isOnGround.value)) return 'hover';

    // color aircraft icon based on departure/arrival when the airport dashboard is in use
    if (store.config.airport) {
        const vatAirport = dataStore.vatsim.data.airports.value.find(x => x.icao === store.config.airport);
        if (vatAirport?.aircraft.groundDep?.includes(props.aircraft.cid)) return 'departing';
        if (vatAirport?.aircraft.groundArr?.includes(props.aircraft.cid)) return 'landed';
        if (vatAirport?.aircraft.arrivals?.includes(props.aircraft.cid)) return 'arriving';
    }

    return 'default';
});

const setStyle = async (iconFeature = feature) => {
    if (!iconFeature) return;

    let style = getFeatureStyle(iconFeature);

    if (!style) {
        style = new Style();
        iconFeature.setStyle(style);
    }

    await loadAircraftIcon(
        iconFeature,
        icon.value.icon,
        degreesToRadians(props.aircraft.heading ?? 0),
        getStatus.value,
        style,
    );

    iconFeature.changed();
};

const init = () => {
    if (!vectorSource.value) return;

    const iconFeature = feature || new Feature({
        id: props.aircraft.cid,
        type: 'aircraft',
        geometry: new Point(getCoordinates.value),
        status: getStatus.value,
        icon: icon.value.icon,
        rotation: degreesToRadians(props.aircraft.heading ?? 0),
    });

    const oldCoords = (feature?.getGeometry() as Point)?.getCoordinates();

    if (oldCoords && oldCoords[0] === getCoordinates.value[0] && oldCoords[1] === getCoordinates.value[1]) return;

    if (feature) (feature.getGeometry() as Point).setCoordinates(getCoordinates.value);

    if (!feature) {
        vectorSource.value.addFeature(iconFeature);
    }

    feature = iconFeature;
    isInit.value = true;
    setState();
};

const activeCurrentOverlay = computed(() => mapStore.overlays.find(x => x.type === 'pilot' && x.key === props.aircraft.cid.toString()) as StoreOverlayPilot | undefined);

const isPropsHovered = computed(() => props.isHovered);
const airportOverlayTracks = computed(() => props.aircraft.arrival && mapStore.overlays.some(x => x.type === 'airport' && x.data.icao === props.aircraft.arrival && x.data.showTracks));
const isOnGround = computed(() => isPilotOnGround(props.aircraft));

let lineStyle: Style | undefined;

function clearLineFeatures(limit?: number) {
    if (!lineFeatures.value.length) return;

    const features = lineFeatures.value.slice(0, limit ?? lineFeatures.value.length);

    linesSource.value?.removeFeatures(features);
    features.forEach(x => x.dispose());
    lineFeatures.value = limit ? lineFeatures.value.slice(limit, lineFeatures.value.length) : [];
}

const canShowLines = ref(false);

const changeState = computed(() => {
    const values = [
        isInit.value,
        isOnGround.value && !isSelfFlight.value && !activeCurrentOverlay.value,
        !!feature && !!(isPropsHovered.value || hovered.value || airportOverlayTracks.value || activeCurrentOverlay.value?.data.pilot.status),
        dataStore.vatsim.updateTimestamp,
    ];

    return values.map(x => String(x)).join(',');
});

async function setState() {
    if (!isInit.value) return;
    if (isOnGround.value && !isSelfFlight.value && !activeCurrentOverlay.value) {
        canShowLines.value = false;
    }
    else {
        canShowLines.value = !!feature && !!(isPropsHovered.value || hovered.value || airportOverlayTracks.value || activeCurrentOverlay.value?.data.pilot.status);
    }

    await Promise.allSettled([
        setStyle(),
        toggleAirportLines(),
    ]);

    if (!canShowLines.value) {
        clearLines();
    }
}

watch(changeState, setState);

async function toggleAirportLines(value = canShowLines.value) {
    const date = Date.now();

    const depAirport = value && props.aircraft.departure && dataStore.vatspy.value?.data.airports.find(x => x.icao === props.aircraft.departure);
    const arrAirport = value && props.aircraft.arrival && dataStore.vatspy.value?.data.airports.find(x => x.icao === props.aircraft.arrival);

    const distance = () => {
        if (!arrAirport) return null;
        return calculateDistanceInNauticalMiles(
            toLonLat([arrAirport.lon, arrAirport.lat]),
            toLonLat([props.aircraft.longitude, props.aircraft.latitude]),
        );
    };

    const color = svgColors[getStatus.value];

    if (value) {
        /* if (!savedTurns.value || turnsUpdate.value + (1000 * 5) <= date) {
            savedTurns.value = await $fetch<InfluxGeojson | null | undefined>(`/api/data/vatsim/pilot/${ props.aircraft.cid }/turns`, {
                timeout: 1000 * 5,
            }).catch(console.error) ?? null;
        }*/
    }

    const turns = savedTurns.value;

    turnsUpdate.value = date;

    if (!canShowLines.value) return;

    if (turns) {
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

        clearLineFeatures();

        for (let i = 0; i < turns.features.length; i++) {
            const feature = turns.features[i];

            const prevFeature = turns.features[i - 1];
            const nextFeature = turns.features[i + 1];

            const coordinates: Coordinate[] = [
                feature.geometry.coordinates,
            ];

            const styles = [
                getAircraftLineStyle(feature.properties!.color),
            ];

            if (i === 0) {
                coordinates.push([props.aircraft.longitude, props.aircraft.latitude]);
            }
            else if (prevFeature) {
                coordinates.unshift(prevFeature.geometry.coordinates);
            }
            else {
                coordinates.push(nextFeature.geometry.coordinates);
            }

            if (i === turns.features.length - 1 && depAirport && arrAirport && depAirport.icao !== arrAirport?.icao && !turns.features.some(x => x.properties!.standing === true)) {
                const coordinates = [
                    [depAirport.lon, depAirport.lat],
                    feature.geometry.coordinates,
                ];
                const points = coordinates.map(x => point(toLonLat(x)));
                const geometry = greatCircleGeometryToOL(greatCircle(points[0], points[1]));

                const lineFeature = new Feature({
                    geometry,
                    timestamp: feature.properties!.timestamp,
                    color: feature.properties!.color,
                });
                lineFeature.setStyle(getAircraftLineStyle(color));
                linesSource.value?.addFeature(lineFeature);
                lineFeatures.value.push(lineFeature);
            }

            const points = coordinates.map(x => point(toLonLat(x)));
            const geometry = greatCircleGeometryToOL(greatCircle(points[0], points[1]));

            const lineFeature = new Feature({
                geometry,
                timestamp: feature.properties!.timestamp,
                color: feature.properties!.color,
            });
            lineFeature.setStyle(styles);
            linesSource.value?.addFeature(lineFeature);
            lineFeatures.value.push(lineFeature);
        }

        const style = lineStyle || (lineStyle = new Style({
            stroke: new Stroke({
                color: 'transparent',
                width: 0,
            }),
            text: new Text({
                font: 'bold 12px Montserrat',
                text: props.aircraft?.callsign,
                fill: new Fill({
                    color,
                }),
                placement: 'line',
                textBaseline: 'bottom',
                maxAngle: toRadians(10),
                declutterMode: 'declutter',
            }),
        }));

        const lineFeature = new Feature({
            geometry: new LineString([
                [props.aircraft.longitude, props.aircraft.latitude],
                ...turns.features.map(x => x.geometry.coordinates),
            ]),
        });

        lineFeature.setStyle(style);
        linesSource.value?.addFeature(lineFeature);
        lineFeatures.value.push(lineFeature);
    }
    else {
        clearLineFeatures();

        if (depAirport) {
            const start = point(toLonLat([depAirport.lon, depAirport.lat]));
            const end = point(toLonLat([props.aircraft?.longitude, props.aircraft?.latitude]));

            const geometry = greatCircleGeometryToOL(greatCircle(start, end));

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

    if (arrAirport && (!airportOverlayTracks.value || (distance() ?? 100) > 40 || activeCurrentOverlay.value || isPropsHovered.value)) {
        const start = point(toLonLat([props.aircraft?.longitude, props.aircraft?.latitude]));
        const end = point(toLonLat([arrAirport.lon, arrAirport.lat]));

        const geometry = greatCircleGeometryToOL(greatCircle(start, end));

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
}

function clearLines() {
    clearLineFeatures();
    if (depLine) linesSource.value?.removeFeature(depLine);
    if (arrLine) linesSource.value?.removeFeature(arrLine);
}

function clearAll() {
    if (mapStore.openPilotOverlay) mapStore.openPilotOverlay = false;
    if (feature) vectorSource.value?.removeFeature(feature);
    clearLines();
}

async function delayedLinesDestroy() {
    clearLines();

    for (let i = 0; i < 5; i++) {
        await sleep(3000);
        clearLines();
    }
}

onMounted(init);

watch([hovered, hoveredOverlay], async () => {
    if (hovered.value || hoveredOverlay.value) {
        emit('manualHover');
    }
    else if (props.isHovered) {
        await sleep(0);
        if (!hovered.value && !hoveredOverlay.value) {
            emit('manualHide');
        }
    }
});

const isShowLabel = computed<boolean>(() => props.showLabel || !!activeCurrentOverlay.value);

watch(isShowLabel, val => {
    if (!val) {
        hovered.value = false;
    }
});

watch(dataStore.vatsim.updateTimestamp, init);

onUnmounted(() => {
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
    position: absolute;

    display: flex;
    flex-direction: column;
    gap: 8px;

    width: 248px;
    padding: 8px;

    font-size: 13px;

    background: $darkgray1000;
    border-radius: 8px;

    &__pilot_content {
        display: grid;
        grid-template-columns: 40px 160px;
        align-items: center;
        justify-content: space-between;
    }

    &__pilot {
        &__title, &__text {
            font-weight: 600;
        }

        &__frequency, &__text_rating {
            font-size: 11px;
            font-weight: normal;
        }
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

.aircraft-label {
    cursor: pointer;
    user-select: none;

    position: absolute;
    top: calc(var(--imageHeight) / 2);
    transform: translate(-50%, 0);

    width: fit-content;
    padding-top: 3px;

    font-size: 11px;
    font-weight: 600;
    color: var(--color);
}
</style>
