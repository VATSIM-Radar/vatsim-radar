<template>
    <div class="bars">
        <ui-notification
            class="bars_title"
            cookie-name="bars-in-use"
            type="info"
        >
            BARS integration is active for this airport.<br> <a
                class="__link"
                href="https://vats.im/bars"
                target="_blank"
            >Learn more</a>
        </ui-notification>
        <div class="bars_list __info-sections">
            <div
                v-for="item in data"
                :key="item.runway"
                class="bars_list_item"
            >
                <div class="bars_list_item_runway">
                    {{item.runway}}
                </div>
                <div class="bars__config">
                    <div
                        v-for="([bar, status]) in item.bars"
                        :key="bar"
                        class="bars__config_item"
                        :class="{ 'bars__config_item--up': status }"
                    >
                        {{bar.split('--')[0]}}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { BARSShortItem } from '~/utils/server/storage';
import UiNotification from '~/components/ui/data/UiNotification.vue';

defineProps({
    data: {
        type: Array as PropType<BARSShortItem[]>,
        required: true,
    },
});
</script>

<style scoped lang="scss">
.bars {
    &_title {
        margin-bottom: 8px;
    }

    &_list {
        &_item {
            padding: 8px;
            border: 1px solid varToRgba('lightgray125', 0.15);
            border-radius: 8px;

            &_runway {
                font-size :14px;
                font-weight: 600;
                color: $primary300;
            }

        }
    }

    &__config {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 4px;

        &_item {
            padding: 4px;
            border-radius: 4px;

            font-size: 12px;
            font-weight: 600;
            color: $success500;

            background: $darkgray875;

            &--up {
                color: $error500;
            }
        }
    }
}
</style>
