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
            '--button-width': width,
            '--icon-width': iconWidth,
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
        type: String as PropType<'primary' | 'secondary' | 'secondary-flat' | 'link' | 'transparent'>,
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
    text-align: center;
    text-decoration: none;

    appearance: none;
    background: $primary500;
    border: none;
    border-radius: 8px;
    outline: none;
    box-shadow: none;

    @include hover {
        transition: 0.3s;

        &:hover {
            background: $primary400;
        }

        &:focus, &:active {
            background: $primary600;
        }
    }

    &_icon {
        width: var(--icon-width);
    }

    &--type-secondary, &--type-secondary-flat {
        color: $lightgray50;
        background: $darkgray900;
    }

    &--type-secondary {
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
        color: $lightgray150;
        text-align: left;
        text-decoration: underline;

        background: transparent !important;
        border-radius: 0;

        @include hover {
            &:hover {
                color: $primary500;
            }

            &:focus, &:active {
                color: $primary600;
            }
        }
    }

    &--disabled {
        pointer-events: none;
        cursor: default;
        opacity: 0.5;
    }
}
</style>
