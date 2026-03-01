<template>
    <map-html-overlay
        class="aircraft-overlay"
        is-interaction
        model-value
        :settings="getOverlaySettings"
        :z-index="20"
        @id="$emit('id', $event)"
        @pointermove.stop
        @update:overlay="!$event && emit('close')"
    >
        <popup-map-info
            v-if="pilot"
            class="aircraft-hover"
            @mouseleave="emit('close')"
        >
            <template
                v-if="!isShortInfo"
                #title
            >
                {{ pilot.callsign }}
            </template>
            <template
                v-if="pilot.aircraft_faa && !isShortInfo"
                #additionalTitle
            >
                {{ pilot.aircraft_faa }}
            </template>
            <template
                v-if="pilot.frequencies.length >= 1 && !isShortInfo"
                #titleAppend
            >
                <ui-bubble
                    class="aircraft-hover__frequency"
                    type="primary-flat"
                >
                    {{ pilot.frequencies[0] }}
                </ui-bubble>
                <ui-bubble
                    v-if="pilot.frequencies[1] && store.config.airport"
                    class="aircraft-hover__frequency"
                    type="primary-flat"
                >
                    {{ pilot.frequencies[1] }}
                </ui-bubble>
                <ui-bubble
                    v-if="pilot.transponder && store.config.airport"
                    class="aircraft-hover__frequency"
                    type="primary-flat"
                >
                    {{ pilot.transponder }}
                </ui-bubble>
            </template>
            <div class="aircraft-hover_body">
                <ui-text-block v-if="isShortInfo">
                    <template #top>
                        {{pilot.callsign}}
                        <template v-if="pilot.aircraft_faa">
                            - {{pilot.aircraft_faa}}
                        </template>
                        <template v-if="pilot.frequencies.length >= 1 && isShortInfo">
                            - <ui-bubble
                                class="aircraft-hover__frequency"
                                type="primary-flat"
                            >
                                {{ pilot.frequencies[0] }}
                            </ui-bubble>
                        </template>
                    </template>
                </ui-text-block>
                <ui-text-block
                    class="aircraft-hover__pilot"
                    is-button
                    :top-items="[pilot.name, friend?.comment]"
                    @click="mapStore.addPilotOverlay(properties.cid)"
                >
                    <template #top="{ index,item }">
                        <ui-spoiler
                            v-if="index === 0"
                            type="pilot"
                        >
                            <template v-if="friend && !isNaN(Number(friend.name))">
                                {{friend.name}}
                            </template>
                            <template v-else>
                                {{ parseEncoding(pilot.name) }}
                            </template>
                        </ui-spoiler>
                        <template v-else>
                            {{item}}
                        </template>
                    </template>
                    <template
                        v-if="(pilot.pilot_rating !== 0 || pilot.military_rating) && !isShortInfo"
                        #bottom
                    >
                        {{ usePilotRating(pilot).join(' | ') }}
                    </template>
                </ui-text-block>
                <vatsim-pilot-destination
                    :pilot
                    :short="isShortInfo"
                />
                <div class="aircraft-hover_sections">
                    <ui-text-block
                        v-if="typeof pilot.groundspeed === 'number'"
                        text-align="center"
                    >
                        <template
                            v-if="!isShortInfo"
                            #top
                        >
                            GS
                        </template>
                        <template #bottom>
                            {{ pilot.groundspeed }} kts
                        </template>
                    </ui-text-block>
                    <ui-text-block
                        v-if="typeof pilot.altitude === 'number'"
                        text-align="center"
                    >
                        <template
                            v-if="!isShortInfo"
                            #top
                        >
                            Altitude
                        </template>
                        <template #bottom>
                            {{ getPilotTrueAltitude(pilot) }} ft
                        </template>
                    </ui-text-block>
                    <ui-text-block
                        v-if="!isShortInfo"
                        text-align="center"
                    >
                        <template
                            #top
                        >
                            Heading
                        </template>
                        <template #bottom>
                            {{ properties.heading }}°
                        </template>
                    </ui-text-block>
                </div>
            </div>
        </popup-map-info>
    </map-html-overlay>
</template>

<script setup lang="ts">
import type { RadarEventPayload } from '~/composables/vatsim/events';
import type {
    FeatureAircraft,
} from '~/utils/map/entities';
import { parseEncoding } from '~/utils/data';
import { usePilotRating } from '~/composables/vatsim/pilots';
import { getPilotTrueAltitude } from '~/utils/shared/vatsim';
import VatsimPilotDestination from '~/components/features/vatsim/pilots/VatsimPilotDestination.vue';
import UiSpoiler from '~/components/ui/text/UiSpoiler.vue';
import UiBubble from '~/components/ui/data/UiBubble.vue';
import MapHtmlOverlay from '~/components/map/MapHtmlOverlay.vue';
import UiTextBlock from '~/components/ui/text/UiTextBlock.vue';
import PopupMapInfo from '~/components/popups/PopupMapInfo.vue';
import type { Options } from 'ol/Overlay';

const props = defineProps({
    payload: {
        type: Object as PropType<RadarEventPayload<FeatureAircraft>>,
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
const mapStore = useMapStore();
const dataStore = useDataStore();

const properties = computed(() => props.payload.feature.getProperties());
const isShortInfo = computed(() => store.mapSettings.shortAircraftView);
const pilot = computed(() => dataStore.vatsim.data.keyedPilots.value[properties.value.cid.toString()]);
const friend = computed(() => store.friends.find(x => x.cid === properties.value.cid));

function overlayPositionFromHeading(headingDeg: number) {
    const h = ((headingDeg % 360) + 360) % 360;

    const sector = Math.floor(((h + 22.5) % 360) / 45);

    switch (sector) {
        case 0: return 'center-left';
        case 1: return 'top-left';
        case 2: return 'top-center';
        case 3: return 'top-right';
        case 4: return 'center-right';
        case 5: return 'bottom-right';
        case 6: return 'bottom-center';
        case 7: return 'bottom-left';
        default: return 'center-left';
    }
}

const getOverlaySettings = computed<Options>(() => {
    const coord = getCurrentWorldCoordinate({
        coordinate: properties.value.coordinates,
        eventCoordinate: props.payload.coordinate,
    });

    const offset = [0, 0];

    const positioning: Options['positioning'] = overlayPositionFromHeading(properties.value.heading);

    const [first, second] = positioning.split('-');

    const safeOffset = 8;

    offset[1] = first === 'top' ? safeOffset : first === 'bottom' ? -safeOffset : 0;
    offset[0] = second === 'left' ? -safeOffset : first === 'right' ? safeOffset : 0;

    console.log(offset, positioning);

    return {
        position: [
            coord[0],
            properties.value.coordinates[1],
        ],
        positioning,
        offset,
    };
});
</script>

<style scoped lang="scss">
.aircraft-hover {
    display: flex;
    flex-direction: column;
    gap: 8px;

    width: 248px;
    border-radius: 8px;

    font-size: 13px;
    overflow-wrap: anywhere;

    background: $darkgray1000;

    &__frequency {
        font-size: 12px;
        font-weight: 600;
        text-align: right;
        white-space: nowrap;

        + .aircraft-hover__frequency{
            margin-left: 4px;
            padding-left: 4px;
            border-left: 1px solid varToRgba('lightgray150', 0.1);
        }
    }

    &__pilot {
        &__title, &__text {
            font-weight: 600;
        }

        &__text_rating {
            font-size: 11px;
            font-weight: normal;
        }
    }

    &__airport {
        font-size: 9px;
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
</style>
