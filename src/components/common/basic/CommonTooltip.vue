<template>
    <div
        class="tooltip"
        :class="[`tooltip--location-${ location }`]"
        @click="model = !model"
        @mouseleave="model = false"
        @mouseover="model = true"
    >
        <div
            v-if="$slots.activator"
            class="tooltip_activator"
        >
            <slot name="activator"/>
        </div>
        <transition name="tooltip_content--appear">
            <div
                v-if="model"
                class="tooltip_content"
            >
                <div class="tooltip_content_icon">
                    <triangle-left-icon/>
                </div>
                <div class="tooltip_content_text">
                    <slot/>
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
});

defineSlots<{ default(): any; activator(): any }>();

export type TooltipLocation = 'left' | 'right' | 'top' | 'bottom';

const model = defineModel({
    type: Boolean,
    default: false,
});
</script>

<style scoped lang="scss">
.tooltip {
    position: relative;

    &_activator {
        cursor: pointer;
        position: relative;
    }

    &_content {
        position: absolute;
        z-index: 1;

        padding: 4px;

        color: $neutral850;

        background: currentColor;
        border-radius: 8px;

        &_icon {
            position: absolute;
            height: 8px;
        }

        &_text {
            width: v-bind(width);
            padding: 8px;

            font-size: 11px;
            font-weight: 400;
            color: $neutral0;
        }
    }
}
</style>
