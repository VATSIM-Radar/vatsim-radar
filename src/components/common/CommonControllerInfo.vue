<template>
    <div
        class="atc-popup-container"
    >
        <common-popup-block class="atc-popup">
            <template #title>
                <slot name="title"/>
            </template>
            <template #additionalTitle v-if="$slots.additionalTitle">
                <slot name="additionalTitle"/>
            </template>
            <common-info-block
                class="atc-popup_atc"
                v-for="(controller) in controllers"
                :key="controller.cid"
                is-button
                :top-items="[
                    controller.callsign,
                    controller.name,
                    controller.frequency,
                    showAtis ? undefined : getATCTime(controller),
                ]"
            >
                <template #top="{item, index}">
                    <template v-if="index === 0 && showFacility">
                        <div class="atc-popup__position">
                            <div
                                class="atc-popup__position_facility"
                                :style="{background: getControllerPositionColor(controller)}"
                            >
                                {{ dataStore.vatsim.data!.facilities.find(x => x.id === controller.facility)?.short }}
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
                                    dataStore.vatsim.data!.ratings.find(x => x.id === controller.rating)?.short ?? ''
                                }}
                            </div>
                        </div>
                    </template>
                    <template v-else-if="index === 2">
                        <div class="atc-popup__frequency">
                            {{ item }}
                        </div>
                    </template>
                    <template v-else-if="index === 3">
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
                            v-for="atis in controller.text_atis"
                            :key="atis"
                        >
                            {{ parseCyrillic(atis) }}<br>
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
        </common-popup-block>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { VatsimShortenedController } from '~/types/data/vatsim';
import { parseCyrillic } from '~/utils/data';
import { useDataStore } from '~/store/data';
import { getControllerPositionColor } from '~/composables/atc';

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
});

const dataStore = useDataStore();

const getATCTime = (controller: VatsimShortenedController) => {
    const diff = (Date.now() - new Date(controller.logon_time).getTime()) / (1000 * 60);

    return `${ (`0${ Math.floor(diff / 60) }`).slice(-2) }:${ (`0${ Math.floor(diff % 60) }`).slice(-2) }`;
};
</script>

<style scoped lang="scss">
.atc-popup {
    width: max-content;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    gap: 4px;

    &-container {
        position: absolute;
        z-index: 20;
        padding: 5px 0 0 10px;
        cursor: initial;
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
            color: $neutral0;
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
            color: $neutral150;
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

    &_atc {
        &__atis {
            display: flex;
            flex-direction: column;
            gap: 5px;
            max-width: 350px;
            padding-left: 16px;
            margin: 0;
            word-break: break-word;
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
