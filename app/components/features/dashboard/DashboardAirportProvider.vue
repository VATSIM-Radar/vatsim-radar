<template>
    <slot/>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { StoreOverlayAirport } from '~/store/map';
import { provideAirport } from '~/composables/vatsim/airport';

const props = defineProps({
    data: {
        type: Object as PropType<StoreOverlayAirport['data']>,
        required: true,
    },
});

defineSlots<{ default(): any }>();

provideAirport(computed(() => props.data));
</script>
