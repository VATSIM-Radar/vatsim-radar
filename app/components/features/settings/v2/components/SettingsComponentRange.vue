<template>
    <ui-range
        :max="item.max"
        :max-label="item.maxLabel"
        :min="item.min"
        :min-label="item.minLabel"
        :model-value="value"
        :show-input="item.showInput"
        :show-labels="item.showLabels"
        :step="item.step"
        @update:modelValue="handleSettingChange(item, $event)"
    >
        <template v-if="item.label" #default>
            {{item.label}}
        </template>
    </ui-range>
</template>

<script setup lang="ts">
import { handleSettingChange } from '~/composables/settings/v2/utils';
import type { SettingsItemRange } from '~/composables/settings/v2/types';
import UiRange from '~/components/ui/inputs/UiRange.vue';

const props = defineProps({
    item: {
        type: Object as PropType<SettingsItemRange>,
        required: true,
    },
});

const value = computed(() => toValue(props.item.value).value);
</script>
