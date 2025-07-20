<template>
    <common-info-block
        class="atc"
        :class="{ 'atc--small': small }"
        is-button
        :top-items="[
            controller.callsign,
            controller.name,
            controller.frequency,
            (showAtis && controller.atis_code) ? `Info ${ controller.atis_code }` : (!showAtis || !controller.text_atis?.length) ? controller.logon_time : undefined,
        ]"
        @click="handleClick"
    >
        <template #top="{ item, index }">
            <template v-if="index === 0">
                <div
                    class="atc__position"
                    :style="{ '--color': controllerColor(controller) ?? 'currentColor' }"
                >
                    <div
                        v-if="showFacility"
                        class="atc__position_facility"
                        :style="{ background: !controller.booking ? getControllerPositionColor(controller) : radarColors.darkgray800 }"
                    >
                        {{ controller.isATIS ? 'ATIS' : controller.facility === -2 ? 'CTAF' : dataStore.vatsim.data.facilities.value.find(x => x.id === controller.facility)?.short }}
                    </div>
                    <div class="atc__position_name">
                        {{ item }}
                    </div>
                </div>
            </template>
            <template v-else-if="index === 1">
                <common-spoiler
                    v-if="!controller.booking"
                    type="controller"
                >
                    <div
                        class="atc__controller"
                        :style="{ '--color': controllerColor(controller) ?? 'currentColor' }"
                    >
                        <div class="atc__controller_name">
                            {{ item }}
                        </div>
                        <common-blue-bubble class="atc__controller_rating">
                            {{
                                dataStore.vatsim.data.ratings.value.find(x => x.id === controller.rating)?.short ?? ''
                            }}
                        </common-blue-bubble>
                    </div>

                    <template #name>
                        Controller
                    </template>
                </common-spoiler>
            </template>
            <template v-else-if="index === 2 && !controller.booking">
                <div
                    class="atc__frequency"
                    @click.stop="[copy(item as string), copiedFor = controller.callsign]"
                >
                    <template v-if="!isCopied(controller.callsign)  && !controller.booking">
                        {{ item }}

                        <save-icon width="12"/>
                    </template>
                    <template v-else>
                        Copied!
                    </template>
                </div>
            </template>
            <template v-else-if="index === 3 && (!showAtis || !controller.text_atis?.length) && !controller.booking">
                <div
                    v-if="!isMobile"
                    class="atc__time"
                >
                    {{ getATCTime(controller) }}
                </div>
            </template>
            <template v-else>
                {{ item }}
            </template>
        </template>
        <template
            v-if="showAtis && controller.text_atis?.length"
            #bottom
        >
            <ul class="atc__atis">
                <li
                    v-for="atis in getATIS(controller)"
                    :key="atis"
                    class="atc__atis_line"
                >
                    {{ atis }}<br>
                </li>
            </ul>
            <common-atc-time-online
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
        <template
            v-else-if="controller.booking"
            #bottom
        >
            <div>
                Booked from
                <template v-if="store.mapSettings.bookingsLocalTimezone">
                    {{ controller.booking?.start_local }} to {{ controller.booking?.end_local }}
                </template>
                <template v-else>
                    {{ controller.booking?.start_z }}Z to {{ controller.booking?.end_z }}Z
                </template>
            </div>
        </template>
    </common-info-block>
</template>


<script setup lang="ts">
import type { PropType } from 'vue';
import type { VatsimShortenedController } from '~/types/data/vatsim';
import { useMapStore } from '~/store/map';
import CommonBlueBubble from '~/components/common/basic/CommonBubble.vue';
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';
import CommonAtcTimeOnline from '~/components/common/vatsim/CommonAtcTimeOnline.vue';
import CommonSpoiler from '~/components/common/vatsim/CommonSpoiler.vue';
import SaveIcon from '@/assets/icons/kit/save.svg?component';
import { getStringColorFromSettings } from '~/composables/colors';
import { useStore } from '~/store';
import { findAtcByCallsign } from '~/composables/atc';

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

const isMobile = useIsMobile();

const dataStore = useDataStore();
const mapStore = useMapStore();
const { copy, copyState } = useCopyText();
const copiedFor = ref('');
const store = useStore();

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
    display: flex;
    flex-direction: column;
    gap: 4px;

    &--small {
        max-width: min(450px, 100%);

        @include mobileOnly {
            max-width: 80vw;
        }
    }

    @at-root .atc-popup-container:not(.atc-popup-container--small) & {
        :deep(.info-block__separator:nth-child(2)) {
            flex: 1 0 auto;

            svg {
                display: none;
            }
        }

        :deep(.info-block_top) {
            flex-wrap: nowrap;
        }
    }

    &__position {
        display: flex;
        gap: 8px;
        align-items: center;

        &_name {
            color: var(--color, currentColor);
        }

        &_facility {
            width: 40px;
            padding: 2px 4px;
            border-radius: 4px;

            color: $lightgray0Orig;
            text-align: center;
        }
    }

    &__controller {
        display: flex;
        gap: 8px;
        align-items: center;

        font-weight: 400;
        overflow-wrap: anywhere;

        &_name {
            color: var(--color, currentColor);
        }
    }

    &__frequency {
        display: flex;
        gap: 4px;
        align-items: center;
        color: $primary400;
    }

    &__time {
        padding: 2px 4px;
        border-radius: 4px;
        background: $darkgray950;
    }


    &__atis {
        display: flex;
        flex-direction: column;
        gap: 5px;

        margin: 0;
        padding-left: 16px;

        overflow-wrap: anywhere;

        &_line:only-child {
            margin-left: -16px;
            list-style: none;
        }
    }
}
</style>
