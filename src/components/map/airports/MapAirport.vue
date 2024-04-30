<template>
    <map-overlay
        v-if="localAtc.length"
        :popup="!!hoveredFacility"
        @update:popup="!$event ? hoveredFacility = false : undefined"
        :settings="{position: [airport.lon, airport.lat], positioning: 'center-center', stopEvent: !!hoveredFacility,}"
        persistent
        :z-index="15"
        :active-z-index="21"
    >
        <div class="airport" @mouseleave="hoveredFacility = false" :style="{'--color': getAirportColor}">
            <div class="airport_title" @mouseover="hoveredFacility = true">
                {{ airportName }}
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
                v-if="hoveredFacility && mapStore.canShowOverlay"
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
        :offset="localAtc.length ? [localATCOffsetX, 0] : undefined"
        :hide="!isVisible"
    />
    <map-overlay
        v-if="isHovered"
        model-value
        :settings="
            isTracon ?
                { position: hoveredPixel!, positioning: 'top-center', offset: [0, 10], stopEvent: true } :
                { position: [airport.lon, airport.lat + 80000], positioning: 'top-center', stopEvent: true }
        "
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
import { Feature } from 'ol';
import type VectorSource from 'ol/source/Vector';
import { Circle, Point } from 'ol/geom';
import { Fill, Stroke, Style, Text } from 'ol/style';
import { fromCircle } from 'ol/geom/Polygon';
import { toRadians } from 'ol/math';
import type { VatsimShortenedController } from '~/types/data/vatsim';
import { sortControllersByPosition } from '~/composables/atc';
import MapAirportCounts from '~/components/map/airports/MapAirportCounts.vue';
import type { NavigraphGate } from '~/types/data/navigraph';
import { useMapStore } from '~/store/map';
import { getCurrentThemeRgbColor } from '~/composables';
import { GeoJSON } from 'ol/format';
import type { Coordinate } from 'ol/coordinate';

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

const dataStore = useDataStore();
const mapStore = useMapStore();
const vectorSource = inject<ShallowRef<VectorSource | null>>('vector-source')!;
const hoveredFacility = ref<boolean | number>(false);
const isTracon = ref(false);

const hoveredFacilities = computed(() => {
    if (!hoveredFacility.value) return [];
    if (hoveredFacility.value === true) return localsFacilities.value.flatMap(x => x.atc);
    return localsFacilities.value.find(x => x.facility === hoveredFacility.value)?.atc ?? [];
});

const localATCOffsetX = computed(() => {
    const offset = localsFacilities.value.length * 16 + 12;
    if (offset < 30) return 30;
    return offset / 2 + 5;
});

const getAirportColor = computed(() => {
    const hasOverlay = mapStore.overlays.some(x => x.type === 'pilot' && (x.data.pilot.airport === props.airport.icao || x.data.pilot.flight_plan?.departure === props.airport.icao || x.data.pilot.flight_plan?.arrival === props.airport.icao));

    if (!hasOverlay) {
        if (!props.localAtc?.length) return `rgba(${ getCurrentThemeRgbColor('neutral150').join(',') }, 0.8)`;
        return radarColors.neutral150;
    }

    if (!props.localAtc?.length) return `rgba(${ radarColors.warning500Rgb.join(',') }, 0.8)`;
    return radarColors.warning500;
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

const airportName = computed(() => (props.airport.isPseudo && props.airport.iata) ? props.airport.iata : props.airport.icao);

function initAirport() {
    feature = new Feature({
        geometry: new Point([props.airport.lon, props.airport.lat]),
    });

    feature.setStyle(new Style({
        text: new Text({
            font: '12px Montserrat',
            text: airportName.value,
            fill: new Fill({
                color: getAirportColor.value,
            }),
        }),
    }));

    vectorSource.value?.addFeature(feature);
}

watch(getAirportColor, () => {
    if (!feature) return;

    feature.setStyle(new Style({
        text: new Text({
            font: '12px Montserrat',
            text: airportName.value,
            fill: new Fill({
                color: getAirportColor.value,
            }),
        }),
    }));
});

function setFeatureStyle() {
    arrFeature?.setStyle(new Style({
        stroke: new Stroke({
            color: '#3B6CEC',
            width: 2,
        }),
        text: new Text({
            font: 'bold 14px Montserrat',
            text: airportName.value,
            placement: 'line',
            offsetY: -10,
            textAlign: isTracon.value ? 'left' : 'center',
            maxAngle: isTracon.value ? undefined : toRadians(20),
            fill: new Fill({
                color: '#3B6CEC',
            }),
        }),
    }));
}

onMounted(() => {
    const localsLength = computed(() => props.localAtc.length);
    const atcLength = computed(() => props.arrAtc.length);
    const gates = computed(() => props.gates);

    if (props.airport.iata === 'SOLENT') console.log(atcLength.value);

    watch(localsLength, (val) => {
        if (!val && !feature) {
            return initAirport();
        }
        else if (val && feature) {
            vectorSource.value?.removeFeature(feature);
            feature.dispose();
            feature = null;
        }
    }, {
        immediate: true,
    });

    watch(atcLength, (val) => {
        if (!val && arrFeature) {
            vectorSource.value?.removeFeature(arrFeature);
            arrFeature.dispose();
            arrFeature = null;
            return;
        }

        if (!val || arrFeature) return;

        let tracon = dataStore.simaware.value?.data.features.find((x) => {
            return props.arrAtc.some((y) => {
                if (typeof x.properties?.prefix === 'string') return y.callsign.startsWith(x.properties.prefix);

                return (x.properties?.prefix as string[])?.some(x => y.callsign.startsWith(x));
            });
        });

        //If didn't find by prefix
        if (!tracon) tracon = dataStore.simaware.value?.data.features.find(x => x.properties?.id === airportName.value);

        if (!tracon) {
            arrFeature = new Feature({
                geometry: fromCircle(new Circle([props.airport.lon, props.airport.lat], 80000), undefined, toRadians(-90)),
                icao: props.airport.icao,
                iata: props.airport.iata,
                type: 'circle',
            });
            isTracon.value = false;
        }
        else {
            arrFeature = new GeoJSON().readFeature(tracon);
            arrFeature?.setProperties({
                ...(arrFeature?.getProperties() ?? {}),
                icao: props.airport.icao,
                iata: props.airport.iata,
                type: 'tracon',
            });
            isTracon.value = true;
        }

        setFeatureStyle();
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
        feature = null;
    }

    if (arrFeature) {
        vectorSource.value?.removeFeature(arrFeature);
        arrFeature.dispose();
        arrFeature = null;
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
        color: var(--color);
    }

    &_facilities {
        display: flex;
        justify-content: center;
        margin-top: 4px;
        font-weight: 600;
        color: $neutral0Orig;

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

            &--hovered:not(:only-child) {
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
