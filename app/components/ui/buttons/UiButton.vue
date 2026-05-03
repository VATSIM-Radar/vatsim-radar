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
            '--primary-color': primaryColor ? radarColors[primaryColor] : null,
            '--link-color': linkColor ? radarColors[linkColor] : null,
            '--hover-color': hoverColor ? radarColors[hoverColor] : null,
            '--focus-color': focusColor ? radarColors[focusColor] : null,
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
        <ui-text
            v-if="$slots.default"
            class="button_content"
            type="2b"
        >
            <slot name="default"/>
        </ui-text>
        <div
            v-if="$slots.append"
            class="button_append"
        >
            <slot name="append"/>
        </div>
    </component>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import { NuxtLink } from '#components';
import type { ColorsList } from '~/utils/colors';
import { radarColors } from '#build/radar/colors';
import UiText from '~/components/ui/text/UiText.vue';

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
        type: String as PropType<'primary' | 'secondary' | 'secondary-black' | 'destructive' | 'link'>,
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
        type: String as PropType<ColorsList | null>,
        default: null,
    },
    linkColor: {
        type: String as PropType<ColorsList>,
        default: 'lightGray200',
    },
    hoverColor: {
        type: String as PropType<ColorsList | null>,
        default: null,
    },
    focusColor: {
        type: String as PropType<ColorsList | null>,
        default: null,
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
    default?(): any;
    icon?(): any;
    append?(): any;
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
    padding: 8px 20px;
    border: none;
    border-radius: 4px;

    color: $typographyPrimary;
    text-align: v-bind(textAlign);
    text-decoration: none;

    appearance: none;
    background: var(--primary-color, $blue500);
    outline: none;
    box-shadow: none;

    &_content {
        width: 100%;
        min-width: min-content;
    }

    @include pc {
        transition: 0.3s;

        &:hover {
            background: var(--hover-color, $blue400);
        }

        &:focus, &:active {
            background: var(--focus-color, $blue600);
        }
    }

    &--type-primary {
        color: $typographyPrimaryOrig;
    }

    &_icon {
        width: var(--icon-width);
        min-width: var(--icon-width);
    }

    &--type-secondary, &--type-destructive {
        background: var(--primary-color, transparent);
    }

    &--type-secondary, &--type-destructive {
        @include hover {
            &:hover {
                background: var(--hover-color, $whiteAlpha4);
            }

            &:active, &:focus {
                background: var(--focus-color, $blue500Alpha32);
            }
        }
    }

    &--type-secondary-black {
        background: var(--primary-color, $darkgray900);

        @include hover {
            &:hover {
                background: var(--hover-color, $darkGray600);
            }

            &:active, &:focus {
                background: var(--focus-color, $darkGray400);
            }
        }
    }

    &--type-destructive .button_content {
        color: $red600;
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
        border-radius: 0;

        font-size: 10px;
        color: var(--link-color);
        text-align: left;
        text-decoration: underline;

        background: transparent !important;

        &.button--icon {
            width: auto;
        }

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
        opacity: 0.24;

        &.button--type-primary {
            background: $whiteAlpha2;
        }

        &, &:deep(svg) {
            pointer-events: none;
            cursor: default;
        }
    }
}
</style>
