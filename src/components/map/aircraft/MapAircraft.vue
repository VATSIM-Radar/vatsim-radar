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
                                </div>
                                <div class="aircraft-hover__pilot__text">
                                    {{ parseEncoding(aircraft.name) }}<br>
                                    {{ usePilotRating(aircraft).join(' | ') }}
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
                :class="[`aircraft-label--type-${ getStatus }`]"
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
import { isPilotOnGround, loadAircraftIcon, usePilotRating } from '~/composables/pilots';
import type { MapAircraftStatus } from '~/composables/pilots';
import { sleep } from '~/utils';
import { getAircraftIcon } from '~/utils/icons';
import { getPilotTrueAltitude } from '~/utils/shared/vatsim';
import type { StoreOverlayPilot } from '~/store/map';
import { useMapStore } from '~/store/map';
import { useStore } from '~/store';
import { getCurrentThemeHexColor } from '#imports';
import { parseEncoding } from '../../../utils/data';
import { getFeatureStyle } from '~/composables';
import { Fill, Stroke, Style, Text } from 'ol/style';
import type { InfluxGeojson } from '~/utils/backend/influx';
import MapOverlay from '~/components/map/MapOverlay.vue';
import CommonPopupBlock from '~/components/common/popup/CommonPopupBlock.vue';
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';

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

const vectorSource = inject<ShallowRef<VectorSource | null>>('vector-source')!;
const hovered = ref(false);
const hoveredOverlay = ref(false);
const isInit = ref(false);
let feature: Feature | undefined;
let depLine: Feature | undefined;
let arrLine: Feature | undefined;
let lineFeature: Feature | undefined;
const store = useStore();
const mapStore = useMapStore();
const dataStore = useDataStore();

function degreesToRadians(degrees: number) {
    return degrees * (Math.PI / 180);
}

const getCoordinates = computed(() => [props.aircraft.longitude, props.aircraft.latitude]);
const icon = computed(() => getAircraftIcon(props.aircraft));
const isSelfFlight = computed(() => props.aircraft?.cid.toString() === store.user?.cid);

