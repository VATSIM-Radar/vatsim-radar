<template>
    <component
        :is="tag"
        class="container"
    >
        <slot/>
    </component>
</template>

<script lang="ts" setup>
defineProps({
    tag: {
        type: String,
        default: 'div',
    },
});

defineSlots<{
    default(): any;
}>();
</script>

<style lang="scss" scoped>
.container {
    @include mobile {
        width: 100%;
        max-width: 100%;
        padding: 0 8px;
    }

    position: relative;
    width: 1366px;
    margin-right: auto;
    margin-left: auto;

    @media all and (max-width: 319px) {
        max-width: 320px;
    }
}
</style>
