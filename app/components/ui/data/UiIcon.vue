<template>
    <div
        class="icon"
        :class="{ 'icon--real-offset': realOffset }"
        :style="{
            '--color': color in radarColors ? radarColors[color as ColorsList] : color,
            '--icon-color': (iconColor && iconColor in radarColors) ? radarColors[iconColor as ColorsList] : (iconColor ?? undefined),
            '--size': `${ size }px`,
            '--offset': `${ iconOffset }px`,
        }"
    >
        <slot/>
    </div>
</template>

<script setup lang="ts">
import type { ColorsList } from '~/utils/colors';

defineProps({
    color: {
        type: String as PropType<string | ColorsList>,
        default: 'blue500',
    },
    iconColor: {
        type: String as PropType<string | ColorsList | null>,
        default: null,
    },
    size: {
        type: Number,
        default: 20,
    },
    iconOffset: {
        type: Number,
        default: 8,
    },
    realOffset: {
        type: Boolean,
        default: false,
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

    &::before {
        content: '';

        position: absolute;
        inset: calc(50% - var(--size) / 2 - var(--offset) / 2);

        width:  calc(var(--size) + var(--offset));
        height: calc(var(--size) + var(--offset));
        border-radius: 8px;

        opacity: 0.12;
        background: var(--color);
    }

    &--real-offset {
        width:  calc(var(--size) + var(--offset));
        height: calc(var(--size) + var(--offset));
        padding: calc(4px + var(--offset) / 2);

        &::before {
            inset: 0;
        }
    }

    &:deep(svg) {
        width: 100%;
        color: var(--icon-color, var(--color));
    }
}
</style>
