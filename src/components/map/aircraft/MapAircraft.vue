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
                offset: [15, -15]
            }"
            @update:overlay="mapStore.openPilotOverlay = !!$event"
            :z-index="20"
        >
            <common-popup-block
                class="aircraft-hover"
                @mouseover="hoveredOverlay = true"
                @mouseleave="hoveredOverlay = false"
            >
                <template #title>
                    {{ aircraft.callsign }}
                </template>
                <template #additionalTitle v-if="aircraft.aircraft_faa">
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
                    <div class="aircraft-hover_sections" v-if="aircraft.departure || aircraft.arrival">
                        <common-info-block v-if="aircraft.departure" text-align="center" is-button @click="mapStore.addAirportOverlay(aircraft.departure)">
                            <template #top>
                                From
                            </template>
                            <template #bottom>
                                {{ aircraft.departure }}
                            </template>
                        </common-info-block>
                        <common-info-block v-if="aircraft.arrival" text-align="center" is-button @click="mapStore.addAirportOverlay(aircraft.arrival)">
                            <template #top>
                                To
                            </template>
                            <template #bottom>
                                {{ aircraft.arrival }}
                            </template>
                        </common-info-block>
                    </div>
                    <div class="aircraft-hover_sections">
                        <common-info-block v-if="typeof aircraft.groundspeed === 'number'" text-align="center">
                            <template #top>
                                Ground Speed
                            </template>
                            <template #bottom>
                                {{ aircraft.groundspeed }} kts
                            </template>
                        </common-info-block>
                        <common-info-block v-if="typeof aircraft.altitude === 'number'" text-align="center">
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
            :style="{'--imageHeight': `${radarIcons[icon.icon].height}px`}"
            :model-value="isShowLabel"
            :settings="{
                position: getCoordinates,
                offset: [0, 0]
            }"
            :z-index="19"
            persistent
        >
            <div
                class="aircraft-label"
                :class="[`aircraft-label--type${getPostfix}`]"
                @mouseover="mapStore.canShowOverlay ? hovered = true : undefined"
                @mouseleave="hovered = false"
                @click="mapStore.addPilotOverlay(aircraft.cid.toString())"
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
import { Icon, Stroke, Style } from 'ol/style';
import { isPilotOnGround, usePilotRating } from '~/composables/pilots';
import { sleep } from '~/utils';
import { getAircraftIcon } from '~/utils/icons';
import { getPilotTrueAltitude } from '~/utils/shared/vatsim';
import type { StoreOverlayPilot } from '~/store/map';
import { useMapStore } from '~/store/map';
import { useStore } from '~/store';
import { getCurrentThemeHexColor } from '#imports';
import { parseEncoding } from '../../../utils/data';

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

const vectorSource = inject<ShallowRef<VectorSource | null>>('vector-source')!;
const hovered = ref(false);
const hoveredOverlay = ref(false);
const isInit = ref(false);
let feature: Feature | undefined;
let depLine: Feature | undefined;
let arrLine: Feature | undefined;
const store = useStore();
const mapStore = useMapStore();
const dataStore = useDataStore();

function degreesToRadians(degrees: number) {
    return degrees * (Math.PI / 180);
}

const getCoordinates = computed(() => [props.aircraft.longitude, props.aircraft.latitude]);
const icon = computed(() => getAircraftIcon(props.aircraft));
const isSelfFlight = computed(() => props.aircraft?.cid.toString() === store.user?.cid);

const getPostfix = computed(() => {
    let iconPostfix = '';
    if (isSelfFlight.value || store.config.allAircraftGreen) {
        iconPostfix = '-green';
    }
    else if (activeCurrentOverlay.value) {
        iconPostfix = '-active';
    }
    else if (props.isHovered || (airportOverlayTracks.value && !isOnGround.value)) {
        iconPostfix = '-hover';
    }
    else if (store.theme === 'light') iconPostfix = '-light';

    return iconPostfix;
});

