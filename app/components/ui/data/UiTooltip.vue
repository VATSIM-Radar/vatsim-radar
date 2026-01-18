<template>
    <div
        ref="tooltip"
        class="tooltip"
        :class="[`tooltip--location-${ location }`, `tooltip--align-${ align }`, { 'tooltip--cursor-default': cursorDefault }]"
        @mouseleave="handleClick('mouseLeave')"
        @mouseover="handleClick('mouseOver')"
    >
        <div
            v-if="$slots.activator"
            class="tooltip_activator"
            tabindex="0"
            @click="handleClick('click')"
            @focus="handleClick('focus')"
        >
            <slot name="activator"/>
        </div>
        <transition name="tooltip_container--appear">
            <div
                v-if="model"
                class="tooltip_container"
            >
                <div class="tooltip_container_content">
                    <div class="tooltip_container_content_icon">
                        <triangle-left-icon/>
                    </div>
                    <div class="tooltip_container_content_text">
                        <slot/>
                    </div>
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
import TriangleLeftIcon from 'assets/icons/basic/triangle-left.svg?component';
import type { PropType } from 'vue';
import type { ClickOutsideOptions } from '~/composables/map/click-outside';


const props = defineProps({
    location: {
        type: String as PropType<TooltipLocation>,
        default: 'top',
    },
    align: {
        type: String as PropType<'right' | 'left' | 'center'>,
        default: 'center',
    },
    width: {
        type: String,
    },
    maxWidth: {
        type: String,
    },
    openMethod: {
        type: String as PropType<TooltipOpenMethod>,
        default: 'mouseOver',
    },
    closeMethod: {
        type: String as PropType<TooltipCloseMethod>,
        default: 'mouseLeave',
    },
    clickOutsideOptions: {
        type: Object as PropType<Omit<ClickOutsideOptions, 'element' | 'callback'>>,
        default: () => ({}),
    },
    cursorDefault: {
        type: Boolean,
        default: false,
    },
});
defineSlots<{ default(): any; activator(): any }>();

function handleClick(eventType: 'mouseLeave' | 'mouseOver' | 'click' | 'focus' | 'focusOut') {
    switch (eventType) {
        case 'mouseLeave':
            if (props.closeMethod === 'mouseLeave') model.value = false;
            break;
        case 'mouseOver':
            if (props.openMethod === 'mouseOver') model.value = true;
            break;
        case 'click':
            if (props.openMethod === 'click' && !model.value) model.value = true;
            if (props.closeMethod === 'click' && model.value) model.value = false;
            break;
        case 'focusOut':
            if (props.closeMethod === 'clickOutside') model.value = false;
            break;
        default:
            break;
    }
}

export type TooltipOpenMethod = 'click' | 'mouseOver' | 'disabled';

export type TooltipCloseMethod = 'delay' | 'click' | 'clickOutside' | 'mouseLeave';

export type TooltipLocation = 'left' | 'right' | 'top' | 'bottom';

const model = defineModel({
    type: Boolean,
    default: false,
});

const tooltip = ref<HTMLDivElement | null>(null);

// eslint-disable-next-line vue/no-setup-props-reactivity-loss
useClickOutside({
    ...props.clickOutsideOptions,
    element: tooltip,
    callback: () => handleClick('focusOut'),
});
</script>

<style scoped lang="scss">
.tooltip {
    --transform: -50%;
    position: relative;

    &--align-right {
        --transform: -90%;
    }

    &--align-left {
        --transform: -10%;
    }

    &_activator {
        cursor: pointer;
        position: relative;
    }

    &--cursor-default .tooltip_activator {
        cursor: default;
    }

    &_container {
        position: absolute;
        z-index: 8;

        width: v-bind(width);
        max-width: v-bind(maxWidth);
        padding: 4px;

        &_content {
            padding: 4px;
            border-radius: 8px;
            color: $darkgray850;
            background: currentColor;

            &_icon {
                position: absolute;
                height: 8px;
            }

            &_text {
                padding: 8px;
                font-size: 11px;
                font-weight: 400;
                color: $lightgray0;
            }
        }

        &--appear {
            &-enter-active,
            &-leave-active {
                opacity: 1;
                transition: 0.3s;
            }

            &-enter-from,
            &-leave-to {
                opacity: 0;
            }
        }
    }

    &--location-top .tooltip_container {
        bottom: 100%;
        left: 50%;
        transform: translateX(var(--transform));
    }

    &--location-bottom .tooltip_container {
        top: 100%;
        left: 50%;
        transform: translateX(var(--transform));
    }

    &--location-left .tooltip_container {
        top: 50%;
        right: 100%;
        transform: translateY(var(--transform));
    }

    &--location-right .tooltip_container {
        top: 50%;
        left: 100%;
        transform: translateY(var(--transform));
    }
}
</style>
