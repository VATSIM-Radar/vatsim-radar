<template>
    <ui-text
        class="atc"
        type="caption"
        @click="handleClick"
    >
        <div class="atc_content">
            <ui-chip
                v-if="showFacility"
                :atc-facility="controller.isATIS ? -1 : controller.facility"
                class="atc_facility"
            >
                {{ controller.isATIS ? 'ATIS' : controller.facility === -2 ? 'CTAF' : dataStore.vatsim.data.facilities.value.find(x => x.id === controller.facility)?.short }}
            </ui-chip>
            <ui-text
                class="atc_callsign"
                type="3b"
            >
                <ui-spoiler
                    v-if="!controller.booking"
                    type="controller"
                >
                    {{ controller.callsign }}
                </ui-spoiler>
                <template v-else>
                    {{controller.callsign}}
                </template>
            </ui-text>
            <template v-if="!controller.booking">
                <div
                    class="atc_frequency"
                    :class="{ 'atc_frequency--not-tuned-up': notTunedUp }"
                    @click.stop="[copy(controller.frequency as string), copiedFor = controller.callsign]"
                >
                    <template v-if="isCopied(controller.callsign)">
                        Copied
                    </template>
                    <template v-else>
                        {{controller.frequency}}
                    </template>
                </div>
                <div class="__spacer"/>
                <div
                    class="atc_name"
                    :style="{ '--color': controllerColor(controller) ?? 'currentColor' }"
                >
                    <ui-spoiler type="controller">
                        {{controller.name}}
                    </ui-spoiler>
                </div>
                <div class="atc_rating">
                    <ui-chip variant="accent">
                        {{
                            dataStore.vatsim.data.ratings.value.find(x => x.id === controller.rating)?.short ?? ''
                        }}
                    </ui-chip>
                </div>
                <ui-separator distance="0"/>
                <ui-chip
                    v-if="showAtis && controller.atis_code"
                    text-type="caption-medium-alt"
                >
                    Info {{controller.atis_code}}
                </ui-chip>
                <ui-chip
                    v-else-if="!showAtis || !controller.text_atis?.length"
                    :time="getATCTime(controller)"
                    time-variant="time"
                />
            </template>
        </div>
        <div class="atc_atis">
            <template v-if="showAtis && controller.text_atis?.length">
                <ui-text type="caption-medium-alt">
                    <ul class="atc__atis">
                        <li
                            v-for="atis in getATIS(controller)"
                            :key="atis"
                            class="atc__atis_line"
                            v-html="`${ atis }<br>`"
                        />
                    </ul>
                </ui-text>
                <vatsim-controller-time-online
                    v-if="controller.logon_time"
                    :controller="controller"
                />
                <template v-if="controller.booking">
                    Booked
                    <template v-if="store.mapSettings.bookingsLocalTimezone">
                        {{ controller.booking?.end_local }}
                    </template>
                    <template v-else>
                        {{ controller.booking?.end_z }}Z
                    </template>
                </template>
            </template>
            <template v-else-if="controller.booking">
                Booked from
                <template v-if="store.mapSettings.bookingsLocalTimezone">
                    {{ controller.booking?.start_local }} to {{ controller.booking?.end_local }}
                </template>
                <template v-else>
                    {{ controller.booking?.start_z }}Z to {{ controller.booking?.end_z }}Z
                </template>
            </template>
        </div>
    </ui-text>
</template>


<script setup lang="ts">
import type { PropType } from 'vue';
import type { VatsimShortenedController } from '~/types/data/vatsim';
import { useMapStore } from '~/store/map';
import VatsimControllerTimeOnline from '~/components/features/vatsim/controllers/VatsimControllerTimeOnline.vue';
import UiSpoiler from '~/components/ui/text/UiSpoiler.vue';
import { getStringColorFromSettings } from '~/composables/settings/colors';
import { useStore } from '~/store';
import { findAtcByCallsign } from '~/composables/vatsim/controllers';
import UiChip from '~/components/ui/text/UiChip.vue';
import UiSeparator from '~/components/ui/data/UiSeparator.vue';
import UiText from '~/components/ui/text/UiText.vue';

const props = defineProps({
    controller: {
        type: Object as PropType<VatsimShortenedController>,
        required: true,
    },
    showFacility: {
        type: Boolean,
        default: false,
    },
    showAtis: {
        type: Boolean,
        default: false,
    },
    absolute: {
        type: Boolean,
        default: false,
    },
    small: {
        type: Boolean,
        default: false,
    },
    maxHeight: {
        type: String,
        default: '400px',
    },
});

const emit = defineEmits({
    overlay() {
        return true;
    },
});

defineSlots<{ title?(): any; additionalTitle?(): any }>();

const dataStore = useDataStore();
const mapStore = useMapStore();
const { copy, copyState } = useCopyText();
const copiedFor = ref('');
const store = useStore();

const notTunedUp = computed(() => {
    return !props.controller.isATIS && !props.controller.frequencies?.some(x => x === props.controller.frequency && x[3] === '.');
});

const handleClick = () => {
    if (!findAtcByCallsign(props.controller.callsign)) {
        window.open(`https://stats.vatsim.net/stats/${ props.controller.cid }`, '_blank');
        return;
    }
    mapStore.addAtcOverlay(props.controller.callsign);
    emit('overlay');
};

const controllerColor = (controller: VatsimShortenedController) => {
    const list = getUserList(controller.cid);

    return (list && getStringColorFromSettings(list.color)) ?? undefined;
};

const isCopied = (key: string) => {
    return copiedFor.value === key && copyState.value;
};
</script>

<style scoped lang="scss">
.atc {
    cursor: pointer;

    display: flex;
    flex-direction: column;
    gap: 8px;

    padding: 6px 12px;
    border: dashed $strokeDefault;
    border-width: 1px 0;

    transition: 0.3s;

    @include hover {
        &:hover {
            background: $whiteAlpha4;
        }
    }

    &:first-child, +.atc {
        border-top: 0;
    }

    &:last-child {
        border-bottom: 0;
    }

    &--small {
        max-width: min(450px, 100%);

        @include mobileOnly {
            max-width: 80vw;
        }
    }

    &_content {
        display: flex;
        gap: 8px;
        align-items: center;
        overflow-wrap: anywhere;
    }

    &_frequency {
        cursor: pointer;

        margin-top: 4px;
        padding-bottom: 4px;
        border-bottom: 1px dashed currentColor;

        color: $blue400;

        transition: 0.3s;

        &--not-tuned-up {
            color: $red500;
        }
    }

    ul {
        margin: 0;
        padding: 0;
        list-style: none;
    }
}
</style>
