<template>
    <slot v-if="!isVisible"/>
    <template v-else>
        <map-overlay v-if="aircrafts.groundDep?.length || aircrafts.groundArr?.length || aircrafts.prefiles?.length" :settings="{position: [airport.lon, airport.lat], offset: [50,0], positioning: 'center-right'}" persistent :z-index="hoveredType ? 21 : 15">
            <div class="airport-counts" @mouseleave="hoveredType = null">
                <div class="airport-counts_item airport-counts_item--groundDep" v-if="aircrafts.groundDep?.length" @mouseover="$nextTick(() => hoveredType = 'groundDep')">
                    {{ aircrafts.groundDep.length }}
                </div>
                <div class="airport-counts_item airport-counts_item--prefiles" v-if="aircrafts.prefiles?.length" @mouseover="$nextTick(() => hoveredType = 'prefiles')">
                    {{ aircrafts.prefiles.length }}
                </div>
                <div class="airport-counts_item airport-counts_item--groundArr" v-if="aircrafts.groundArr?.length" @mouseover="$nextTick(() => hoveredType = 'groundArr')">
                    {{ aircrafts.groundArr.length }}
                </div>
                <common-popup-block class="airport-counts__airplanes" v-if="hoveredAirplanes.length">
                    <template #title>
                        <div class="airport-counts__airplanes_title" :class="[`airport-counts__airplanes_title--${hoveredType}`]">
                            {{ airport.icao }}
                            <template v-if="hoveredType === 'groundDep'">
                                Departures
                            </template>
                            <template v-else-if="hoveredType === 'groundArr'">
                                Arrivals
                            </template>
                            <template v-else-if="hoveredType === 'prefiles'">
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
import type { MapAirport } from '~/types/map';
import { Feature } from 'ol';
import type VectorSource from 'ol/source/Vector';
import { Point } from 'ol/geom';
import { Fill, Style, Text } from 'ol/style';
import { useDataStore } from '~/store/data';

const props = defineProps({
    airport: {
        type: Object as PropType<VatSpyData['airports'][0]>,
        required: true,
    },
    aircrafts: {
        type: Object as PropType<MapAirport['aircrafts']>,
        required: true,
    },
    isVisible: {
        type: Boolean,
        default: false,
    },
});

const dataStore = useDataStore();
const vectorSource = inject<ShallowRef<VectorSource | null>>('vector-source')!;
const hoveredType = ref<keyof MapAirport['aircrafts'] | null>(null);
const hoveredAirplanes = computed(() => {
    switch (hoveredType.value) {
        case 'groundDep':
            return dataStore.vatsim.data!.pilots.filter(x => props.aircrafts?.groundDep?.includes(x.cid));
        case 'groundArr':
            return dataStore.vatsim.data!.pilots.filter(x => props.aircrafts?.groundArr?.includes(x.cid));
        case 'prefiles':
            return dataStore.vatsim.data!.prefiles.filter(x => props.aircrafts?.prefiles?.includes(x.cid));
    }

    return [];
});
let feature: Feature | null = null;

onMounted(() => {
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
});

onBeforeUnmount(() => {
    if (feature) {
        vectorSource.value?.removeFeature(feature);
        feature.dispose();
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
</style>
