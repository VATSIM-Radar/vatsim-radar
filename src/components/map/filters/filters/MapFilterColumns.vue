<template>
    <div class="__section-group">
        <div class="__info-sections">
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
defineSlots<{ col1?: () => any; col2?: () => any }>();
</script>

<style lang="scss" scoped>
.__section-group {
    align-items: flex-end;
}
</style>
