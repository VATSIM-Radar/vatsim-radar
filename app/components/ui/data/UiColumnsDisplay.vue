<template>
    <div class="__section-group __section-group--disable-mobile">
        <div
            v-if="$slots.col1"
            class="__info-sections"
        >
            <slot name="col1"/>
        </div>
        <div
            v-if="$slots.col2"
            class="__info-sections"
        >
            <slot name="col2"/>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';

defineProps({
    alignItems: {
        type: String as PropType<'flex-start' | 'center' | 'space-between' | 'space-evenly' | 'flex-end'>,
        default: 'flex-end',
    },
});

defineSlots<{ col1?: () => any; col2?: () => any }>();
</script>

<style lang="scss" scoped>
.__section-group {
    align-items: v-bind(alignItems);
}
</style>
