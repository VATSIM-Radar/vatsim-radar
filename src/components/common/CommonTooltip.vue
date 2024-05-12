<template>
    <div
        class="tooltip"
        :class="[`tooltip--location-${location}`]"
        @mouseover="model = true"
        @mouseleave="model = false"
        @click="model = !model"
    >
        <div class="tooltip_activator" v-if="$slots.activator">
            <slot name="activator"/>
        </div>
        <transition name="tooltip_content--appear">
            <div class="tooltip_content" v-if="model">
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
import TriangleLeftIcon from '@/assets/icons/basic/triangle-left.svg?component';
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

export type TooltipLocation = 'left' | 'right' | 'top' | 'bottom'

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
        color: $neutral850;
        background: currentColor;
        padding: 4px;
        border-radius: 8px;
        z-index: 1;

        &_icon {
            position: absolute;
            height: 8px;
        }

        &_text {
            color: $neutral0;
            font-size: 11px;
            font-weight: 400;
            padding: 8px;
            width: v-bind(width);
        }
    }
}
</style>
