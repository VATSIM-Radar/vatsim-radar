<template>
    <ui-radio-group
        class="settngs-radio-group"
        :items="item.items"
        :model-value="value"
        @update:modelValue="handleSettingChange(item, $event as SelectItemValue)"
    />
</template>

<script setup lang="ts">
import { handleSettingChange } from '~/composables/settings/v2/utils';
import UiRadioGroup from '~/components/ui/inputs/UiRadioGroup.vue';
import type { SelectItemValue } from '~/composables/settings/v2/types';

const props = defineProps({
    item: {
        type: Object as PropType<SettingsItemRadio>,
        required: true,
    },
});

const value = computed(() => toValue(props.item.value));
</script>

<style lang="scss" scoped>
.settngs-radio-group {
    align-items: flex-start;
    justify-content: flex-start;
}
</style>
