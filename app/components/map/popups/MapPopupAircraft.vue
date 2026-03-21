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
            :class="{ 'aircraft-hover--short': isShortInfo }"
            :open-from="getOverlaySettings.positioning ?? null"
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
                <ui-data-list
                    v-if="isShortInfo"
                    class="aircraft-hover_sections"
                    gap="8px 4px"
                    :grid-columns="3"
                    :items="[
                        { text: pilot.callsign },
                        { title: pilot.aircraft_faa },
                        { title: pilot.frequencies[0] },
                    ]"
                />
                <ui-data-list-item class="aircraft-hover_pilot">
                    <template
                        v-if="!isShortInfo && (pilot.pilot_rating !== 0 || pilot.military_rating) && !isShortInfo"
                        #title
                    >
                        {{ usePilotRating(pilot).join(' | ') }}
                    </template>
                    <ui-spoiler type="pilot">
                        <template v-if="friend && !isNaN(Number(friend.name))">
                            {{friend.name}}
                        </template>
                        <template v-else>
                            {{ parseEncoding(pilot.name) }}
                        </template>
                    </ui-spoiler>
                </ui-data-list-item>

                <vatsim-pilot-destination
                    :pilot
                    :short="isShortInfo"
                />
                <div class="aircraft-hover_sections">
                    <ui-data-list
                        :gap="isShortInfo ? '8px 4px' : undefined"
                        :grid-columns="3"
                        :items="[
                            { title: isShortInfo ? undefined : 'Groundspeed', text: `${ pilot.groundspeed } kts` },
                            { title: isShortInfo ? undefined : 'Alt.', text: `${ getPilotTrueAltitude(pilot) } ft` },
                            { title: isShortInfo ? undefined : 'Heading', text: `${ pilot.heading }°` },
                        ]"
                    />
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
import type { Options } from 'ol/Overlay';
import { getResolvedScale } from '~/utils/map/aircraft-scale';
import UiDataList from '~/components/ui/data/UiDataList.vue';
import UiDataListItem from '~/components/ui/data/UiDataListItem.vue';

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
    border-radius: 8px;

    font-size: 13px;
    overflow-wrap: anywhere;

    background: $darkgray1000;

    &--short {
        width: 210px;
    }

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
        :deep(.list-item:nth-child(2)) {
            align-items: center;
        }

        :deep(.list-item:last-child) {
            align-items: flex-end;
        }
    }
}
</style>
