<template>
    <ui-input-number
        :input-attrs="{
            max: item.max,
            min: item.min,
        }"
        :model-value="value"
        :placeholder="item.placeholder"
        @change="handleSettingChange(item, localValue)"
        @update:modelValue="localValue = $event"
        :allowed-after-dot="item.allowedAfterDot"
    />
</template>

<script setup lang="ts">
import { handleSettingChange } from '~/composables/settings/v2/utils';
import type { SettingsItemInputNumber } from '~/composables/settings/v2/types';
import UiInputNumber from '~/components/ui/inputs/UiInputNumber.vue';

const props = defineProps({
    item: {
        type: Object as PropType<SettingsItemInputNumber>,
        required: true,
    },
});

const value = computed(() => toValue(props.item.value).value);

// eslint-disable-next-line vue/no-ref-object-reactivity-loss
const localValue = ref<Parameters<SettingsItemInputNumber['onChange']>[0]>(value.value);

watch(value, () => {
    localValue.value = value.value;
});
</script>
