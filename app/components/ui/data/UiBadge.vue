<template>
    <div
        class="badge"
        :class="[`badge--type-${ type }`, { 'badge--animated': animate }]"
        :style="{ '--badge-size': `${ size }px`, '--badge-color': getColor }"
    >
        <div class="badge_circle"/>
    </div>
</template>

<script setup lang="ts">
import type { ColorsList } from '~/utils/colors';

export type BadgeType = 'offline' | 'online' | 'warning' | 'critical';

const props = defineProps({
    type: {
        type: String as PropType<BadgeType>,
        default: 'offline',
    },
    color: {
        type: String as PropType<string | ColorsList | null>,
        default: null,
    },
    animate: {
        type: Boolean,
        default: false,
    },
    size: {
        type: Number,
        default: 10,
    },
});

const getColor = computed(() => {
    if (props.color) {
        if (props.color in radarColors) return radarColors[props.color as ColorsList];
        return props.color;
    }

    switch (props.type) {
        case 'online':
            return radarColors.green500;
        case 'warning':
            return radarColors.orange500;
        case 'critical':
            return radarColors.red500;
        case 'offline':
        default:
            return radarColors.whiteAlpha2;
    }
});
</script>

<style scoped lang="scss">
.badge {
    position: relative;

    display: flex;
    align-items: center;
    justify-content: center;

    width: var(--badge-size);
    height: var(--badge-size);

    &::before {
        content: '';

        position: absolute;
        inset: 0;

        width: 100%;
        height: 100%;
        border: 1px solid var(--badge-color);
        border-radius: 100%;

        opacity: 0.32;
    }

    &_circle {
        width: calc(var(--badge-size) - 6px);
        height: calc(var(--badge-size) - 6px);
        border-radius: 100%;
        background: var(--badge-color);
    }

    &--type-offline {
        &::before {
            border-color: $whiteAlpha24;
            opacity: 1;
        }

        .badge_circle {
            display: none;
        }
    }

    &--animated::after {
        content: '';
        color: var(--badge-color);
    }
}
</style>
