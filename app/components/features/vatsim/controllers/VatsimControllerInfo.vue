<template>
    <ui-text
        class="atc"
        type="caption"
        @click.stop="handleClick"
    >
        <div class="atc_content">
            <ui-chip
                v-if="showFacility"
                :atc-facility="isATIS ? -1 : controller.facility"
                class="atc_facility"
            >
                {{ isATIS ? 'ATIS' : controller.facility === -2 ? 'CTAF' : dataStore.vatsim.data.facilities.value.find(x => x.id === controller.facility)?.short }}
            </ui-chip>
            <ui-text
                class="atc_callsign"
                type="3b"
            >
                <ui-spoiler
                    v-if="!controller.isBooking"
                    type="controller"
                >
                    {{ controller.duplicatedBy || controller.callsign }}
                </ui-spoiler>
                <template v-else>
                    {{controller.duplicatedBy || controller.callsign}}
                </template>
            </ui-text>
            <template v-if="!controller.isBooking">
                <div
                    class="atc_frequency"
                    :class="{ 'atc_frequency--not-tuned-up': notTunedUp }"
                    @click.prevent.stop="[copy(controller.frequency as string), copiedFor = controller.callsign]"
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
                    v-if="controller.name"
                    class="atc_name"
                    :style="{ '--color': controllerColor() ?? 'currentColor' }"
                >
                    <ui-spoiler type="controller">
                        {{userFriend?.name ?? controller.name}}
                    </ui-spoiler>
                </div>
                <div
                    v-if="controller.rating"
                    class="atc_rating"
                >
                    <ui-chip variant="accent">
                        {{
                            dataStore.vatsim.data.ratings.value.find(x => x.id === controller.rating)?.short ?? ''
                        }}
                    </ui-chip>
                </div>
                <ui-separator
                    class="atc_separator"
                    distance="0"
                />
                <ui-chip
                    v-if="showAtis && controller.atis_code"
                    text-type="caption-medium-alt"
                >
                    Info {{controller.atis_code}}
                </ui-chip>
                <ui-chip
                    v-else-if="(!showAtis || !controller.text_atis?.length) && controller.logon_time"
                    :time="getATCTime(controller)"
                    time-variant="time"
                />
            </template>
        </div>
        <div
            v-if="(showAtis && controller.text_atis?.length) || controller.isBooking"
            class="atc_atis"
        >
            <ui-text
                v-if="additionalFrequencies.length"
                class="atc__frequencies"
                type="caption-light"
            >
                Monitoring
                <div
                    v-for="freq in additionalFrequencies"
                    :key="freq"
                    class="atc_frequency atc_frequency--secondary"
                    @click.prevent.stop="[copy(freq), copiedFor = freq]"
                >
                    <template v-if="isCopied(freq)">
                        Copied
                    </template>
                    <template v-else>
                        {{freq}}
                    </template>
                </div>
            </ui-text>
            <template v-if="showAtis && controller.text_atis?.length">
                <ui-text type="3b-medium-alt">
                    <ul class="atc__atis">
                        <li
                            v-for="atis in getATIS(controller)"
                            :key="atis"
                            class="atc__atis_line"
                            v-html="`${ atis }<br>`"
                        />
                    </ul>
                </ui-text>
                <ui-text
                    v-if="userFriend?.comment"
                    type="caption-light"
                >
                    {{userFriend?.comment}}
                </ui-text>
                <vatsim-controller-time-online
                    v-if="controller.logon_time"
                    :controller="controller"
                    show-booking
                />
            </template>
            <template v-else-if="controller.booking">
                Booked from
                {{ makeBookingTime(controller.booking?.start, bookingsLocalTimezone) }} to {{ makeBookingTime(controller.booking?.end, bookingsLocalTimezone) }}
                <template v-if="!bookingsLocalTimezone">
                    Z
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
import { findAtcByCallsign } from '~/composables/vatsim/controllers';
import UiChip from '~/components/ui/text/UiChip.vue';
import UiSeparator from '~/components/ui/data/UiSeparator.vue';
import UiText from '~/components/ui/text/UiText.vue';
import { makeBookingTime } from '~/composables/vatsim/bookings';

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
    overlay(controller: VatsimShortenedController) {
        return true;
    },
});

defineSlots<{ title?(): any; additionalTitle?(): any }>();

const dataStore = useDataStore();
const mapStore = useMapStore();
const { copy, copyState } = useCopyText();
const copiedFor = ref('');
const bookingsLocalTimezone = useSettingValueFromFunc('appearance.bookingsLocalTimezone');

const additionalFrequencies = computed(() => {
    return props.controller.frequencies?.filter(x => {
        if (x === props.controller.frequency) return false;
        const freq = parseFloat(x);
        return freq <= 137 && freq >= 117;
    }) ?? [];
});

const notTunedUp = computed(() => {
    return props.controller?.rating && !isATIS.value && (!props.controller?.frequencies?.length || (props.controller.frequencies?.some(x => x[3] === '.') && !props.controller.frequencies?.some(x => x === props.controller.frequency)));
});

const isATIS = computed(() => {
    return props.controller?.isATIS || props.controller?.callsign.endsWith('ATIS');
});

const handleClick = () => {
    if (!findAtcByCallsign(props.controller.callsign)) {
        window.open(`https://stats.vatsim.net/stats/${ props.controller.cid }`, '_blank');
        return;
    }
    mapStore.addAtcOverlay(props.controller.callsign);
    emit('overlay', props.controller);
};

const userList = computed(() => {
    return getUserList(props.controller.cid);
});

const userFriend = computed(() => {
    return userList.value?.users.find(x => x.cid === props.controller.cid);
});

const controllerColor = () => {
    const list = userList.value;

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
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;

        overflow-wrap: anywhere;
    }

    &_name {
        color: var(--color);
    }

    &_frequency {
        cursor: pointer;

        margin-top: 4px;
        padding-bottom: 4px;
        border-bottom: 1px dashed currentColor;

        color: $blue400;

        transition: 0.3s;

        &--secondary {
            margin-top: 0;
            color: currentColor;
        }

        &--not-tuned-up {
            color: $red500;
        }
    }

    ul {
        display: flex;
        flex-direction: column;
        gap: 5px;

        margin: 0;
        padding: 0;

        overflow-wrap: anywhere;
        list-style: none;
    }

    &__atis {
        line-height: normal;;
        text-transform: none;
    }

    &_atis {
        .atc-time {
            margin-top: 10px;
        }

        &_booking {
            margin-top: 10px;
            text-align: right;
        }
    }

    &_separator:last-child {
        display: none;
    }

    &__frequencies {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
    }
}
</style>
