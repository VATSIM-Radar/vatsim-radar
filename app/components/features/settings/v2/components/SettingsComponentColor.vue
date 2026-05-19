<template>
    <ui-input-color
        :color-only="item.mode === 'color'"
        :default-color="item.defaultColor"
        :model-value="value"
        setting="test"
        :transparency-only="item.mode === 'transparency'"
        @update:modelValue="handleSettingChange(item, $event)"
    />
</template>

<script setup lang="ts">
import { handleSettingChange } from '~/composables/settings/v2/utils';
import UiInputColor from '~/components/ui/inputs/UiInputColor.vue';

const props = defineProps({
    item: {
        type: Object as PropType<SettingsItemInputColor>,
        required: true,
    },
});

const value = computed(() => toValue(props.item.value).value);
</script>
