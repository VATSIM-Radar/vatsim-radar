<template>
    <div class="__info-sections">
        <ui-block-title>
            VATGlasses
        </ui-block-title>

        <div class="__vertical-group-16">
            <ui-columns-display align-items="flex-start">
                <template #col1>
                    <ui-setting-item :item="settingsItems.layers.vatglassesAutoEnable"/>
                </template>
                <template #col2>
                    <ui-setting-item :item="settingsItems.layers.vatglassesActive"/>
                </template>
            </ui-columns-display>

            <div class="__horizontal-group-4">
                <ui-setting-item :item="settingsItems.layers.vatglassesCombined"/>

                <div
                    v-if="dataStore.vatglassesCombiningInProgress.value"
                    class="loading-spinner"
                >
                    <div class="spinner"/>
                </div>
            </div>
            <ui-setting-item :item="settingsItems.layers.vatglassesAutoLevel"/>
        </div>
        <quick-settings-vat-glasses-level/>

        <ui-block-title>
            Data
        </ui-block-title>
        <ui-setting-item :item="settingsItems.layers.bookingsEnabled"/>
        <ui-setting-item :item="settingsItems.layers.bookingsHours"/>
        <ui-setting-item :item="settingsItems.layers.eventsEnabled"/>
        <ui-setting-item :item="settingsItems.layers.eventsHours"/>

        <ui-block-title>
            Privacy
        </ui-block-title>
        <ui-setting-item :item="settingsItems.layers.visibility.atcInfo"/>
        <ui-setting-item :item="settingsItems.layers.visibility.pilotsInfo"/>
    </div>
</template>

<script setup lang="ts">
import UiBlockTitle from '~/components/ui/text/UiBlockTitle.vue';
import QuickSettingsVatGlassesLevel from '~/components/map/settings/quick-settings/QuickSettingsVatGlassesLevel.vue';
import UiColumnsDisplay from '~/components/ui/data/UiColumnsDisplay.vue';
import UiSettingItem from '~/components/ui/data/UiSettingItem.vue';
import { getSettingsItems } from '~/composables/settings/v2/sections';

const dataStore = useDataStore();

const settingsItems = getSettingsItems().value;
</script>

<style scoped lang="scss">
.loading-spinner {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-left: 5px;
}

.spinner {
    width: 20px;
    height: 20px;
    // border: 4px solid rgba(0, 0, 0, 0.1);
    border: 4px solid $darkGray500;
    // border-left-color: #000;
    border-left-color: $lightGray600;
    border-radius: 50%;

    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
