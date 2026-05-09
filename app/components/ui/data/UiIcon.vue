<template>
    <div
        class="icon"
        :style="{ '--color': color in radarColors ? radarColors[color as ColorsList] : color, '--size': `${ size }px`, '--offset': `${ iconOffset }px` }"
    >
        <slot/>
    </div>
</template>

<script setup lang="ts">
import type { ColorsList } from '~/utils/colors';

defineProps({
    color: {
        type: String as PropType<string | ColorsList>,
        default: 'transparent',
    },
    size: {
        type: Number,
        default: 20,
    },
    iconOffset: {
        type: Number,
        default: 8,
    },
});

defineSlots<{ default?(): any }>();
</script>

<style scoped lang="scss">
.icon {
    position: relative;

    width: var(--size);
    height: var(--size);
    padding: 4px;

    color: var(--color);

    &::before {
        content: '';

        position: absolute;
        inset: calc(50% - var(--size) / 2 - var(--offset) / 2);

        width:  calc(var(--size) + var(--offset));
        height: calc(var(--size) + var(--offset));
        border-radius: 8px;

        opacity: 0.12;
        background: currentColor;
    }

    &:deep(svg) {
        width: 100%;
    }
}
</style>
