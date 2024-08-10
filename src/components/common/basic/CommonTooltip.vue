<template>
    <div
        class="tooltip"
        :class="[`tooltip--location-${ location }`]"
        @mouseleave="closeMethod === 'mouseLeave' &&  (model = false)"
        @mouseover="openMethod === 'mouseOver' &&  (model = true)"
    >
        <div
            v-if="$slots.activator"
            class="tooltip_activator"
            tabindex="0"
            @click="closeMethod !== 'clickOutside' && (model = !model)"
            @focus="closeMethod === 'clickOutside' && (model = true)"
            @focusout="closeMethod === 'clickOutside' &&  (model = false)"
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

defineProps({
    location: {
        type: String as PropType<TooltipLocation>,
        default: 'top',
    },
    width: {
        type: String,
        default: '80px',
    },
    maxWidth: {
        type: String,
    },
    openMethod: {
        type: String as PropType<TooltipOpenMethod>,
        default: () => 'mouseOver',
    },
    closeMethod: {
        type: String as PropType<TooltipCloseMethod>,
        default: () => 'mouseLeave',
    },
});

defineSlots<{ default(): any; activator(): any }>();

export type TooltipOpenMethod = 'click' | 'mouseOver';

export type TooltipCloseMethod = 'delay' | 'click' | 'clickOutside' | 'mouseLeave';

export type TooltipLocation = 'left' | 'right' | 'top' | 'bottom';

const model = defineModel({
    type: Boolean,
    default: false,
});
</script>

<style scoped lang="scss">
.tooltip {
    --transform: -50%;
    position: relative;

    &_activator {
        cursor: pointer;
        position: relative;
    }

    &_container {
        position: absolute;
        z-index: 1;
        padding: 4px;

        &_content {
            padding: 4px;
            color: $darkgray850;
            background: currentColor;
            border-radius: 8px;

            &_icon {
                position: absolute;
                height: 8px;
            }

            &_text {
                width: v-bind(width);
                max-width: v-bind(maxWidth);
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
