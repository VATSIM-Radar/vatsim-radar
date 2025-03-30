<template>
    <div class="bars">
        <common-notification
            class="bars_title"
            cookie-name="bars-in-use"
            type="info"
        >
            BARS integration is active for this airport.<br> <a
                class="__link"
                href="https://vats.im/bars"
                target="_blank"
            >Learn more</a>
        </common-notification>
        <div
            v-if="data.some(x => x.bars.some(x => !x[1]))"
            class="bars_list __info-sections"
        >
            <div
                v-for="item in data.filter(x => x.bars.some(x => !x[1]))"
                :key="item.runway"
                class="bars_list_item"
            >
                <div class="bars_list_item_runway">
                    {{item.runway}}
                </div>
                <div class="bars__config">
                    <div
                        v-for="([bar, status]) in item.bars.filter(x => !x[1])"
                        :key="bar"
                        class="bars__config_item"
                        :class="{ 'bars__config_item--active': status }"
                    >
                        {{bar.split('--')[0]}}
                    </div>
                </div>
            </div>
        </div>
        <common-notification
            v-else
            type="info"
        >
            All bars are open.
        </common-notification>
    </div>
</template>

<script setup lang="ts">
import type { BARSShortItem } from '~/utils/backend/storage';
import CommonNotification from '~/components/common/basic/CommonNotification.vue';

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
            color: $error500;

            background: $darkgray875;

            &--active {
                color: $success500;
            }
        }
    }
}
</style>
