<template>
    <div
        class="pilot-stats"
        :class="{ 'pilot-stats--flashing': hours < 1, 'pilot-stats--10k': hours > 10000 }"
    >
        {{ hours }}h
    </div>
</template>

<script setup lang="ts">
import type { ColorsList } from '~/utils/colors';

const props = defineProps({
    hours: {
        type: Number,
        required: true,
    },
});

const colors = {
    10: getCurrentThemeHexColor('red700'),
    50: getCurrentThemeHexColor('red300'),
    100: getCurrentThemeHexColor('orange700'),
    200: getCurrentThemeHexColor('orange500'),
    500: getCurrentThemeHexColor('green300'),
    1000: getCurrentThemeHexColor('purple500'),
    3000: getCurrentThemeHexColor('purple300'),
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
