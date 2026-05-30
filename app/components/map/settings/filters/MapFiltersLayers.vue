<template>
    <div class="layers __info-sections">
        <ui-columns-display align-items="flex-start">
            <template #col1>
                <ui-setting-item :item="getSettingByItem(settingsItems.layers.sigmets.showOnMap, { title: 'SIGMETs on map', description: undefined })"/>
            </template>
            <template #col2>
                <ui-setting-item :item="settingsItems.layers.natTrakEnabled"/>
            </template>
        </ui-columns-display>

        <ui-setting-item v-if="natTrakEnabled" :item="settingsItems.layers.natTrakConcorde"/>

        <ui-setting-item v-if="natTrakEnabled" :item="settingsItems.layers.natTrakDirection"/>

        <ui-setting-item :item="settingsItems.layers.terminator"/>

        <ui-setting-item :item="settingsItems.layers.layerLabels"/>

        <ui-notification
            remember-message="LAYERS_TUTORIAL"
            type="info"
        >
            Light and Detailed have worse performance than other layers
        </ui-notification>

        <ui-setting-item :item="getSettingByItem(settingsItems.layers.layer, { title: '', description: undefined })"/>

        <template v-if="!isMobile">
            <ui-setting-item :item="settingsItems.layers.relativeIndicator"/>
            <ui-setting-item :item="settingsItems.layers.distanceEnabled"/>
            <ui-setting-item :item="settingsItems.layers.distanceUnits"/>
            <ui-setting-item :item="getSettingByItem(settingsItems.layers.distanceInteraction, { description: undefined })"/>
        </template>

        <ui-block-title remove-margin>
            Navigraph Settings
        </ui-block-title>

        <ui-setting-item :item="getSettingByItem(settingsItems.layers.navigraph.enabled, { title: 'Navigraph Layers', description: undefined })"/>

        <ui-setting-item :item="getSettingByItem(settingsItems.layers.navigraph.route.enabled, { title: 'Route Parsing', description: undefined })"/>

        <ui-setting-item :item="settingsItems.layers.navigraph.layers.ifrAuto"/>

        <ui-setting-item :item="settingsItems.layers.navigraph.layers.ifrMode"/>
    </div>
</template>

<script setup lang="ts">
import UiNotification from '~/components/ui/data/UiNotification.vue';
import UiBlockTitle from '~/components/ui/text/UiBlockTitle.vue';
import UiColumnsDisplay from '~/components/ui/data/UiColumnsDisplay.vue';
import { getSettingByItem, getSettingsItems } from '~/composables/settings/v2/sections';
import UiSettingItem from '~/components/ui/data/UiSettingItem.vue';

const isMobile = useIsMobile();
const settingsItems = getSettingsItems().value;
const natTrakEnabled = useSettingValueFromFunc('map.layers.natTrak.enabled');
</script>
