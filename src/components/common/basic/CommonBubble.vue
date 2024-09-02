<template>
    <div
        class="bubble"
        :class="[
            `bubble--size-${ size }`,
            `bubble--type-${ type }`,
        ]"
    >
        <slot/>
    </div>
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
});

defineSlots<{ default: () => any }>();
</script>

<style scoped lang="scss">
.bubble {
    display: inline-block;

    min-width: 24px;
    padding: 2px 4px;

    font-family: $defaultFont;
    font-size: 11px;
    font-weight: 600;
    line-height: 100%;
    color: $lightgray150Orig;
    text-align: center;

    background: $primary500;
    border-radius: 4px;

    &--size-M {
        padding: 4px 8px;
    }

    &--type-secondary {
        color: $lightgray150;
        background: $darkgray875;
    }

    &--type-primary-flat {
        padding: 0;
        color: $primary500;
        background: transparent;
        border-radius: 0;
    }
}
</style>
