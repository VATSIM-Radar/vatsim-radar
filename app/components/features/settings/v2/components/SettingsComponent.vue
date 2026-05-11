<template>
    <component
        :is="getComponent"
        v-bind="getAttrs"
    />
</template>

<script setup lang="ts">
import SettingsComponentColor from './SettingsComponentColor.vue';
import SettingsComponentMultiSelect from './SettingsComponentMultiSelect.vue';
import SettingsComponentNumber from './SettingsComponentNumber.vue';
import SettingsComponentRadio from './SettingsComponentRadio.vue';
import SettingsComponentSelect from './SettingsComponentSelect.vue';
import SettingsComponentText from './SettingsComponentText.vue';
import SettingsComponentToggle from './SettingsComponentToggle.vue';

const props = defineProps({
    item: {
        type: Object as PropType<SettingsItem>,
        required: true,
    },
});

const getComponent = computed(() => {
    switch (props.item.type) {
        case 'component':
        case 'inline-component':
            return props.item.component;
        case 'toggle':
            return SettingsComponentToggle;
        case 'text':
            return SettingsComponentText;
        case 'number':
            return SettingsComponentNumber;
        case 'color':
            return SettingsComponentColor;
        case 'select':
            return SettingsComponentSelect;
        case 'multi-select':
            return SettingsComponentMultiSelect;
        case 'radio':
            return SettingsComponentRadio;
        default:
            return 'div';
    }
});

const getAttrs = computed(() => {
    switch (props.item.type) {
        case 'component':
        case 'inline-component':
            return {};
        default:
            return {
                item: props.item,
            };
    }
});
</script>


