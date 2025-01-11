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
        @click="[mapStore.addAtcOverlay(controller.callsign), emit('overlay')]"
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
                        :style="{ background: getControllerPositionColor(controller) }"
                    >
                        {{ controller.isATIS ? 'ATIS' : controller.facility === -2 ? 'CTAF' : dataStore.vatsim.data.facilities.value.find(x => x.id === controller.facility)?.short }}
                    </div>
                    <div class="atc__position_name">
                        {{ item }}
                    </div>
                </div>
            </template>
            <template v-else-if="index === 1">
                <common-spoiler type="controller">
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
            <template v-else-if="index === 2">
                <div
                    class="atc__frequency"
                    @click.stop="[copy(item as string), copiedFor = controller.callsign]"
                >
                    <template v-if="!isCopied(controller.callsign)">
                        {{ item }}

                        <save-icon width="12"/>
                    </template>
                    <template v-else>
                        Copied!
                    </template>
                </div>
            </template>
            <template v-else-if="index === 3 && (!showAtis || !controller.text_atis?.length)">
                <div class="atc__time">
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
        </template>
    </common-info-block>
</template>


<script setup lang="ts">
import type { PropType } from 'vue';
import type { VatsimShortenedController } from '~/types/data/vatsim';
import { parseEncoding } from '~/utils/data';
import { useMapStore } from '~/store/map';
import CommonBlueBubble from '~/components/common/basic/CommonBubble.vue';
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';
import CommonAtcTimeOnline from '~/components/common/vatsim/CommonAtcTimeOnline.vue';
import CommonSpoiler from '~/components/common/vatsim/CommonSpoiler.vue';
import SaveIcon from '@/assets/icons/kit/save.svg?component';
import { getStringColorFromSettings } from '~/composables/colors';

defineProps({
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
        word-break: break-word;

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

        word-break: break-word;

        &_line:only-child {
            margin-left: -16px;
            list-style: none;
        }
    }
}
</style>
