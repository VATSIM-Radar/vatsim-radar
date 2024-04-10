<template>
    <slot v-if="!isVisible && !localAtc.length"/>
    <template v-else>
        <map-overlay
            v-if="localAtc.length"
            :popup="!!hoveredFacility"
            @update:popup="!$event ? hoveredFacility = false : undefined"
            :settings="{position: [airport.lon, airport.lat], positioning: 'top-left'}"
            persistent
            :z-index="15"
            :active-z-index="21"
        >
            <div class="airport">
                <div class="airport_title">
                    {{ airport.icao }}
                </div>
                <div class="airport_facilities">
                    <div
                        class="airport_facilities_facility"
                        v-for="local in localsFacilities"
                        :key="local.facility"
                        :style="{background: getControllerPositionColor(local.atc[0])}"
                    >
                        {{ local.facility === -1 ? 'A' : dataStore.vatsim.data?.facilities.find(x => x.id === local.facility)?.short.slice(0,1) }}
                    </div>
                </div>
            </div>
        </map-overlay>
        <map-overlay
            v-else-if="isVisible && (aircrafts.groundDep?.length || aircrafts.groundArr?.length || aircrafts.prefiles?.length)"
            :popup="!!aircraftHoveredType"
            @update:popup="!$event ? aircraftHoveredType = null : undefined"
            :settings="{position: [airport.lon, airport.lat], offset: [50,0], positioning: 'center-right'}"
            persistent
            :z-index="15"
            :active-z-index="21"
        >
            <div class="airport-counts" @mouseleave="aircraftHoveredType = null">
                <div
                    class="airport-counts_item airport-counts_item--groundDep"
                    v-if="aircrafts.groundDep?.length"
                    @mouseover="$nextTick(() => aircraftHoveredType = 'groundDep')"
                >
                    {{ aircrafts.groundDep.length }}
                </div>
                <div
                    class="airport-counts_item airport-counts_item--prefiles"
                    v-if="aircrafts.prefiles?.length"
                    @mouseover="$nextTick(() => aircraftHoveredType = 'prefiles')"
                >
                    {{ aircrafts.prefiles.length }}
                </div>
                <div
                    class="airport-counts_item airport-counts_item--groundArr"
                    v-if="aircrafts.groundArr?.length"
                    @mouseover="$nextTick(() => aircraftHoveredType = 'groundArr')"
                >
                    {{ aircrafts.groundArr.length }}
                </div>
                <common-popup-block class="airport-counts__airplanes" v-if="hoveredAirplanes.length">
                    <template #title>
                        <div
                            class="airport-counts__airplanes_title"
                            :class="[`airport-counts__airplanes_title--${aircraftHoveredType}`]"
                        >
                            {{ airport.icao }}
                            <template v-if="aircraftHoveredType === 'groundDep'">
                                Departures
                            </template>
                            <template v-else-if="aircraftHoveredType === 'groundArr'">
                                Arrivals
                            </template>
                            <template v-else-if="aircraftHoveredType === 'prefiles'">
                                Prefiles
                            </template>
                        </div>
                    </template>
                    <div class="airport-counts__airplanes_list">
                        <common-info-block
                            :top-items="[
                                aircraft.callsign,
                                aircraft.aircraft_faa,
                                aircraft.arrival || null,
                                aircraft.name,
                            ]"
                            v-for="aircraft in hoveredAirplanes"
                            :key="aircraft.cid"
                            is-button
                        >
                            <template #top="{item, index}">
                                <div class="airport-counts__popup-callsign" v-if="index === 0">
                                    {{ item }}
                                </div>
                                <template v-else-if="index === 2">
                                    <span class="airport-counts__popup-info">
                                        to
                                    </span>
                                    {{ item }}
                                </template>
                                <div class="airport-counts__popup-info" v-else>
                                    {{ item }}
                                </div>
                            </template>
                        </common-info-block>
                    </div>
                </common-popup-block>
            </div>
        </map-overlay>
    </template>
</template>

<script setup lang="ts">
import type { VatSpyData } from '~/types/data/vatspy';
import type { PropType, ShallowRef } from 'vue';
import type { MapAircraft, MapAirport } from '~/types/map';
import { Feature } from 'ol';
import type VectorSource from 'ol/source/Vector';
import { Circle, Point } from 'ol/geom';
import { Fill, Stroke, Style, Text } from 'ol/style';
import { useDataStore } from '~/store/data';
import { fromCircle } from 'ol/geom/Polygon';
import { toRadians } from 'ol/math';
import type { VatsimShortenedController } from '~/types/data/vatsim';
import { sortControllersByPosition } from '~/composables/atc';

