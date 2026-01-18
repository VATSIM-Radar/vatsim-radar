<template>
    <div
        class="stick"
        title="Stick overlay"
        @click="overlay.sticky = !overlay.sticky"
    >
        <pin-icon
            class="stick_icon"
            :class="{ 'stick_icon--sticky': overlay?.sticky }"
            height="16"
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
.stick {
    padding: 0 4px;

    &_icon {
        transition: 0.3s;

        &--sticky {
            transform: rotate(45deg);
            color: $primary500;
        }
    }
}
</style>
