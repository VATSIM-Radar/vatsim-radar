<template>
    <ui-select
        :items="item.items"
        :model-value="value"
        :multiple
        :placeholder="item.placeholder"
        @update:modelValue="handleSettingChange(item, $event)"
    />
</template>

<script setup lang="ts">
import { handleSettingChange } from '~/composables/settings/v2/utils';
import UiSelect from '~/components/ui/inputs/UiSelect.vue';

const props = defineProps({
    item: {
        type: Object as PropType<SettingsItemSelect | SettingsItemMultiSelect>,
        required: true,
    },
    multiple: {
        type: Boolean,
        default: false,
    },
});

const value = computed(() => toValue(props.item.value));
</script>
