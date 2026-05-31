<template>
    <ui-setting-display
        class="settings-item"
        :class="[`settings-item--type-${ item.type }`, { 'settings-item--align-left': alignLeft, 'settings-item--vertical': vertical }]"
        :disabled="toValue(item.disabled)"
    >
        <template
            v-if="'title' in item && item.title"
            #title
        >
            {{item.title}}
        </template>
        <template
            v-if="'hint' in item"
            #hint
        >
            {{item.hint}}
        </template>
        <template
            v-if="('description' in item || 'value' in item) && (item.description || (!hideReset && 'value' in item && 'isSet' in item.value.value))"
            #description
        >
            {{item.description}}

            <ui-button
                v-if="'value' in item && 'isSet' in item.value.value && !hideReset"
                class="settings-item__reset"
                :class="{ 'settings-item__reset--hidden': !item.value.value.isSet }"
                hover-color="red600"
                link-color="red500"
                type="link"
                @click="item.onChange(undefined as never)"
            >
                <ui-text type="3b">
                    Reset
                </ui-text>
            </ui-button>
        </template>
        <template
            v-if="item.fullPath"
            #leftAppend
        >
            <ui-button
                v-if="item.fullPath"
                class="settings-item_left_path"
                link-color="blue500"
                :to="item.fullPath"
                type="link"
                @click="emit('jumped')"
            >
                Jump to setting
            </ui-button>
        </template>
        <div class="__vertical-group-16">
            <settings-component data-type="component" :item="item"/>
            <component :is="item.appendComponent" v-if="'appendComponent' in item"/>
        </div>
    </ui-setting-display>
</template>

<script setup lang="ts">
import SettingsComponent from '~/components/features/settings/v2/components/SettingsComponent.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiText from '~/components/ui/text/UiText.vue';
import UiSettingDisplay from '~/components/ui/data/UiSettingDisplay.vue';
import type { SettingsItem } from '~/composables/settings/v2/types';

defineProps({
    item: {
        type: Object as PropType<SettingsItem>,
        required: true,
    },
    alignLeft: {
        type: Boolean,
        default: false,
    },
    vertical: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits({
    jumped() {
        return true;
    },
});

const route = useRoute();

const hideReset = computed(() => {
    return !route.path?.startsWith('/settings');
});
</script>

<style scoped lang="scss">
.settings-item {
    &--align-left {
        justify-content: flex-start !important;

        > :deep(.setting_component) {
            flex-grow: 0;
        }
    }

    &__reset {
        transition: 0.3s;

        &--hidden {
            visibility: hidden;
            opacity: 0;
        }
    }

    &--type-select {
        .__vertical-group-16 {
            width: 100%;

            :deep(>.select) {
                width: 100%;
            }
        }
    }

    &--vertical {
        display: flex;
        flex-direction: column;
        gap: 8px !important;
        align-items: stretch !important;

        :deep(.setting_component) {
            align-items: stretch !important;
        }
    }
}
</style>
