<template>
    <div
        class="input"
        :class="{ 'input--focused': focused }"
    >
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

defineProps({
    inputAttrs: {
        type: Object as PropType<Record<string, any>>,
        default: () => {},
    },
    inputType: {
        type: String,
        default: 'text',
    },
    placeholder: {
        type: String,
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

defineSlots<{ icon: () => any }>();

const focused = defineModel('focused', { type: Boolean });
const model = defineModel({ type: String, default: null });
</script>

<style scoped lang="scss">
.input {
    display: flex;
    gap: 16px;
    align-items: center;

    width: 100%;
    padding: 0 16px;

    background: $darkgray900;
    border: 2px solid transparent;
    border-radius: 8px;

    transition: 0.3s;

    @include hover {
        &:hover {
            border-color: $darkgray800;
        }
    }

    &--focused {
        border-color: $primary500
    }

    &_container {
        width: 100%;
    }

    &__input {
        display: flex;
        gap: 12px;
        align-items: center;

        input {
            width: 100%;
            padding: 12px 0;

            font-family: $defaultFont;
            font-size: 13px;
            font-weight: 600;
            color:$lightgray150;

            appearance: none;
            background: none;
            border: none;
            outline: none;
            box-shadow: none;

            &::placeholder {
                color: varToRgba('lightgray150', 0.5);
                opacity: 1
            }
        }
    }
}
</style>
