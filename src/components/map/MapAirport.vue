<template>
    <map-overlay
        v-if="localAtc.length"
        :popup="!!hoveredFacility"
        @update:popup="!$event ? hoveredFacility = false : undefined"
        :settings="{position: [airport.lon, airport.lat], positioning: 'top-left', stopEvent: !!hoveredFacility,}"
        persistent
        :z-index="15"
        :active-z-index="21"
    >
        <div class="airport" @mouseleave="hoveredFacility = false">
            <div class="airport_title" @mouseover="hoveredFacility = true">
                {{ airport.icao }}
            </div>
            <div class="airport_facilities">
                <div
                    class="airport_facilities_facility"
                    :class="{'airport_facilities_facility--hovered': hoveredFacility === local.facility}"
                    v-for="local in localsFacilities"
                    :key="local.facility"
                    :style="{background: getControllerPositionColor(local.atc[0])}"
                    @mouseover="hoveredFacility = local.facility"
                >
                    {{
                        local.facility === -1 ? 'A' : dataStore.vatsim.data.facilities.value.find(x => x.id === local.facility)?.short.slice(0, 1)
                    }}
                </div>
            </div>
            <common-controller-info
                class="airport_atc-popup"
                :class="{'airport_atc-popup--all': hoveredFacility === true}"
                absolute
                v-if="hoveredFacility && store.canShowOverlay"
                :show-facility="hoveredFacility === true"
                :show-atis="hoveredFacility !== true"
                :controllers="hoveredFacilities"
            >
                <template #title>
                    {{ airport.name }}
                    <template v-if="hoveredFacility === true">
                        Controllers
                    </template>
                    <template v-else>
                        {{
                            hoveredFacility === -1 ? 'ATIS' : dataStore.vatsim.data.facilities.value.find(x => x.id === hoveredFacility)?.long
                        }}
                    </template>
                </template>
            </common-controller-info>
        </div>
    </map-overlay>
    <map-airport-counts
        :aircrafts="aircrafts"
        :airport="airport"
        :offset="localAtc.length ? [localATCOffsetX, 10] : undefined"
        :hide="!isVisible"
    />
    <map-overlay
        v-if="isHovered"
        model-value
        :settings="{position: [airport.lon, airport.lat + 80000], positioning: 'top-center', stopEvent: true}"
        :z-index="21"
        @mouseover="$emit('manualHover')"
        @mouseleave="$emit('manualHide')"
    >
        <common-controller-info :controllers="arrAtc" show-atis>
            <template #title>
                {{ airport.name }} Approach/Departure
            </template>
        </common-controller-info>
    </map-overlay>
</template>

<script setup lang="ts">
import type { VatSpyData } from '~/types/data/vatspy';
import type { PropType, ShallowRef } from 'vue';
import type { MapAircraft } from '~/types/map';
import { Feature  } from 'ol';
import type VectorSource from 'ol/source/Vector';
import { Circle, Point } from 'ol/geom';
import { Fill, Stroke, Style, Text } from 'ol/style';
import { fromCircle } from 'ol/geom/Polygon';
import { toRadians } from 'ol/math';
import type { VatsimShortenedController } from '~/types/data/vatsim';
import { sortControllersByPosition } from '~/composables/atc';
import MapAirportCounts from '~/components/map/MapAirportCounts.vue';
import type { NavigraphGate } from '~/types/data/navigraph';
import { useStore } from '~/store';