const props = defineProps({
    airport: {
        type: Object as PropType<VatSpyData['airports'][0]>,
        required: true,
    },
    aircrafts: {
        type: Object as PropType<MapAircraft>,
        required: true,
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
});

const dataStore = useDataStore();
const vectorSource = inject<ShallowRef<VectorSource | null>>('vector-source')!;
const aircraftHoveredType = ref<keyof MapAirport['aircrafts'] | null>(null);
const hoveredFacility = ref<boolean | number>(false);

const localsFacilities = computed(() => {
    const facilities: {facility: number, atc: VatsimShortenedController[]}[] = [];

    for (const local of props.localAtc) {
        const existingFacility = facilities.find(x => x.facility === (local.atis_code ? -1 : local.facility));
        if (!existingFacility) {
            facilities.push({
                facility: local.atis_code ? -1 : local.facility,
                atc: [local],
            });
            continue;
        }

        existingFacility.atc.push(local);
    }

    return sortControllersByPosition(facilities);
});

const hoveredAirplanes = computed(() => {
    switch (aircraftHoveredType.value) {
        case 'groundDep':
            return props.aircrafts?.groundDep ?? [];
        case 'groundArr':
            return props.aircrafts?.groundArr ?? [];
        case 'prefiles':
            return props.aircrafts?.prefiles ?? [];
    }

    return [];
});

let feature: Feature | null = null;
let arrFeature: Feature | null = null;

function initAirport() {
    feature = new Feature({
        geometry: new Point([props.airport.lon, props.airport.lat]),
    });

    feature.setStyle(new Style({
        text: new Text({
            font: '12px Arial',
            text: props.airport.icao,
            fill: new Fill({
                color: 'rgba(230, 230, 235, 0.8)',
            }),
        }),
    }));

    vectorSource.value?.addFeature(feature);
}

onMounted(() => {
    const atcLength = computed(() => props.localAtc.length);

    watch(atcLength, (val) => {
        if (!val && arrFeature) {
            vectorSource.value?.removeFeature(arrFeature);
            arrFeature.dispose();
        }

        if (!val && !feature) {
            return initAirport();
        }
        else if (val && feature) {
            vectorSource.value?.removeFeature(feature);
            feature.dispose();
        }

        if (arrFeature) return;

        arrFeature = new Feature({
            geometry: fromCircle(new Circle([props.airport.lon, props.airport.lat], 80000), undefined, toRadians(-90)),
        });
        arrFeature.setStyle(new Style({
            stroke: new Stroke({
                color: '#3B6CEC',
                width: 2,
            }),
            text: new Text({
                font: 'bold 14px Arial',
                text: props.airport.icao,
                placement: 'line',
                offsetY: -10,
                textAlign: 'center',
                maxAngle: toRadians(20),
                fill: new Fill({
                    color: '#3B6CEC',
                }),
            }),
        }));
        vectorSource.value?.addFeature(arrFeature);
    }, {
        immediate: true,
    });
});

onBeforeUnmount(() => {
    if (feature) {
        vectorSource.value?.removeFeature(feature);
        feature.dispose();
    }

    if (arrFeature) {
        vectorSource.value?.removeFeature(arrFeature);
        arrFeature.dispose();
    }
});
</script>

<style lang="scss" scoped>
.airport-counts {
    display: flex;
    flex-direction: column;
    user-select: none;
    position: relative;

    .airport-counts_item, .airport-counts__airplanes_title {
        &--groundDep {
            color: $success500;
        }

        &--prefiles {
            color: $neutral200;
        }

        &--groundArr {
            color: $error500;
        }
    }

    &__popup-callsign {
        color: $primary500
    }

    &__popup-info {
        font-weight: 400;
    }

    &_item {
        font-size: 11px;
        display: flex;
        align-items: center;
        gap: 4px;
        line-height: 100%;
        cursor: pointer;

        &::before {
            content: '';
            display: block;
            position: relative;
        }

        &--groundDep {
            &::before {
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-bottom: 6px solid currentColor;
                border-top: 6px solid transparent;
                top: -2px;
            }
        }

        &--prefiles {
            &::before {
                width: 12px;
                height: 5px;
                background: currentColor;
            }
        }

        &--groundArr {
            &::before {
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-bottom: 6px solid transparent;
                border-top: 6px solid currentColor;
                top: 2px;
            }
        }
    }

    &__airplanes {
        position: absolute;
        top: 0;
        left: 100%;
        width: max-content;

        &_list {
            max-height: 360px;
            overflow: auto;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
    }
}

.airport {
background: varToRgba('neutral800', 0.5);
    color: $neutral150;
    padding: 4px;
    border-radius: 4px;
    font-size: 11px;
    text-align: center;
    cursor: initial;

    &_title {
        cursor: pointer;
    }

    &_facilities {
        display: flex;
        justify-content: center;
        margin-top: 4px;
        font-weight: 600;
        color: $neutral0;

        &_facility {
            width: 16px;
            height: 16px;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;

            &:first-child {
                border-radius: 4px 0 0 4px;
            }
            &:last-child {
                border-radius: 0 4px 4px 0;
            }

            &:only-child {
                border-radius: 4px;
            }
        }
    }
}
</style>
