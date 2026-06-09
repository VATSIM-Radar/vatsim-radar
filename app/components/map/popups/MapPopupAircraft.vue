<template>
    <map-html-overlay
        class="aircraft-overlay"
        is-interaction
        model-value
        :settings="getOverlaySettings"
        :z-index="20"
        @close="emit('close')"
        @id="$emit('id', $event)"
        @pointermove.stop
        @update:overlay="!$event && emit('close')"
    >
        <popup-map-info
            v-if="pilot"
            class="aircraft-hover"
            :class="{ 'aircraft-hover--short': isShortInfo }"
            content-padding="0"
            :open-from="getOverlaySettings.positioning ?? null"
            @mouseleave="emit('close')"
        >
            <template
                #title
            >
                <ui-text :type="isShortInfo ? '3b' : '3b-medium'">
                    <span> {{ pilot.callsign }}</span>
                </ui-text>
            </template>
            <template
                v-if="pilot.aircraft_short"
                #additionalTitle
            >
                <ui-text
                    class="aircraft-hover__title_type"
                    :type="isShortInfo ? 'caption-light' : '3b'"
                >
                    {{ pilot.aircraft_short?.split('/')[0] }}
                </ui-text>
            </template>
            <template
                v-if="pilot.frequencies.length >= 1"
                #titleAppend
            >
                <ui-bubble
                    class="aircraft-hover__frequency"
                    :text-type="isShortInfo ? 'caption-light' : undefined"
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
                <ui-data-list-item class="aircraft-hover_pilot">
                    <template
                        v-if="!isShortInfo && (pilot.pilot_rating !== 0 || pilot.military_rating) && !isShortInfo"
                        #title
                    >
                        {{ usePilotRating(pilot).join(' | ') }}
                    </template>
                    <ui-spoiler type="pilot">
                        <ui-text type="3b">
                            <template v-if="friend && isNaN(Number(friend.name))">
                                {{friend.name}}
                                <ui-text
                                    v-if="friend.comment"
                                    tag="span"
                                    type="caption-medium"
                                >
                                    {{friend.comment}}
                                </ui-text>
                            </template>
                            <template v-else>
                                {{ parseEncoding(pilot.name) }}
                            </template>
                        </ui-text>
                    </ui-spoiler>
                </ui-data-list-item>

                <div class="aircraft-hover_destination">
                    <vatsim-pilot-destination
                        v-if="pilot.departure && pilot.arrival"
                        :pilot
                        :short="isShortInfo"
                    />
                    <ui-text
                        v-else
                        type="3b-medium"
                    >
                        No flight plan
                    </ui-text>
                </div>
                <div
                    class="aircraft-hover_sections"
                    :class="{ 'aircraft-hover_sections--short': isShortInfo }"
                >
                    <ui-data-list
                        :gap="isShortInfo ? '8px 4px' : '8px 8px'"
                        :grid-columns="(isShortInfo || !pilot.vertical_speed) ? 2 : 3"
                        :items="[
                            { title: isShortInfo ? undefined : 'Ground speed', text: `${ pilot.groundspeed } kts` },
                            { title: isShortInfo ? undefined : 'Altitude', text: `${ getPilotTrueAltitude(pilot) } ft` },
                            { key: 'vs', title: isShortInfo ? undefined : 'Vertical speed', text: `${ Math.round(Math.abs(pilot.vertical_speed ?? 0) / 100) }00` },
                        ].slice(0, (isShortInfo || !pilot.vertical_speed) ? 2 : 3)"
                    >
                        <template #default="{ item }">
                            <template v-if="item.key !== 'vs'">
                                {{item.text}}
                            </template>
                            <div
                                v-else
                                class="aircraft-hover__vs"
                                :class="{ 'aircraft-hover__vs--negative': pilot.vertical_speed && pilot.vertical_speed < 0 }"
                            >
                                <span class="aircraft-hover__vs_icon">
                                    ↑
                                </span>
                                <div class="aircraft-hover__vs_value">
                                    {{item.text}}
                                </div>
                            </div>
                        </template>
                    </ui-data-list>
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
import PopupMapInfo from '~/components/popups/PopupMapInfo.vue';
import type { Options } from 'ol/Overlay.js';
import { getResolvedScale } from '~/utils/map/aircraft-scale';
import UiDataList from '~/components/ui/data/UiDataList.vue';
import UiDataListItem from '~/components/ui/data/UiDataListItem.vue';
import UiText from '~/components/ui/text/UiText.vue';

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
const dataStore = useDataStore();

const properties = computed(() => props.payload.feature.getProperties());
const isShortInfo = computed(() => getKeyedValueFromSettings('map.preferences.aircraft.shortView'));
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

    const [safeOffsetX, safeOffsetY] = getResolvedScale({
        scale: properties.value.scale,
        width: radarIcons[properties.value.icon.icon].width,
        height: radarIcons[properties.value.icon.icon].height,
        onGround: properties.value.onGround,
    });

    const backOffset = 0;

    offset[1] = first === 'top' ? (safeOffsetY) - backOffset : first === 'bottom' ? -(safeOffsetY) + backOffset : 0;
    offset[0] = second === 'left' ? (safeOffsetX) - backOffset : second === 'right' ? -(safeOffsetX) + backOffset : 0;

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

    width: 248px;
    border-radius: 2px;

    font-size: 13px;
    overflow-wrap: anywhere;

    background: $darkGray900;

    :deep(.popup-block_title .text span) {
        color: $brandPrimary;
    }

    &__title_type {
        line-height: 100%;
    }

    &_destination {
        border: dashed $whiteAlpha12;
        border-width: 1px 0;
        background: $darkGray800
    }

    &--short {
        width: 160px;

        :deep(.popup-block_title), .aircraft-hover_body > * {
            padding: 4px 8px !important;
        }

        :deep(.popup-block_title) {
            gap: 8px;
        }
    }

    &__frequency {
        font-size: 12px;
        font-weight: 600;
        text-align: right;
        white-space: nowrap;

        + .aircraft-hover__frequency{
            margin-left: 4px;
            padding-left: 4px;
            border-left: 1px solid varToRgba('lightGray500', 0.1);
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
        >* {
            padding: 8px;
        }
    }

    &_sections--short {
        :deep(.list-item:nth-child(2)) {
            align-items: center;
        }

        :deep(.list-item:last-child) {
            align-items: flex-end;
        }
    }

    &__vs {
        display: flex;
        gap: 4px;
        align-items: center;

        &_icon {
            position: relative;
            top: -0.1em;
            line-height: 100%;
        }

        &--negative .aircraft-hover__vs_icon {
            top: 0.1em;
            transform: rotate(180deg);
        }
    }
}
</style>
