<template>
    <component
        :is="getTag"
        class="text"
        :class="[`text--type-${ type }`]"
        :style="{
            '--text-primary-color': color !== 'currentColor' ? `var(--${ color })` : undefined,
            '--text-hover-color': linkHoverColor ? `var(--${ linkHoverColor })` : undefined,
        }"
    >
        <slot/>
    </component>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { RouteLocationRaw } from '#vue-router';
import type { ColorsList } from '~/utils/server/styles';
import { NuxtLink } from '#components';

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

const props = defineProps({
    type: {
        type: String as PropType<any>,
    },
    tag: {
        type: String,
    },
    href: {
        type: String,
        default: null,
    },
    target: {
        type: String,
        default: null,
    },
    color: {
        type: String as PropType<ColorsList | 'currentColor'>,
        default: 'currentColor',
    },
    linkHoverColor: {
        type: String as PropType<ColorsList>,
    },
    to: {
        type: [String, Object] as PropType<RouteLocationRaw | string | null | undefined>,
        default: null,
    },

});

defineSlots<{ default: () => any }>();

const getTag = computed(() => {
    if (props.href) return 'a';
    if (props.to) return NuxtLink;
    if (props.tag) return props.tag;

    if (props.type.startsWith('h')) return props.type;

    return 'div';
});
</script>

<style scoped lang="scss">
.text {
  &[class^='text--type-h'], &[class*=' text--type-h'] {
    margin: 0;
  }
}
</style>
