<template>
    <div
        class="atc-popup-container"
        :class="{
            'atc-popup-container--absolute': absolute,
            'atc-popup-container--small': small,
        }"
    >
        <common-popup-block class="atc-popup">
            <template #title v-if="$slots.title">
                <slot name="title"/>
            </template>
            <template #additionalTitle v-if="$slots.additionalTitle">
                <slot name="additionalTitle"/>
            </template>
            <div class="atc-popup_list">
                <common-info-block
                    class="atc-popup_atc"
                    v-for="(controller, controllerIndex) in controllers"
                    :key="controller.cid+controllerIndex"
                    is-button
                    :top-items="[
                        controller.callsign,
                        controller.name,
                        controller.frequency,
                        showAtis ? undefined : getATCTime(controller),
                        showAtis && controller.atis_code ? `Info ${controller.atis_code}` : undefined,
                    ]"
                >
                    <template #top="{item, index}">
                        <template v-if="index === 0 && showFacility">
                            <div class="atc-popup__position">
                                <div
                                    class="atc-popup__position_facility"
                                    :style="{background: getControllerPositionColor(controller)}"
                                >
                                    {{ controller.isATIS ? 'ATIS' : dataStore.vatsim.data.facilities.value.find(x => x.id === controller.facility)?.short }}
                                </div>
                                <div class="atc-popup__position_name">
                                    {{ item }}
                                </div>
                            </div>
                        </template>
                        <template v-else-if="index === 1">
                            <div class="atc-popup__controller">
                                <div class="atc-popup__controller_name">
                                    {{ item }}
                                </div>
                                <div class="atc-popup__controller_rating">
                                    {{
                                        dataStore.vatsim.data.ratings.value.find(x => x.id === controller.rating)?.short ?? ''
                                    }}
                                </div>
                            </div>
                        </template>
                        <template v-else-if="index === 2">
                            <div class="atc-popup__frequency">
                                {{ item }}
                            </div>
                        </template>
                        <template v-else-if="index === 3 && !showAtis">
                            <div class="atc-popup__time">
                                {{ item }}
                            </div>
                        </template>
                        <template v-else>
                            {{ item }}
                        </template>
                    </template>
                    <template #bottom v-if="showAtis">
                        <ul class="atc-popup_atc__atis" v-if="controller.text_atis?.length">
                            <li
                                class="atc-popup_atc__atis_line"
                                v-for="atis in getATIS(controller)"
                                :key="atis"
                            >
                                {{ parseEncoding(atis) }}<br>
                            </li>
                        </ul>
                        <div class="atc-popup_atc__time">
                            <div class="atc-popup_atc__time_text">
                                Time online:
                            </div>
                            <div class="atc-popup_atc__time_info">
                                {{ getATCTime(controller) }}
                            </div>
                        </div>
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
import { getHoursAndMinutes } from '~/utils';

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
});

const dataStore = useDataStore();

const getATCTime = (controller: VatsimShortenedController) => {
    return getHoursAndMinutes(new Date(controller.logon_time).getTime());
};

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
        width: max-content;
        max-width: 450px;
        z-index: 20;
        padding: 5px 0;
        cursor: initial;

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
        align-items: center;
        gap: 8px;

        &_facility {
            width: 40px;
            text-align: center;
            padding: 2px 4px;
            border-radius: 4px;
            color: $neutral0Orig;
        }
    }

    &__controller {
        font-weight: 400;
        display: flex;
        align-items: center;
        gap: 8px;

        &_rating {
            padding: 2px 4px;
            border-radius: 4px;
            background: $primary500;
            font-weight: 600;
            color: $neutral150Orig;
            font-size: 11px;
        }
    }

    &__frequency {
        color: $primary400;
    }

    &_atc__time_info, &__time {
        background: $neutral950;
        padding: 2px 4px;
        border-radius: 4px;
    }

    &_list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 400px;
        overflow: auto;
    }

    &_atc {
        &__atis {
            display: flex;
            flex-direction: column;
            gap: 5px;
            padding-left: 16px;
            margin: 0;
            word-break: break-word;

            &_line:only-child {
                list-style: none;
                margin-left: -16px;
            }
        }

        &__time {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            color: $neutral150;
            font-size: 11px;
            gap: 4px;
            font-weight: 300;
            width: 100%;
            margin-top: 4px;
        }
    }
}
</style>
