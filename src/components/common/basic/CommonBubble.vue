<template>
    <component
        :is
        class="bubble"
        :class="[
            `bubble--size-${ size }`,
            `bubble--type-${ type }`,
        ]"
    >
        <slot/>
    </component>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';

defineProps({
    size: {
        type: String as PropType<'S' | 'M'>,
        default: 'S',
    },
    type: {
        type: String as PropType<'primary' | 'secondary' | 'primary-flat'>,
        default: 'primary',
    },
    is: {
        type: String,
        default: 'div',
    },
});

defineSlots<{ default: () => any }>();
</script>

<style scoped lang="scss">
.bubble {
    display: inline-block;

    min-width: 24px;
    padding: 2px 4px;
    border-radius: 4px;

    font-family: $defaultFont;
    font-size: 11px;
    font-weight: 600;
    line-height: 100%;
    color: $lightgray150Orig;
    text-align: center;
    text-decoration: none;

    background: $primary500;

    &--size-M {
        padding: 4px 8px;
    }

    &--type-secondary {
        color: $lightgray150;
        background: $darkgray875;
    }

    &--type-primary-flat {
        padding: 0;
        border-radius: 0;
        color: $primary500;
        background: transparent;
    }
}
</style>
