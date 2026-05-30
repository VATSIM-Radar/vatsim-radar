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
        <template v-if="$slots.default" #default>
            <slot/>
        </template>
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

const props = defineProps({
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
    allowedAfterDot: {
        type: Number,
        default: 0,
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
    set: (_value: string) => {
        console.log(_value);
        let value = _value === '' ? null : Number(_value);
        if (typeof value === 'number') {
            if (props.inputAttrs?.min && value < props.inputAttrs.min) value = props.inputAttrs.min;
            if (props.inputAttrs?.max && value! > props.inputAttrs.max) value = props.inputAttrs.max;
            if (props.allowedAfterDot) value = Number(value!.toFixed(props.allowedAfterDot));
        }

        model.value = value;
    },
});
</script>
