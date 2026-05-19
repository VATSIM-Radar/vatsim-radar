<template>
    <ui-input-text
        :max="item.max"
        :model-value="value"
        :placeholder="item.placeholder"
        @change="handleSettingChange(item, localValue)"
        @update:modelValue="localValue = $event"
    />
</template>

<script setup lang="ts">
import { handleSettingChange } from '~/composables/settings/v2/utils';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import type { SettingsItemInputText } from '~/composables/settings/v2/types';

const props = defineProps({
    item: {
        type: Object as PropType<SettingsItemInputText>,
        required: true,
    },
});

const value = computed(() => toValue(props.item.value).value);

// eslint-disable-next-line vue/no-ref-object-reactivity-loss
const localValue = ref<Parameters<SettingsItemInputText['onChange']>[0]>(value.value);

watch(value, () => {
    localValue.value = value.value;
});
</script>
