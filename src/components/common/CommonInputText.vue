<template>
    <div class="input" :class="{'input--focused': focused}">
        <div class="input_container">
            <div class="input__input">
                <input
                    type="text"
                    :placeholder
                    v-bind="inputAttrs"
                    v-model="model"
                    @input="$emit('input', $event)"
                    @change="$emit('change', $event)"
                    @focus="focused = true"
                    @blur="focused = false"
                    @focusout="focused = false"
                >
            </div>
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

const focused = defineModel('focused', { type: Boolean });
const model = defineModel({ type: String, default: null });
</script>

<style scoped lang="scss">
.input {
    border-radius: 8px;
    padding: 0 16px;
    border: 2px solid transparent;
    transition: 0.3s;
    gap: 16px;
    background: $neutral900;
    width: 100%;
    display: flex;
    align-items: center;

    @include hover {
        &:hover {
            border-color: $neutral800;
        }
    }

    &--focused {
        border-color: $primary500
    }

    &__input {
        input {
            appearance: none;
            outline: none;
            box-shadow: none;
            background: none;
            color:$neutral150;
            font-size: 13px;
            font-weight: 600;
            width: 100%;
            padding: 12px 0;
            border: none;

            &::placeholder {
                opacity: 1;
                color: varToRgba('neutral150', 0.5)
            }
        }
    }
}
</style>
