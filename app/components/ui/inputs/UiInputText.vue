<template>
    <div
        class="input"
        :class="{ 'input--focused': focused, 'input--error': error, 'input--disabled': disabled }"
        :style="{ '--input-height': height }"
    >
        <ui-text
            v-if="$slots.default"
            class="input_label"
            type="2b-medium"
        >
            <slot/>
        </ui-text>
        <div class="input_container">
            <ui-text
                v-if="$slots.prepend"
                class="input_container_prepend"
                color="lightGray900"
                type="2b-medium"
                @click="emit('prependClick', { event: $event, input })"
            >
                <slot name="prepend"/>
            </ui-text>
            <ui-separator
                v-if="$slots.prepend"
                distance="0"
                full
            />
            <ui-text
                class="input__input"
                tag="label"
                type="2b"
                @click="(e: Event) => !!$slots.htmlContent && e.preventDefault()"
            >
                <div
                    v-if="$slots.htmlContent"
                    class="input__input_input"
                    @click="input?.focus()"
                >
                    <slot name="htmlContent"/>
                </div>
                <input
                    v-bind="inputAttrs"
                    ref="input"
                    v-model="model"
                    class="input__input_input"
                    :disabled="!!$slots.htmlContent"
                    :placeholder
                    :type="inputType"
                    @blur="focused = false"
                    @change="$emit('change', $event)"
                    @focus="focused = true"
                    @focusout="focused = false"
                    @input="$emit('input', $event)"
                >
            </ui-text>
            <ui-separator
                v-if="max || $slots.append"
                distance="0"
                full
            />
            <ui-text
                v-if="max"
                class="input_container_counter"
                color="whiteAlpha36"
                type="2b-medium"
            >
                {{model?.length ?? 0}} / {{max}}
            </ui-text>
            <ui-separator
                v-if="max && $slots.append"
                distance="0"
                full
            />
            <ui-text
                v-if="$slots.append"
                class="input_container_prepend input_container_prepend--append"
                color="lightGray900"
                type="2b-medium"
                @click="emit('appendClick', { event: $event, input })"
            >
                <slot name="append"/>
            </ui-text>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import UiText from '~/components/ui/text/UiText.vue';
import UiSeparator from '~/components/ui/data/UiSeparator.vue';

const props = defineProps({
    inputAttrs: {
        type: Object as PropType<Record<string, any>>,
        default: () => {},
    },
    inputType: {
        type: String,
        default: 'text',
    },
    width: {
        type: String,
        default: '100%',
    },
    height: {
        type: String,
    },
    placeholder: {
        type: String,
    },
    max: {
        type: Number,
    },
    error: {
        type: Boolean,
        default: false,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits({
    input(event: Event) {
        return true;
    },
    change(event: Event) {
        return true;
    },
    prependClick(settings: { event: Event; input: HTMLInputElement | null }) {
        return true;
    },
    appendClick(settings: { event: Event; input: HTMLInputElement | null }) {
        return true;
    },
});

defineSlots<{
    default?: () => any;
    prepend?: () => any;
    append?: () => any;
    htmlContent?: () => any;
}>();

const focused = defineModel('focused', { type: Boolean });
const model = defineModel({ type: String as PropType<null | string>, default: null });
const input = useTemplateRef('input');

watch(model, val => {
    if (props.max && val && val.length > props.max) model.value = val.slice(0, props.max);
});
</script>

<style scoped lang="scss">
.input {
    width: v-bind(width);

    &_label {
        user-select: none;
        margin-bottom: 12px;
    }

    &_container {
        position: relative;

        display: flex;

        width: 100%;
        height: var(--input-height, 40px);
        border: 1px solid $strokeDefault;
        border-radius: 4px;

        background: $darkGray900;

        transition: 0.3s;

        @include boxShadowActiveProp(transparent);

        @include hover {
            &:hover {
                border-color: $darkGray100;
            }
        }

        &_prepend, &_counter {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
        }

        &_prepend {
            padding: 0 12px;

            &:first-child {
                background: $darkGray800;
            }

            &--append {
                cursor: pointer;
            }

            :deep(.select) {
                width: calc(100% + 24px);
                margin: 0 -12px;

                .separator {
                    display: none;
                }

                .input_container {
                    border: 0;
                    background: transparent;
                }
            }
        }

        &_counter {
            padding: 0 8px;
            white-space: nowrap;
        }
    }

    &--focused > .input_container {
        border-color: $darkGray100;
        @include boxShadowActiveProp;
    }

    &--error .input_container {
        border-color: $red500;
    }

    &--disabled .input_container {
        pointer-events: none;
        opacity: 0.5;
    }

    &__input {
        display: flex;
        gap: 12px;
        align-items: center;

        width: 100%;
        padding: 0 8px;

        &_input {
            width: 100%;
            height: 100%;
            border: none;

            font-family: $defaultFont;
            font-size: 14px;
            font-weight: 500;
            line-height: 130%;
            color: $typographyPrimary;

            appearance: none;
            background: none;
            outline: none;
            box-shadow: none;

            &::-webkit-outer-spin-button,
            &::-webkit-inner-spin-button {
                margin: 0;
                appearance: none;
            }

            &::placeholder {
                color: $whiteAlpha36;
                opacity: 1;
            }

            &:is(div) {
                position: relative;
                z-index: 1;

                + input {
                    position: absolute;
                    inset: 0;

                    width: 100%;
                    height: 100%;

                    opacity: 0;
                }
            }

            &:is(input) {
                appearance: textfield;
            }

            @include mobileSafariOnly {
                font-size: 16px;
            }
        }
    }
}
</style>