const getStatus = computed<MapAircraftStatus>(() => {
    let status: MapAircraftStatus = 'default';
    if (isSelfFlight.value || store.config.allAircraftGreen) {
        status = 'green';
    }
    else if (activeCurrentOverlay.value) {
        status = 'active';
    }
    else if (props.isHovered || (airportOverlayTracks.value && !isOnGround.value)) {
        status = 'hover';
    }

    return status;
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

    if (feature) feature.setGeometry(new Point(getCoordinates.value));

    if (!feature) {
        vectorSource.value.addFeature(iconFeature);
    }

    setStyle(iconFeature);

    feature = iconFeature;
    isInit.value = true;
};

const activeCurrentOverlay = computed(() => mapStore.overlays.find(x => x.type === 'pilot' && x.key === props.aircraft.cid.toString()) as StoreOverlayPilot | undefined);

const isPropsHovered = computed(() => props.isHovered);
const airportOverlayTracks = computed(() => props.aircraft.arrival && mapStore.overlays.some(x => x.type === 'airport' && x.data.icao === props.aircraft.arrival && x.data.showTracks));
const isOnGround = computed(() => isPilotOnGround(props.aircraft));

watch([isPropsHovered, isInit], ([val]) => {
    if (!feature || activeCurrentOverlay.value) return;

    toggleAirportLines(!!airportOverlayTracks.value || val);
    setStyle();
}, {
    immediate: true,
});

async function toggleAirportLines(value: boolean) {
    if (value) {
        if (isOnGround.value && !isSelfFlight.value && !activeCurrentOverlay.value) value = false;
    }

    const depAirport = value && props.aircraft.departure && dataStore.vatspy.value?.data.airports.find(x => x.icao === props.aircraft.departure);
    const arrAirport = value && props.aircraft.arrival && dataStore.vatspy.value?.data.airports.find(x => x.icao === props.aircraft.arrival);

    const color = isSelfFlight.value ? getCurrentThemeHexColor('success500') : activeCurrentOverlay.value ? getCurrentThemeHexColor('warning700') : getCurrentThemeHexColor('warning600');

    const turns = value && (activeCurrentOverlay.value || isSelfFlight.value) && await $fetch<InfluxGeojson | null | undefined>(`/data/vatsim/pilot/${ props.aircraft.cid }/turns`, {
        timeout: 1000 * 5,
    }).catch(console.error);

    if (turns) {
        if (depLine) {
            depLine.dispose();
            vectorSource.value?.removeFeature(depLine);
            depLine = undefined;
        }

        if (arrLine) {
            arrLine.dispose();
            vectorSource.value?.removeFeature(arrLine);
            arrLine = undefined;
        }

        if (lineFeature) {
            vectorSource.value?.removeFeature(lineFeature);
        }
        const style = new Style({
            stroke: new Stroke({ color, width: 2 }),
            text: new Text({
                font: 'bold 12px Montserrat',
                text: props.aircraft?.callsign,
                fill: new Fill({
                    color,
                }),
                placement: 'line',
                textBaseline: 'bottom',
            }),
        });

        lineFeature = new Feature({
            geometry: new LineString([
                [props.aircraft.longitude, props.aircraft.latitude],
                ...turns.features.map(x => x.geometry.coordinates),
            ]),
        });
        lineFeature.setStyle(style);

        vectorSource.value?.addFeature(lineFeature);
    }
    else {
        if (lineFeature) {
            vectorSource.value?.removeFeature(lineFeature);
            lineFeature.dispose();
            lineFeature = undefined;
        }

        if (depAirport) {
            const geometry = new LineString([
                [depAirport.lon, depAirport.lat],
                [props.aircraft?.longitude, props.aircraft?.latitude],
            ]);

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

                vectorSource.value?.addFeature(depLine);
            }
        }
        else if (depLine) {
            depLine.dispose();
            vectorSource.value?.removeFeature(depLine);
            depLine = undefined;
        }
    }

    if (arrAirport) {
        const geometry = new LineString([
            [props.aircraft?.longitude, props.aircraft?.latitude],
            [arrAirport.lon, arrAirport.lat],
        ]);

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

            vectorSource.value?.addFeature(arrLine);
        }
    }
    else if (arrLine) {
        arrLine.dispose();
        vectorSource.value?.removeFeature(arrLine);
        arrLine = undefined;
    }
}

watch([activeCurrentOverlay, isInit, dataStore.vatsim.updateTimestamp, airportOverlayTracks], ([val], oldValue) => {
    if (!feature || (!val && oldValue === undefined && !airportOverlayTracks.value)) return;

    setStyle();

    if (activeCurrentOverlay.value?.data.pilot.status || airportOverlayTracks.value) {
        toggleAirportLines(true);
    }
    else if (!props.isHovered) {
        toggleAirportLines(false);
    }
}, {
    immediate: true,
});

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

onBeforeUnmount(() => {
    if (lineFeature) {
        vectorSource.value?.removeFeature(lineFeature);
        lineFeature.dispose();
    }
    if (mapStore.openPilotOverlay) mapStore.openPilotOverlay = false;
    if (feature) vectorSource.value?.removeFeature(feature);
    if (depLine) vectorSource.value?.removeFeature(depLine);
    if (arrLine) vectorSource.value?.removeFeature(arrLine);
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

    background: $neutral1000;
    border-radius: 8px;

    &__pilot_content {
        display: grid;
        grid-template-columns: 40px 160px;
        align-items: center;
        justify-content: space-between;
    }

    &__pilot {
        &__title {
            font-weight: 600;
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
    color: $primary500;

    &--type-hover {
        color: $warning500;
    }

    &--type-active {
        color: $warning700;
    }

    &--type-green {
        color: $success500;
    }
}
</style>
