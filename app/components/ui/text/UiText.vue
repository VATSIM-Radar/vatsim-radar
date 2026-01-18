<template>
    <component
        :is="getTag"
        class="text"
        :class="[`text--type-${ type }`]"
    >
        <slot/>
    </component>
</template>

<script setup lang="ts">
export type UiTextTypes =
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6-upper'
    | '1b'
    | '2b-medium'
    | '2b'
    | '3b'
    | '3b-medium'
    | '3b-medium-alt'
    | 'caption-light'
    | 'caption'
    | 'caption-medium'
    | 'caption-medium-alt';

defineProps({
    type: {
        type: String as PropType<any>,
    },
    tag: {
        type: String,
    },
});

defineSlots<{ default: () => any }>();

const getTag = computed(() => {

});
</script>

<style scoped lang="scss">
.text {

}
</style>