const setStyle = () => {
    if (!feature) return;

    const styleIcon = new Icon({
        src: `/aircraft/${ icon.value.icon }${ getPostfix.value }.png?v=${ store.version }`,
        width: icon.value.width,
        rotation: degreesToRadians(props.aircraft.heading ?? 0),
        rotateWithView: true,
    });

    const iconStyle = new Style({
        image: styleIcon,
        zIndex: 10,
    });
    feature.setStyle(iconStyle);
};

const init = () => {
    if (!vectorSource.value) return;

    const iconFeature = feature || new Feature({
        id: props.aircraft.cid,
        type: 'aircraft',
        geometry: new Point(getCoordinates.value),
    });

    const oldCoords = (feature?.getGeometry() as Point)?.getCoordinates();

    if (oldCoords && oldCoords[0] === getCoordinates.value[0] && oldCoords[1] === getCoordinates.value[1]) return;

    if (feature) feature.setGeometry(new Point(getCoordinates.value));

    const existingStyle = iconFeature.getStyle() as Style;

    if (existingStyle) {
        existingStyle.getImage()!.setRotation(degreesToRadians(props.aircraft.heading ?? 0));
    }
    else {
        setStyle();
    }

    if (!feature) vectorSource.value.addFeature(iconFeature);

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

function toggleAirportLines(value: boolean) {
    if (value) {
        if (isOnGround.value) value = false;
    }

    const depAirport = value && props.aircraft.departure && dataStore.vatspy.value?.data.airports.find(x => x.icao === props.aircraft.departure);
    const arrAirport = value && props.aircraft.arrival && dataStore.vatspy.value?.data.airports.find(x => x.icao === props.aircraft.arrival);

    const color = isSelfFlight.value ? getCurrentThemeHexColor('success500') : activeCurrentOverlay.value ? getCurrentThemeHexColor('warning700') : getCurrentThemeHexColor('neutral150');

    if (depAirport) {
        const geometry = new LineString([
            [depAirport.lon, depAirport.lat],
            [props.aircraft?.longitude, props.aircraft?.latitude],
        ]);

        const style = new Style({
            stroke: new Stroke({
                color,
                width: 1,
            }),
        });

        if (depLine) {
            depLine.setGeometry(geometry);
            depLine.setStyle(style);
        }
        else {
            depLine = new Feature({
                geometry,
            });

            depLine.setStyle(style);

            vectorSource.value?.addFeature(depLine);
        }
    }
    else if (depLine) {
        depLine.dispose();
        vectorSource.value?.removeFeature(depLine);
        depLine = undefined;
    }

    if (arrAirport) {
        const geometry = new LineString([
            [props.aircraft?.longitude, props.aircraft?.latitude],
            [arrAirport.lon, arrAirport.lat],
        ]);

        const style = new Style({
            stroke: new Stroke({
                color,
                width: 1,
                lineDash: [4, 8],
            }),
        });

        if (arrLine) {
            arrLine.setGeometry(geometry);
            arrLine.setStyle(style);
        }
        else {
            arrLine = new Feature({
                geometry,
            });

            arrLine.setStyle(style);

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

    if ((activeCurrentOverlay.value?.data.pilot.status || airportOverlayTracks.value) && !isOnGround.value) {
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

watch(isShowLabel, (val) => {
    if (!val) {
        hovered.value = false;
    }
});

watch(dataStore.vatsim.updateTimestamp, init);

onBeforeUnmount(() => {
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
    width: 248px;
    background: $neutral1000;
    border-radius: 8px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 13px;

    &__pilot_content {
        display: grid;
        justify-content: space-between;
        align-items: center;
        grid-template-columns: 40px 160px;
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
            width: 0;
            flex: 1 1 0;
        }
    }
}

.aircraft-label {
    padding-top: 3px;
    width: fit-content;
    transform: translate(-50%, 0);
    top: calc(var(--imageHeight) / 2);
    position: absolute;
    color: $primary500;
    font-size: 11px;
    user-select: none;
    cursor: pointer;
    font-weight: 600;

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
