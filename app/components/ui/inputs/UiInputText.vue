<template>
    <div
        class="input"
        :class="{ 'input--focused': focused, 'input--error': error, 'input--disabled': disabled }"
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
            >
                <input
                    v-bind="inputAttrs"
                    ref="input"
                    v-model="model"
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
    width: 100%;

    &_label {
        margin-bottom: 12px;
    }

    &_container {
        display: flex;

        width: 100%;
        height: v-bind(height);
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
        }

        &_counter {
            padding: 0 8px;
            white-space: nowrap;
        }
    }

    &--focused .input_container {
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

        input {
            width: 100%;
            padding: 12px 0;
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

            &::placeholder {
                color: $whiteAlpha36;
                opacity: 1;
            }

            @include mobileSafariOnly {
                font-size: 16px;
            }
        }
    }
}
</style>
