<template>
    <component
        :is="getTag"
        class="button"
        :class="[
            `button--type-${type}`,
            `button--size-${size}`,
            {
                'button--disabled': disabled,
                'button--icon': !!$slots.icon && !$slots.default
            }
        ]"
        :target="target"
        @click="!disabled && $emit('click', $event)"
        v-bind="getAttrs"
    >
        <div class="button_icon" v-if="$slots.icon">
            <slot name="icon"/>
        </div>
        <div class="button_content" v-if="$slots.default">
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
    type: {
        type: String as PropType<'primary' | 'secondary'>,
        default: 'primary',
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
    default(): any
    icon(): any
}>();

const getTag = computed(() => {
    if (props.disabled) return props.tag ?? 'div';
    if (props.href) return 'a';
    if (props.to) return NuxtLink;
    return props.tag ?? 'div';
});

const getAttrs = computed(() => {
    const attrs: Record<string, any> = {};
    if (props.to) attrs.to = props.to;
    else if (props.href) attrs.href = props.href;

    return attrs;
});
</script>

<style scoped lang="scss">
.button {
    padding: 8px 16px;
    background: $primary500;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    color: $neutral50;
    font-size: 13px;
    font-weight: 600;
    font-family: $defaultFont;
    appearance: none;
    box-shadow: none;
    outline: none;
    border: none;
    cursor: pointer;
    border-radius: 8px;
    min-height: 40px;
    text-decoration: none;
    text-align: center;

    @include hover {
        transition: 0.3s;

        &:hover {
            background: $primary400;
        }

        &:focus, &:active {
            background: $primary600;
        }
    }

    &--type-secondary {
        background: $neutral900;

        @include hover {
            &:hover {
                background: $neutral850;
            }

            &:focus, &:active {
                background: $neutral800;
            }
        }
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

    &--disabled {
        opacity: 0.8;
        pointer-events: none;
        cursor: default;
    }
}
</style>
