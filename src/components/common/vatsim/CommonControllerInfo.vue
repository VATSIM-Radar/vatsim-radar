<template>
    <div
        class="atc-popup-container"
        :class="{
            'atc-popup-container--absolute': absolute,
            'atc-popup-container--small': small,
        }"
    >
        <common-popup-block class="atc-popup">
            <template
                v-if="$slots.title"
                #title
            >
                <slot name="title"/>
            </template>
            <template
                v-if="$slots.additionalTitle"
                #additionalTitle
            >
                <slot name="additionalTitle"/>
            </template>
            <div class="atc-popup_list">
                <common-info-block
                    v-for="(controller, controllerIndex) in controllers"
                    :key="controller.cid+controllerIndex"
                    class="atc-popup_atc"
                    is-button
                    :top-items="[
                        controller.callsign,
                        controller.name,
                        controller.frequency,
                        (showAtis && controller.atis_code) ? `Info ${ controller.atis_code }` : (!showAtis || !controller.text_atis?.length) ? controller.logon_time : undefined,
                    ]"
                    @click="mapStore.addAtcOverlay(controller.callsign)"
                >
                    <template #top="{ item, index }">
                        <template v-if="index === 0 && showFacility">
                            <div class="atc-popup__position">
                                <div
                                    class="atc-popup__position_facility"
                                    :style="{ background: getControllerPositionColor(controller) }"
                                >
                                    {{ controller.isATIS ? 'ATIS' : controller.facility === -2 ? 'CTAF' : dataStore.vatsim.data.facilities.value.find(x => x.id === controller.facility)?.short }}
                                </div>
                                <div class="atc-popup__position_name">
                                    {{ item }}
                                </div>
                            </div>
                        </template>
                        <template v-else-if="index === 1">
                            <common-spoiler type="controller">
                                <div class="atc-popup__controller">
                                    <div class="atc-popup__controller_name">
                                        {{ item }}
                                    </div>
                                    <common-blue-bubble class="atc-popup__controller_rating">
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
                            <div class="atc-popup__frequency">
                                {{ item }}
                            </div>
                        </template>
                        <template v-else-if="index === 3 && (!showAtis || !controller.text_atis?.length)">
                            <div class="atc-popup__time">
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
                        <ul class="atc-popup_atc__atis">
                            <li
                                v-for="atis in getATIS(controller)"
                                :key="atis"
                                class="atc-popup_atc__atis_line"
                            >
                                {{ parseEncoding(atis, controller.callsign) }}<br>
                            </li>
                        </ul>
                        <common-atc-time-online
                            v-if="controller.logon_time"
                            :controller="controller"
                        />
                    </template>
                </common-info-block>
            </div>
        </common-popup-block>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { VatsimShortenedController } from '~/types/data/vatsim';
import { parseEncoding } from '~/utils/data';
import { getControllerPositionColor } from '~/composables/atc';
import { useMapStore } from '~/store/map';
import CommonBlueBubble from '~/components/common/basic/CommonBubble.vue';
import CommonPopupBlock from '~/components/common/popup/CommonPopupBlock.vue';
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';
import CommonAtcTimeOnline from '~/components/common/vatsim/CommonAtcTimeOnline.vue';
import CommonSpoiler from '~/components/common/vatsim/CommonSpoiler.vue';

defineProps({
    controllers: {
        type: Array as PropType<VatsimShortenedController[]>,
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

defineSlots<{ title(): any; additionalTitle(): any }>();

const dataStore = useDataStore();
const mapStore = useMapStore();

const getATIS = (controller: VatsimShortenedController) => {
    if (!controller.isATIS) return controller.text_atis;
    if (controller.text_atis && controller.text_atis.filter(x => x.replaceAll(' ', '').length > 20).length > controller.text_atis.length - 2) return [controller.text_atis.join(' ')];
    return controller.text_atis;
};
</script>

<style scoped lang="scss">
.atc-popup {
    display: flex;
    flex-direction: column;
    gap: 4px;

    &-container {
        cursor: initial;

        z-index: 20;

        width: max-content;
        max-width: 450px;
        padding: 5px 0;

        &--small {
            max-width: min(450px, 100%);
        }

        &--absolute {
            position: absolute;
        }
    }

    &_title {
        margin-bottom: 10px;
        font-weight: 600;
    }

    &__position {
        display: flex;
        gap: 8px;
        align-items: center;

        &_facility {
            width: 40px;
            padding: 2px 4px;

            color: $lightgray0Orig;
            text-align: center;

            border-radius: 4px;
        }
    }

    &__controller {
        display: flex;
        gap: 8px;
        align-items: center;

        font-weight: 400;
        word-break: break-word;
    }

    &__frequency {
        color: $primary400;
    }

    &__time {
        padding: 2px 4px;
        background: $darkgray950;
        border-radius: 4px;
    }

    &_list {
        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;

        max-height: v-bind(maxHeight);
    }

    &_atc {
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
}
</style>
