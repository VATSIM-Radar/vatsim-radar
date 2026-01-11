<template>
    <ui-input-text
        v-model="inputValue"
        v-model:focused="focused"
        :height
        :input-attrs
        input-type="number"
        :placeholder
        @change="$emit('change', $event)"
        @input="$emit('input', $event)"
    >
        <slot/>
        <template
            v-if="$slots.icon"
            #icon
        >
            <slot name="icon"/>
        </template>
    </ui-input-text>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';

defineProps({
    inputAttrs: {
        type: Object as PropType<Record<string, any>>,
        default: () => {},
    },
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
