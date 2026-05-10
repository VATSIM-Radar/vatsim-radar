<template>
    <map-html-overlay
        ref="overlay"
        class="popup-airport"
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
        <popup-map-info
            v-if="vatGlassesCombinedActive && payload.additionalPayload?.length"
            class="airport_atc-vgList"
            model-value
            :open-from="type === 'airport' ? 'bottom-center' : 'top-center'"
            @update:modelValue="$emit('close')"
        >
            <template #title>
                Positions
            </template>
            <div
                v-for="(sector, index) in payload.additionalPayload"
                :key="index"
                class="atc-popup_list"
            >
                <template v-if="index === 0 || sector.max !== payload.additionalPayload[index - 1].min">
                    <ui-text
                        class="atc-popup_level"
                        tag="span"
                        type="2b"
                    >{{ getPositionLevel(sector.max) }}</ui-text>
                </template>

                <vatsim-controller-info
                    v-for="controller in sector.atc"
                    :key="controller.cid"
                    :controller
                />
                <template v-if="sector.min === 0">
                    <ui-text
                        class="atc-popup_level"
                        tag="span"
                        type="2b"
                    >GND</ui-text>
                </template>
                <template v-else>
                    <ui-text
                        class="atc-popup_level"
                        tag="span"
                        type="2b"
                    >{{ getPositionLevel(sector.min) }}</ui-text>
                </template>
            </div>
        </popup-map-info>
        <vatsim-controllers-list
            v-else
            class="airport_atc-popup"
            :controllers="getATC"
            max-height="250px"
            :open-from="type === 'airport' ? 'bottom-center' : 'top-center'"
            :show-atis="type !== 'airport'"
            :show-facility="type === 'airport'"
            @click.stop
        >
            <template #title>
                {{getPopupName}}
            </template>

            <template #prepend>
                <nuxt-link
                    v-if="event"
                    class="popup-airport_event"
                    target="_blank"
                    :to="`/events/${ event.id }`"
                >
                    <div class="popup-airport_event_title">
                        <ui-text
                            class="popup-airport_event_title_name"
                            type="3b-medium"
                        >
                            {{event.name}}
                        </ui-text>

                        <ui-text
                            class="popup-airport_event_title_type"
                            type="caption-medium-alt"
                        >
                            {{event.type}}
                        </ui-text>
                    </div>
                    <ui-text
                        class="popup-airport_event_date"
                        type="caption"
                    >
                        Live from {{makeBookingTime(new Date(event.start_time))}}z to {{makeBookingTime(new Date(event.end_time))}}z
                    </ui-text>
                    <div class="popup-airport_event_action">
                        <ui-button
                            link-color="blue400"
                            size="S"
                            type="link"
                        >
                            Learn more
                        </ui-button>
                    </div>
                </nuxt-link>
            </template>
        </vatsim-controllers-list>
    </map-html-overlay>
</template>

<script setup lang="ts">
import type { RadarEventPayload } from '~/composables/vatsim/events';
import type {
    FeatureAirport, FeatureAirportApproachLabel, FeatureAirportAtc,
    FeatureAirportSectorVGProperties, FeatureSector, FeatureSectorVG,
} from '~/utils/map/entities';
import {
    isMapFeature,
} from '~/utils/map/entities';
import VatsimControllersList from '~/components/features/vatsim/controllers/VatsimControllersList.vue';
import MapHtmlOverlay from '~/components/map/MapHtmlOverlay.vue';
import { getCurrentWorldCoordinate } from '~/composables/map/world';
import type { Coordinate } from 'ol/coordinate.js';
import type { VatsimShortenedController } from '~/types/data/vatsim';
import VatsimControllerInfo from '~/components/features/vatsim/controllers/VatsimControllerInfo.vue';
import UiText from '~/components/ui/text/UiText.vue';
import PopupMapInfo from '~/components/popups/PopupMapInfo.vue';
import { getAirportCountry } from '~/composables/vatsim/airport';
import { sortControllersByPosition } from '~/composables/vatsim/controllers';
import { makeBookingTime } from '~/composables/vatsim/bookings';
import UiButton from '~/components/ui/buttons/UiButton.vue';

