<template>
    <div
        class="loader"
        :style="{
            '--loader-size': size,
            '--loader-color': color ? radarColors[color] : undefined,
        }"
    >
        <div class="loader_spinner"/>
        <ui-text
            v-if="$slots.default"
            type="caption-medium"
        >
            <slot/>
        </ui-text>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { ColorsList } from '~/utils/colors';
import { radarColors } from '#build/radar/colors';
import UiText from '~/components/ui/text/UiText.vue';

defineProps({
    size: {
        type: String,
        default: '40px',
    },
    color: {
        type: String as PropType<ColorsList | null>,
        default: null,
    },
});

defineSlots<{ default?(): any }>();
</script>

<style scoped lang="scss">
.loader {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
    justify-content: center;

    &_spinner {
        width: var(--loader-size);
        height: var(--loader-size);
        border: 3px solid $darkGray400;
        border-top-color: var(--loader-color, #{$blue500});
        border-radius: 50%;

        animation: loader-spin 0.8s linear infinite;

        @keyframes loader-spin {
            to {
                transform: rotate(360deg);
            }
        }
    }
}
</style>
