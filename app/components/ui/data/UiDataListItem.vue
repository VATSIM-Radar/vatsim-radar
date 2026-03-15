<template>
    <div class="list-item"/>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { TooltipLocation } from '~/components/ui/data/UiTooltip.vue';

const props = defineProps({
    cid: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    location: {
        type: String as PropType<TooltipLocation>,
        default: 'left',
    },
});

defineSlots<{
    default?(): any;
    title?(): any;
    hint?(): any;
}>();
</script>

<style scoped lang="scss">
.list-item {

}
</style>