const props = defineProps({
    payload: {
        type: Object as PropType<RadarEventPayload<FeatureAirport | FeatureAirportAtc | FeatureAirportApproachLabel | FeatureSector | FeatureSectorVG, FeatureAirportSectorVGProperties[]>>,
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

const store = useStore();
const vatGlassesCombinedActive = computed(() => store.mapSettings.vatglasses?.combined);
function getPositionLevel(_level: number) {
    const level = _level.toString().padStart(3, '0');
    if (level === '999') return 'UNL';
    return `FL${ level }`;
}

const dataStore = useDataStore();
const mapStore = useMapStore();
const properties = computed(() => props.payload.feature.getProperties());
const type = computed(() => properties.value.type);
const getOffsetY = computed(() => {
    switch (properties.value.type) {
        case 'airport':
            return -5;
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

const getPopupName = computed(() => {
    const featureProps = properties.value;

    if (isMapFeature('sector', featureProps)) {
        if (featureProps.sectorType === 'uir') {
            return featureProps.name;
        }

        const country = getAirportCountry(featureProps.icao);
        if (!country) return featureProps.name;

        if (featureProps.isOceanic && !country.callsign) return `${ featureProps.name } Radio`;
        return `${ featureProps.name } ${ country.callsign ?? 'Center' }`;
    }

    const icaoName = (dataStore.vatspy.value?.data.keyAirports.realIcao[(featureProps as any).icao] ?? dataStore.vatspy.value?.data.keyAirports.icao[(featureProps as any).icao])?.name;

    if (type.value === 'sector-vatglasses') return 'Positions';
    if ('atc' in featureProps && type.value === 'airport' && icaoName) return `${ icaoName }${ featureProps.atc?.length ? ' Controllers' : '' }`;
    if ('name' in featureProps) return `${ featureProps.name } ${ type.value === 'airport' && featureProps.atc?.length ? 'Controllers' : '' }`;
    if ('facility' in featureProps) {
        const airport = (dataStore.vatspy.value?.data.keyAirports.realIcao[(featureProps as any).icao] ?? dataStore.vatspy.value?.data.keyAirports.icao[(featureProps as any).icao])?.name;
        let facility = featureProps.facility.facility === -1 ? 'ATIS' : dataStore.vatsim.data.facilities.value.find(x => x.id === (featureProps as any).facility?.facility)?.long;

        if (featureProps.facility.facility === useFacilitiesIds().APP) facility = 'Approach / Departure';

        return `${ airport } ${ facility }`;
    }

    return `${ icaoName } Approach/Departure`;
});

const event = computed(() => {
    return store.eventsMap[properties.value.type === 'airport' ? properties.value.icao : ''] ?? null;
});

const getATC = computed<VatsimShortenedController[]>(() => {
    const featureProps = properties.value;

    if (props.payload.additionalPayload?.length) {
        const atc: Record<number, VatsimShortenedController> = {};
        props.payload.additionalPayload.forEach(x => {
            sortControllersByPosition(x.atc).forEach(controller => {
                if (atc[controller.cid]) return;
                atc[controller.cid] = controller;
            });
        });

        return Object.values(atc);
    }

    if (isMapFeature('airport-atc', featureProps)) return sortControllersByPosition(featureProps.facility.atc);
    else return sortControllersByPosition(featureProps.atc);
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

/* const runways = computed(() => {
    if (isMapFeature('airport', properties.value)) {
        const dataAirport = dataStore.airportsList.value[properties.value.icao];
        if (dataAirport) {
            updateAirportAtisConfig(dataAirport);
            return dataAirport.atis;
        }
    }

    return null;
});*/
</script>

<style lang="scss" scoped>
.airport_atc-popup {
    width: 100%;
}

.airport_atc-vgList {
    max-width: min(450px, 100%);

    .atc-popup_list {
        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;

        max-height: 400px;
    }

    .atc-popup_level {
        font-size: 14px;
        font-weight: 600;
    }
}

.popup-airport {
    &_event {
        display: flex;
        flex-direction: column;
        gap: 4px;
        align-items: flex-start;

        padding: 8px 12px;
        border-bottom: 1px dashed $strokeDefault;

        color: $typographyPrimary;
        text-decoration: none;

        &_title {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-self: stretch;
            justify-content: space-between;
        }
    }
}
</style>
