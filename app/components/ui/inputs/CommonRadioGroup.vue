<template>
    <div
        class="radio-group"
        :class="{ 'radio-group--two-cols': twoCols }"
    >
        <common-radio
            v-for="item in items"
            :key="item.value?.toString()"
            :hint-location="item.hintLocation"
            :model-value="model === item.value"
            v-bind="item"
            :name="id"
            @update:modelValue="model = item.value"
        >
            <template v-if="item.key && $slots[item.key]">
                <slot
                    :item="item"
                    :name="item.key"
                />
            </template>
            <template
                v-if="item.key && $slots[`${ item.key }Hint`]"
                #hint
            >
                <slot
                    :item="item"
                    :name="`${ item.key }Hint`"
                />
            </template>
        </common-radio>
    </div>
</template>

<script setup lang="ts">
import CommonRadio from '~/components/ui/inputs/CommonRadio.vue';
import type { RadioItem } from '~/components/ui/inputs/CommonRadio.vue';
import type { PropType } from 'vue';

export interface RadioItemGroup<T extends string | number | boolean | null = string | number | boolean | null> extends RadioItem<T> {
    key?: string;
}
defineProps({
    items: {
        type: Array as PropType<RadioItemGroup[]>,
        required: true,
    },
    twoCols: {
        type: Boolean,
        default: false,
    },
});

/* eslint vue/require-explicit-slots: 0 */

defineSlots<{ [key: string]: (props: { item: RadioItemGroup }) => any }>();

const id = useId();

const model = defineModel<RadioItem['value'] | undefined>({ default: undefined });
</script>

<style scoped lang="scss">
.radio-group {
    display: flex;
    flex-direction: column;
    gap: 8px;

    &--two-cols {
        display: grid;
        grid-template-columns: repeat(2, calc(50% - 8px));
    }
}
</style>
