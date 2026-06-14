<template>
    <settings-component-select
        :item
        multiple
    />
</template>

<script setup lang="ts">
import SettingsComponentSelect from '~/components/features/settings/v2/components/SettingsComponentSelect.vue';

defineProps({
    item: {
        type: Object as PropType<SettingsItemMultiSelect>,
        required: true,
    },
});
</script>
