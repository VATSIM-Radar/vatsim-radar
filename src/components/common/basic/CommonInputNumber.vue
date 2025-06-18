<template>
    <div
        class="input"
        :class="{ 'input--focused': focused }"
    >
        <div
            v-if="$slots.default"
            class="input_label"
        >
            <slot/>
        </div>
        <div class="input_container">
            <label class="input__input">
                <div
                    v-if="$slots.icon"
                    class="input__input_icon"
                >
                    <slot name="icon"/>
                </div>
                <input
                    v-model="inputValue"
                    :placeholder="placeholder"
                    type="number"
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
    height: {
        type: String,
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

defineSlots<{ default?: () => string; icon?: () => any }>();

const focused = defineModel('focused', { type: Boolean });
const model = defineModel({ type: Number as PropType<null | number>, default: null });

const inputValue = computed({
    get: () => model.value === null ? '' : String(model.value),
    set: (value: string) => {
        model.value = value === '' ? null : Number(value);
    },
});
</script>

<style scoped lang="scss">
.input {
    width: 100%;

    &_label {
        margin-bottom: 8px;
        font-size: 13px;
        font-weight: 600;
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
