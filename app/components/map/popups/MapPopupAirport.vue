<template>
    <map-html-overlay
        ref="overlay"
        class="select-result"
        is-interaction
        model-value
        :settings="{
            //position: payload.coordinate,
            position: getPosition,
            offset: [0, getOffsetY],
            stopEvent: true,
            positioning: type === 'airport' ? 'bottom-center' : 'top-center',
        }"
        :z-index="20"
        @id="$emit('id', $event)"
        @pointermove.stop
        @update:overlay="!$event && emit('close')"
    >
        <vatsim-controllers-list
            class="airport_atc-popup"
            :controllers="getATC"
            max-height="400px"
            :show-atis="type !== 'airport'"
            :show-facility="type === 'airport'"
            @click.stop
        >
            <template #title>
                <template v-if="'name' in properties">
                    {{properties.name}}
                    <template v-if="type === 'airport'">
                        Controllers
                    </template>
                </template>
                <template v-else-if="'facility' in properties">
                    {{ dataStore.vatspy.value?.data.keyAirports.icao[(properties as any).icao]?.name }}
                    {{
                        properties.facility.facility === -1 ? 'ATIS' : dataStore.vatsim.data.facilities.value.find(x => x.id === (properties as any).facility.facility)?.long
                    }}
                </template>
                <template v-else>
                    {{ dataStore.vatspy.value?.data.keyAirports.icao[(properties as any).icao]?.name }} Approach/Departure
                </template>
            </template>
        </vatsim-controllers-list>
    </map-html-overlay>
</template>

<script setup lang="ts">
import type { RadarEventPayload } from '~/composables/vatsim/events';
import type { FeatureAirport, FeatureAirportApproachLabel, FeatureAirportAtc, FeatureSector, FeatureSectorVG } from '~/utils/map/entities';
import {
    isMapFeature,
} from '~/utils/map/entities';
import VatsimControllersList from '~/components/features/vatsim/controllers/VatsimControllersList.vue';
import MapHtmlOverlay from '~/components/map/MapHtmlOverlay.vue';
import { getCurrentWorldCoordinate } from '~/composables/map/world';
import type { Coordinate } from 'ol/coordinate.js';

const props = defineProps({
    payload: {
        type: Object as PropType<RadarEventPayload<FeatureAirport | FeatureAirportAtc | FeatureAirportApproachLabel | FeatureSector | FeatureSectorVG>>,
        required: true,
    },
});

const emit = defineEmits({
    id(id: string) {
        return true;
    },
    close() {
        return true;
    },
});

const dataStore = useDataStore();
const mapStore = useMapStore();
const properties = computed(() => props.payload.feature.getProperties());
const type = computed(() => properties.value.type);
const getOffsetY = computed(() => {
    switch (properties.value.type) {
        case 'airport':
            return -10;
        case 'airport-atc':
            return mapStore.compactAirportView ? 10 : 20;
        default:
            return 10;
    }
});

const overlay = ref<{ $el: HTMLDivElement } | null>(null);

/* const scrollable = useScrollExists(computed(() => {
    return overlay.value?.$el.querySelector('.atc-popup_list');
}));*/

const getATC = computed(() => {
    const props = properties.value;

    if (isMapFeature('airport-atc', props)) return props.facility.atc;
    else return props.atc;
});

const getPosition = computed<Coordinate>(() => {
    const featureProps = properties.value;

    if (isMapFeature('sector-vatglasses', featureProps)) {
        return props.payload.coordinate;
    }

    if (isMapFeature('sector', featureProps)) {
        return [
            getCurrentWorldCoordinate({ coordinate: featureProps.label, eventCoordinate: props.payload.coordinate })[0],
            featureProps.label[1],
        ];
    }

    return [
        props.payload.coordinate[0],
        (props.payload.feature.getGeometry()?.getCoordinates() as Coordinate)[1] ?? props.payload.coordinate[1],
    ];
});
</script>

<style lang="scss" scoped>
.airport_atc-popup {
    width: 100%;
}
</style>