const props = defineProps({
    airport: {
        type: Object as PropType<VatSpyData['airports'][0]>,
        required: true,
    },
    aircrafts: {
        type: Object as PropType<MapAircraft>,
        required: true,
    },
    gates: {
        type: Array as PropType<NavigraphGate[] | undefined>,
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
    isHovered: {
        type: Boolean,
        default: false,
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

const store = useStore();
const dataStore = useDataStore();
const vectorSource = inject<ShallowRef<VectorSource | null>>('vector-source')!;
const hoveredFacility = ref<boolean | number>(false);

const hoveredFacilities = computed(() => {
    if (!hoveredFacility.value) return [];
    if (hoveredFacility.value === true) return localsFacilities.value.flatMap(x => x.atc);
    return localsFacilities.value.find(x => x.facility === hoveredFacility.value)?.atc ?? [];
});

const localATCOffsetX = computed(() => {
    const offset = localsFacilities.value.length * 16 + 12;
    if (offset < 48) return 48;
    return offset;
});

const localsFacilities = computed(() => {
    const facilities: { facility: number, atc: VatsimShortenedController[] }[] = [];

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
let arrFeature: Feature | null = null;
let gatesFeatures: Feature[] = [];

function initAirport() {
    feature = new Feature({
        geometry: new Point([props.airport.lon, props.airport.lat]),
    });

    feature.setStyle(new Style({
        text: new Text({
            font: '12px Montserrat',
            text: props.airport.icao,
            fill: new Fill({
                color: 'rgba(230, 230, 235, 0.8)',
            }),
        }),
    }));

    vectorSource.value?.addFeature(feature);
}

onMounted(() => {
    const localsLength = computed(() => props.localAtc.length);
    const atcLength = computed(() => props.arrAtc.length);
    const gates = computed(() => props.gates);

    watch(localsLength, (val) => {
        if (!val && !feature) {
            return initAirport();
        }
        else if (val && feature) {
            vectorSource.value?.removeFeature(feature);
            feature.dispose();
        }
    }, {
        immediate: true,
    });

    watch(atcLength, (val) => {
        if (!val && arrFeature) {
            vectorSource.value?.removeFeature(arrFeature);
            arrFeature.dispose();
            return;
        }

        if (!val || arrFeature) return;

        arrFeature = new Feature({
            geometry: fromCircle(new Circle([props.airport.lon, props.airport.lat], 80000), undefined, toRadians(-90)),
            icao: props.airport.icao,
            type: 'circle',
        });
        arrFeature.setStyle(new Style({
            stroke: new Stroke({
                color: '#3B6CEC',
                width: 2,
            }),
            text: new Text({
                font: 'bold 14px Montserrat',
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

    watch(gates, (val) => {
        if (!val?.length) {
            gatesFeatures.forEach((feature) => {
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
            const color = gate.trulyOccupied ? 'rgba(203, 66, 28, 0.8)' : gate.maybeOccupied ? 'rgba(232, 202, 76, 0.8)' : 'rgba(0, 136, 86, 0.8)';

            const existingFeature = gatesFeatures.find(x => x.getProperties().identifier === gate.gate_identifier);
            if (existingFeature) {
                const style = existingFeature.getStyle() as Style;
                if (style.getText()?.getFill()?.getColor() !== color) {
                    existingFeature.setStyle(new Style({
                        text: new Text({
                            font: '14px Montserrat',
                            text: gate.name || gate.gate_identifier,
                            textAlign: 'center',
                            fill: new Fill({
                                color,
                            }),
                        }),
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
                        font: '14px Montserrat',
                        text: gate.name || gate.gate_identifier,
                        textAlign: 'center',
                        fill: new Fill({
                            color,
                        }),
                    }),
                }));
                gatesFeatures.push(feature);
                vectorSource.value?.addFeature(feature);
            }
        }
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

    gatesFeatures.forEach((feature) => {
        vectorSource.value?.removeFeature(feature);
        feature.dispose();
    });
});
</script>

<style lang="scss" scoped>
.airport {
    background: varToRgba('neutral800', 0.5);
    color: $neutral150;
    padding: 4px;
    border-radius: 4px;
    font-size: 11px;
    text-align: center;
    cursor: initial;
    display: flex;
    flex-direction: column;

    &_title, &_facilities {
        user-select: none;
    }

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

            &--hovered {
                transform: scale(1.1);
            }
        }
    }

    &_atc-popup {
        align-self: center;
        top: 100%;

        &--all {
            top: auto;
            bottom: 100%;
        }
    }
}
</style>
