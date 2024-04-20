<template>
    <template v-if="!props.isHovered && !showLabel">
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
            @update:overlay="store.openPilotOverlay = !!$event"
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
                    <common-info-block class="aircraft-hover__pilot" is-button>
                        <template #bottom>
                            <div class="aircraft-hover__pilot_content">
                                <div class="aircraft-hover__pilot__title">
                                    Pilot
                                </div>
                                <div class="aircraft-hover__pilot__text">
                                    {{ aircraft.name }}<br>
                                    {{ usePilotRating(aircraft).join(' | ') }}
                                </div>
                            </div>
                        </template>
                    </common-info-block>
                    <div class="aircraft-hover__section" v-if="aircraft.departure">
                        <div class="aircraft-hover__section_title">
                            From
                        </div>
                        <common-info-block class="aircraft-hover__section_content" is-button>
                            <template #top>
                                {{ aircraft.departure }}
                            </template>
                            <template #bottom v-if="depAirport">
                                {{ depAirport.name }}
                            </template>
                        </common-info-block>
                    </div>
                    <div class="aircraft-hover__section" v-if="aircraft.arrival">
                        <div class="aircraft-hover__section_title">
                            To
                        </div>
                        <common-info-block class="aircraft-hover__section_content" is-button>
                            <template #top>
                                {{ aircraft.arrival }}
                            </template>
                            <template #bottom v-if="arrAirport">
                                {{ arrAirport.name }}
                            </template>
                        </common-info-block>
                    </div>
                </div>
                <div class="aircraft-hover_footer">
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
                            {{ usePilotTrueAltitude(aircraft) }} ft
                        </template>
                    </common-info-block>
                </div>
            </common-popup-block>
        </map-overlay>
        <map-overlay
            class="aircraft-overlay"
            :style="{'--imageHeight': `${imageHeight}px`}"
            :model-value="showLabel"
            :settings="{
                position: getCoordinates,
                offset: [0, 0]
            }"
            :z-index="19"
            persistent
        >
            <div class="aircraft-label" @mouseover="store.canShowOverlay ? hovered = true : undefined" @mouseleave="hovered = false">
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
import { Point } from 'ol/geom';
import { Icon, Style } from 'ol/style';
import { getAirportByIcao, usePilotRating, usePilotTrueAltitude } from '~/composables/pilots';
import { sleep } from '~/utils';
import { useStore } from '~/store';
import { getAircraftIcon } from '~/utils/icons';

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
let feature: Feature | undefined;
const store = useStore();
const dataStore = useDataStore();
const imageHeight = ref(0);

function degreesToRadians(degrees: number) {
    return degrees * (Math.PI / 180);
}

const getCoordinates = computed(() => [props.aircraft.longitude, props.aircraft.latitude]);
const depAirport = computed(() => getAirportByIcao(props.aircraft.departure));
const arrAirport = computed(() => getAirportByIcao(props.aircraft.arrival));

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
        const icon = getAircraftIcon(props.aircraft);

        const styleIcon = new Icon({
            src: `/aircrafts/${ icon.icon }.png`,
            width: icon.width,
            rotation: degreesToRadians(props.aircraft.heading ?? 0),
        });

        const iconStyle = new Style({
            image: styleIcon,
            zIndex: 10,
        });
        iconFeature.setStyle(iconStyle);

        new Promise<number>((resolve) => {
            let iterations = 0;
            const height = styleIcon.getHeight();
            if (height) resolve(height);

            const interval = setInterval(() => {
                iterations++;
                if (iterations > 10) {
                    clearInterval(interval);
                    resolve(0);
                }
                else {
                    const height = styleIcon.getHeight();
                    if (height) {
                        clearInterval(interval);
                        resolve(height);
                    }
                }
            }, 1000);
        }).then((num) => {
            imageHeight.value = num;
        });
    }

    if (!feature) vectorSource.value.addFeature(iconFeature);

    feature = iconFeature;
};

watch(() => props.isHovered, async (val) => {
    if (!feature) return;

    const icon = getAircraftIcon(props.aircraft);

    const styleIcon = new Icon({
        src: `/aircrafts/${ icon.icon }${ val ? '-hover' : '' }.png`,
        width: icon.width,
        rotation: degreesToRadians(props.aircraft.heading ?? 0),
    });

    feature.setStyle(new Style({
        image: styleIcon,
        zIndex: 10,
    }));
    await sleep(0);
    imageHeight.value = styleIcon.getHeight();
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

const showLabel = computed(() => props.showLabel);

watch(showLabel, (val) => {
    if (!val) {
        hovered.value = false;
    }
});

watch(dataStore.vatsim.updateTimestamp, init);

onBeforeUnmount(() => {
    if (store.openPilotOverlay) store.openPilotOverlay = false;
    if (feature) {
        vectorSource.value?.removeFeature(feature);
    }
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

    &__pilot_content, &__section {
        display: grid;
        justify-content: space-between;
        align-items: center;
    }

    &__pilot {
        &_content {
            grid-template-columns: 40px 160px;
        }

        &__title {
            font-weight: 600;
        }
    }

    &__section {
        padding-left: 8px;
        grid-template-columns: 40px 176px;

        &_title {
            font-weight: 700;
        }
    }

    &_body {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    &_footer {
        display: flex;
        gap: 4px;

        >*{
            width: 100%;
        }
    }
}

.aircraft-label {
    width: fit-content;
    transform: translate(-50%, 0);
    top: calc(var(--imageHeight) / 2);
    position: absolute;
    color: $neutral150;
    font-size: 12px;
    user-select: none;
    cursor: pointer;
}
</style>
