<template>
    <div
        class="pilot-stats"
        :class="{ 'pilot-stats--flashing': hours < 1, 'pilot-stats--10k': hours > 10000 }"
    >
        {{ hours }}h
    </div>
</template>

<script setup lang="ts">
import type { ColorsList } from '~/utils/server/styles';

const props = defineProps({
    hours: {
        type: Number,
        required: true,
    },
});

const colors = {
    10: getCurrentThemeHexColor('error700'),
    50: getCurrentThemeHexColor('error300'),
    100: getCurrentThemeHexColor('warning700'),
    200: getCurrentThemeHexColor('warning500'),
    500: getCurrentThemeHexColor('success300'),
    1000: getCurrentThemeHexColor('info500'),
    3000: getCurrentThemeHexColor('info300'),
} satisfies Record<number, ColorsList | string>;

const color = computed(() => {
    return Object.entries(colors).find(([hours]) => {
        return props.hours < +hours;
    })?.[1] ?? colors[3000];
});
</script>

<style scoped lang="scss">
.pilot-stats {
    color: v-bind(color) !important;

    @keyframes flashing {
        0%{
            opacity: 1;
        }

        50% {
            opacity: 0.5;
        }

        100% {
            opacity: 1;
        }
    }

    &--flashing {
        animation: flashing 1s ease-in-out infinite;
    }

    &--10k {
        color: transparent !important;
        background-image: linear-gradient(90deg, #984EF9 0%, #DA5525 60%, #EAC453 100%);
        background-clip: text;
    }
}
</style>
