<template>
    <div class="radio-group" :class="{'radio-group--two-cols': twoCols}">
        <common-radio
            v-for="item in items"
            :key="item.value?.toString()"
            :model-value="model === item.value"
            @update:modelValue="model = item.value"
            v-bind="item"
            :name="id"
        >
            <template v-if="item.key && $slots[item.key]">
                <slot :name="item.key" :item="item"/>
            </template>
            <template #hint v-if="item.key && $slots[`${item.key}Hint`]">
                <slot :name="`${item.key}Hint`" :item="item"/>
            </template>
        </common-radio>
    </div>
</template>

<script setup lang="ts">
import type { RadioItem } from '~/components/common/CommonRadio.vue';
import type { PropType } from 'vue';

export interface RadioItemGroup<T extends string | number | null = string | number | null> extends RadioItem<T> {
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
