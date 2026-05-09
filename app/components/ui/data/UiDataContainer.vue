<template>
    <div
        class="data-container"
        :class="{ 'data-container--disable-flex': disableFlex }"
    >
        <ui-icon
            v-if="$slots.icon"
            class="data-container_icon"
            :color="iconColor"
            :size="iconSize"
        >
            <slot name="icon"/>
        </ui-icon>
        <div class="data-container_content">
            <slot/>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ColorsList } from '~/utils/colors';
import UiIcon from '~/components/ui/data/UiIcon.vue';

defineProps({
    disableFlex: {
        type: Boolean,
        default: false,
    },
    iconColor: {
        type: String as PropType<string | ColorsList>,
        default: 'blue500' satisfies ColorsList,
    },
    iconSize: {
        type: Number,
        default: 20,
    },
});

defineSlots<{
    default?(): any;
    icon?(): any;
}>();
</script>

<style scoped lang="scss">
.data-container {
    display: flex;
    gap: 20px;
    align-items: flex-start;

    &:not(&--disable-flex) .data-container_content {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        gap: 8px;
    }
}
</style>
