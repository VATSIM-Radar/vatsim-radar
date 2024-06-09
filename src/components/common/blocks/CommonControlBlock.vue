<template>
    <div
        v-if="model"
        ref="block"
        class="control-block"
        :class="[
            `control-block--location-${ location }`,
            `control-block--center-by-${ centerBy }`,
            {
                'control-block--disabled': disabled,
                'control-block--has-max-height': maxHeight,
            },
        ]"
        @click.stop
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

const props = defineProps({
    location: {
        type: String as PropType<TooltipLocation>,
        default: 'top',
    },
    centerBy: {
        type: String as PropType<'start' | 'center' | 'middle' | 'end'>,
        default: 'center',
    },
    centerByOffset: {
        type: String,
        default: '0',
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
        if (!props.closeByClickOutside) return;
        model.value = false;
    },
});
</script>

<style scoped lang="scss">
.control-block {
    --transform: calc(-50% + v-bind(centerByOffset));
    cursor: initial;

    position: absolute;
    z-index: 5;

    width: v-bind(width);
    max-width: v-bind(maxWidth);
    padding: 16px;

    color: $neutral150;

    background: $neutral1000;
    border: 1px solid varToRgba('neutral150', 0.15);
    border-radius: 8px;

    &--center-by-start {
        --transform: calc(0% + v-bind(centerByOffset));
    }

    &--center-by-end {
        --transform: calc(50% + v-bind(centerByOffset));
    }

    &--center-by-middle {
        --transform: calc(25% + v-bind(centerByOffset));
    }

    &--location-top {
        bottom: calc(100% + v-bind(gapFromParent));
        left: auto;
        transform: translateX(var(--transform));
    }

    &--location-bottom {
        top: calc(100% + v-bind(gapFromParent));
        left: auto;
        transform: translateX(var(--transform));
    }

    &--location-left {
        top: auto;
        right: calc(100% + v-bind(gapFromParent));
        transform: translateY(var(--transform));
    }

    &--location-right {
        top: auto;
        left: calc(100% + v-bind(gapFromParent));
        transform: translateY(var(--transform));
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
            transition: 0.3s;

            @include hover {
                &:hover {
                    color: $error500;
                }
            }
        }
    }

    &_content {
        margin-top: 16px;
    }
}
</style>
