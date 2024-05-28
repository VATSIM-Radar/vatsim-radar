<template>
    <div
        class="bubble"
        :class="[`bubble--size-${ size }`]"
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
});

defineSlots<{ default: () => any }>();
</script>

<style scoped lang="scss">
.bubble {
    min-width: 24px;
    padding: 2px 4px;

    font-family: $defaultFont;
    font-size: 11px;
    font-weight: 600;
    line-height: 100%;
    color: $neutral150Orig;
    text-align: center;

    background: $primary500;
    border-radius: 4px;

    &--size-M {
        padding: 4px 8px;
    }
}
</style>
