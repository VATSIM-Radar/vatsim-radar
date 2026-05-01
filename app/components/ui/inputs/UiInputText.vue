<template>
    <div
        class="input"
        :class="{ 'input--focused': focused }"
    >
        <ui-text
            v-if="$slots.default"
            class="input_label"
            type="2b-medium"
        >
            <slot/>
        </ui-text>
        <div class="input_container">
            <label class="input__input">
                <div
                    v-if="$slots.icon"
                    class="input__input_icon"
                >
                    <slot name="icon"/>
                </div>
                <input
                    v-bind="inputAttrs"
                    v-model="model"
                    :placeholder
                    :type="inputType"
                    @blur="focused = false"
                    @change="$emit('change', $event)"
                    @focus="focused = true"
                    @focusout="focused = false"
                    @input="$emit('input', $event)"
                >
            </label>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import UiText from '~/components/ui/text/UiText.vue';

defineProps({
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
});

defineEmits({
    input(event: Event) {
        return true;
    },
    change(event: Event) {
        return true;
    },
});

defineSlots<{
    default?: () => any;
    icon?: () => any;
    prepend?: () => any;
    append?: () => any;
}>();

const focused = defineModel('focused', { type: Boolean });
const model = defineModel({ type: String as PropType<null | string>, default: null });
</script>

<style scoped lang="scss">
.input {
    width: 100%;

    &_label {
        margin-bottom: 12px;
    }

    &_container {
        display: flex;
        gap: 16px;
        align-items: center;

        width: 100%;
        height: v-bind(height);
        padding: 0 16px;
        border: 2px solid transparent;
        border-radius: 8px;

        background: $darkgray900;

        transition: 0.3s;

        @include hover {
            &:hover {
                border-color: $darkgray800;
            }
        }
    }

    &--focused .input_container {
        border-color: $primary500
    }

    &__input {
        display: flex;
        gap: 12px;
        align-items: center;
        width: 100%;

        input {
            width: 100%;
            padding: 12px 0;
            border: none;

            font-family: $defaultFont;
            font-size: 13px;
            font-weight: 600;
            color:$lightgray150;

            appearance: none;
            background: none;
            outline: none;
            box-shadow: none;

            &::placeholder {
                color: varToRgba('lightgray150', 0.5);
                opacity: 1
            }

            @include mobileSafariOnly {
                font-size: 16px;
            }
        }
    }
}
</style>
