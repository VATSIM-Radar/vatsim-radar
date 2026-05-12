<template>
    <ui-toggle
        align-left
        :model-value="value"
        @update:modelValue="handleSettingChange(item, $event)"
    />
</template>

<script setup lang="ts">
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import { handleSettingChange } from '~/composables/settings/v2/utils';

const props = defineProps({
    item: {
        type: Object as PropType<SettingsItemToggle>,
        required: true,
    },
});

const value = computed(() => toValue(props.item.value));
</script>
