<template>
    <div title="Stick overlay" @click="overlay.sticky = !overlay.sticky">
        <pin-icon
            height="16"
            class="pilot-stick"
            :class="{'pilot-stick--sticky': overlay?.sticky}"
        />
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import PinIcon from '@/assets/icons/kit/pin.svg?component';
import type { StoreOverlay } from '~/store/map';

defineProps({
    overlay: {
        type: Object as PropType<StoreOverlay>,
        required: true,
    },
});
</script>

<style scoped lang="scss">
.pilot-stick {
    transition: 0.3s;

    &--sticky {
        color: $primary500;
        transform: rotate(45deg);
    }
}
</style>
