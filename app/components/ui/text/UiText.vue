<template>
    <component
        :is="getTag"
        class="text"
        :class="[`text--type-${ type }`, {
            'text--type-b': isTypeB,
        }]"
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
import type { ColorsList } from '~/utils/colors';
import { NuxtLink } from '#components';

const props = defineProps({
    type: {
        type: String as PropType<UiTextTypes>,
        required: true,
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

const bTypes: UiTextTypes[] = ['1b', '2b-medium', '2b', '3b', '3b-medium', '3b-medium-alt'];

const isTypeB = computed(() => bTypes.includes(props.type));

export type UiTextTypes =
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h5-upper'
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
    font-family: $defaultFont;
    font-weight: normal;
    font-style: normal;
    line-height: 100%;

    &[class^='text--type-h'], &[class*=' text--type-h'] {
        margin: 0;
        font-weight: 500;
        letter-spacing: -0.01em;
    }

    &--type-h1 {
        font-size: 32px;
    }

    &--type-h2 {
        font-size: 28px;
    }

    &--type-h3 {
        font-size: 24px;
        text-transform: uppercase;
    }

    &--type-h4 {
        font-size: 20px;
        text-transform: uppercase;
    }

    &--type-h5 {
        font-size: 16px;
    }

    &--type-h5-upper {
        font-size: 16px;
        text-transform: uppercase;
    }

    &--type-b {
        font-weight: 500;
        line-height: 130%;
    }

    &--type-1b {
        font-size: 16px;
    }

    &--type-2b {
        font-size: 14px;
    }

    &--type-2b-medium {
        font-size: 14px;
        font-weight: 600;
    }

    &--type-3b {
        font-size: 12px;
    }

    &--type-3b-medium {
        font-size: 12px;
        font-weight: 600;
    }

    &--type-3b-alt {
        font-family: $juraFont;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.02em;
    }

    &--type-caption {
        font-size: 11px;
    }

    &--type-caption-light {
        font-family: $juraFont;
        font-size: 11px;
        font-weight: normal;
        letter-spacing: -0.04em;
    }

    &--type-caption-medium {
        font-size: 11px;
        font-weight: 600;
    }

    &--type-caption-medium-alt {
        font-family: $juraFont;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.02em;
    }
}
</style>
