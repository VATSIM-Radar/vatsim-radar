<template>
    <component
        :is="getTag"
        class="button"
        :class="[
            `button--type-${ type }`,
            `button--size-${ size }`,
            `button--orientation-${ orientation }`,
            {
                'button--disabled': disabled,
                'button--icon': !!$slots.icon && !$slots.default,
            },
        ]"
        :style="{
            '--button-width': width ?? 'auto',
            '--icon-width': iconWidth,
            '--primary-color': radarColors[primaryColor],
            '--link-color': radarColors[linkColor],
            '--hover-color': radarColors[hoverColor],
            '--focus-color': radarColors[focusColor],
        }"
        :target="target"
        v-bind="getAttrs"
        @click="!disabled && $emit('click', $event)"
    >
        <div
            v-if="$slots.icon"
            class="button_icon"
        >
            <slot name="icon"/>
        </div>
        <div
            v-if="$slots.default"
            class="button_content"
        >
            <slot name="default"/>
        </div>
    </component>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import { NuxtLink } from '#components';
import type { ColorsList } from '~/utils/backend/styles';
import { radarColors } from '#build/radar/colors';

const props = defineProps({
    tag: {
        type: String,
    },
    width: {
        type: String,
    },
    iconWidth: {
        type: String,
        default: '16px',
    },
    type: {
        type: String as PropType<'primary' | 'secondary' | 'secondary-875' | 'secondary-flat' | 'link' | 'transparent'>,
        default: 'primary',
    },
    orientation: {
        type: String as PropType<'vertical' | 'horizontal'>,
        default: 'horizontal',
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    size: {
        type: String as PropType<'M' | 'S'>,
        default: 'M',
    },
    href: {
        type: String,
        default: null,
    },
    target: {
        type: String,
        default: null,
    },
    to: {
        type: [String, Object] as PropType<RouteLocationRaw | string | null | undefined>,
        default: null,
    },
    primaryColor: {
        type: String as PropType<ColorsList>,
        default: 'primary500',
    },
    linkColor: {
        type: String as PropType<ColorsList>,
        default: 'lightgray150',
    },
    hoverColor: {
        type: String as PropType<ColorsList>,
        default: 'primary400',
    },
    focusColor: {
        type: String as PropType<ColorsList>,
        default: 'primary600',
    },
    textAlign: {
        type: String,
        default: 'center',
    },
});

defineEmits({
    click(e: MouseEvent) {
        return true;
    },
});

defineSlots<{
    default(): any;
    icon(): any;
}>();

const getTag = computed(() => {
    if (props.disabled) return props.tag ?? 'div';
    if (props.href) return 'a';
    if (props.to) return NuxtLink;
    return props.tag ?? 'div';
});

const getAttrs = computed(() => {
    const attrs: Record<string, any> = {};
    if (props.to) {
        attrs.to = props.to;
        attrs.noPrefetch = true;
    }
    else if (props.href) attrs.href = props.href;

    return attrs;
});
</script>

<style scoped lang="scss">
.button {
    cursor: pointer;
    user-select: none;

    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: center;

    width: var(--button-width);
    min-height: 40px;
    padding: 8px 16px;

    font-family: $defaultFont;
    font-size: 13px;
    font-weight: 600;
    color: $lightgray50Orig;
    text-align: v-bind(textAlign);
    text-decoration: none;

    appearance: none;
    background: var(--primary-color);
    border: none;
    border-radius: 8px;
    outline: none;
    box-shadow: none;

    &_content {
        width: 100%;
        min-width: max-content;
    }

    @include hover {
        transition: 0.3s;

        &:hover {
            background: var(--hover-color);
        }

        &:focus, &:active {
            background: var(--focus-color);
        }
    }

    &_icon {
        width: var(--icon-width);
        min-width: var(--icon-width);
    }

    &--type-secondary, &--type-secondary-flat, &--type-secondary-875 {
        color: $lightgray50;
        background: $darkgray900;
    }

    &--type-secondary-875 {
        background: $darkgray875;
    }

    &--type-secondary, &--type-secondary-875 {
        @include hover {
            &:hover {
                background: $darkgray850;
            }

            &:focus, &:active {
                background: $darkgray800;
            }
        }
    }

    &--type-secondary-flat {
        @include hover {
            &:hover {
                color: $primary500;
                background: $darkgray900;
            }

            &:focus, &:active {
                color: $primary500;
                background: $darkgray900;
            }
        }
    }

    &--type-transparent {
        color: $lightgray150;
        background: transparent !important;

        @include hover {
            &:hover {
                color: $primary500;
            }

            &:focus, &:active {
                color: $primary600;
            }
        }
    }

    &--orientation-vertical {
        flex-direction: column;
        text-align: center;
    }

    &--icon {
        width: 40px;
        height: 40px;
        padding: 8px;
    }

    &--size-S {
        min-height: 32px;

        &.button--icon {
            width: 32px;
            height: 32px;
        }
    }

    &--type-link {
        justify-content: flex-start;

        height: auto;
        min-height: auto;
        padding: 0;

        font-size: 10px;
        color: var(--link-color);
        text-align: left;
        text-decoration: underline;

        background: transparent !important;
        border-radius: 0;

        @include hover {
            &:hover {
                color: var(--hover-color);
            }

            &:focus, &:active {
                color: var(--focus-color);
            }
        }
    }

    &--disabled {
        opacity: 0.5;

        &, &:deep(svg) {
            pointer-events: none;
            cursor: default;
        }
    }
}
</style>
