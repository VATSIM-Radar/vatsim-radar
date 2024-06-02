<template>
    <div
        v-if="model"
        ref="block"
        class="control-block"
        :class="[
            `control-block--location-${ location }`,
            {
                'control-block--disabled': disabled,
                'control-block--has-max-height': maxHeight,
            },
        ]"
    >
        <header class="control-block_header">
            <div class="control-block_header_title">
                <slot name="title"/>
            </div>
            <div
                v-if="!disabled"
                class="control-block_header_close"
                @click="model = false"
            >
                <close-icon/>
            </div>
        </header>
        <div class="control-block_content">
            <slot/>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { TooltipLocation } from '~/components/common/basic/CommonTooltip.vue';
import CloseIcon from '@/assets/icons/basic/close.svg?component';
import { useClickOutside } from '~/composables/click-outside';

defineProps({
    location: {
        type: String as PropType<TooltipLocation>,
        default: 'top',
    },
    width: {
        type: String,
        default: '248px',
    },
    maxWidth: {
        type: String,
    },
    maxHeight: {
        type: String,
    },
    closeByClickOutside: {
        type: Boolean,
        default: false,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    gapFromParent: {
        type: String,
        default: '10px',
    },
});

defineSlots<{ default(): any; title(): any }>();

const block = ref<HTMLDivElement | null>(null);

const model = defineModel({
    type: Boolean,
    default: true,
});

useClickOutside({
    element: block,
    callback: () => {
        model.value = false;
    },
});
</script>

<style scoped lang="scss">
.control-block {
    position: absolute;

    width: v-bind(width);
    max-width: v-bind(maxWidth);
    padding: 16px;

    background: $neutral1000;
    border-radius: 8px;

    &--location-top {
        bottom: calc(100% + v-bind(gapFromParent));
        left: auto;
        transform: translateX(-50%);
    }

    &--location-bottom {
        top: calc(100% + v-bind(gapFromParent));
        left: auto;
        transform: translateX(-50%);
    }

    &--location-left {
        top: auto;
        right: calc(100% + v-bind(gapFromParent));
        transform: translateY(-50%);
    }

    &--location-right {
        top: auto;
        left: calc(100% + v-bind(gapFromParent));
        transform: translateY(-50%);
    }

    &--has-max-height {
        scrollbar-gutter: stable;
        overflow: auto;
        max-height: v-bind(maxHeight);
    }

    &_header {
        display: flex;
        gap: 16px;
        align-items: center;
        justify-content: space-between;

        &_title {
            font-family: $openSansFont;
            font-size: 14px;
            font-weight: 700;
            line-height: 100%;
            color: $neutral100;
        }

        &_close {
            cursor: pointer;
            width: 14px;
            min-width: 14px;
        }
    }

    &_content {
        margin-top: 16px;
    }
}
</style>
