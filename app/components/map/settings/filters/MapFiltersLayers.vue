<template>
    <div class="layers __info-sections">
        <ui-tabs v-model="tab" :tabs="{ layers: { title: 'Layers' }, navigraph: { title: 'Navigraph' } }"/>

        <template v-if="tab === 'layers'">
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

            <ui-setting-item :item="settingsItems.layers.relativeIndicator"/>
            <ui-setting-item :item="settingsItems.layers.distanceEnabled"/>
            <ui-setting-item :item="settingsItems.layers.distanceUnits"/>
            <ui-setting-item :item="getSettingByItem(settingsItems.layers.distanceInteraction, { description: undefined })"/>
        </template>
        <template v-else>
            <ui-columns-display align-items="flex-start">
                <template #col1>
                    <ui-setting-item :item="getSettingByItem(settingsItems.layers.navigraph.enabled, { title: 'Navigraph Layers', description: undefined })"/>
                    <ui-setting-item :item="settingsItems.layers.navigraph.layers.ifrAuto"/>
                </template>
                <template #col2>
                    <ui-setting-item :item="getSettingByItem(settingsItems.layers.navigraph.route.enabled, { title: 'Route Parsing', description: undefined })"/>
                </template>
            </ui-columns-display>

            <ui-setting-item :item="settingsItems.layers.navigraph.layers.ifrMode"/>
            <ui-columns-display align-items="flex-start">
                <template #col1>
                    <ui-setting-item :item="settingsItems.layers.navigraph.layers.airwaysEnabled"/>
                    <ui-setting-item :item="settingsItems.layers.navigraph.layers.ndb"/>
                    <ui-setting-item :item="settingsItems.layers.navigraph.layers.vordme"/>
                    <ui-setting-item :item="settingsItems.layers.navigraph.layers.controlledAirspace"/>
                </template>
                <template #col2>
                    <ui-setting-item :item="settingsItems.layers.navigraph.layers.waypoints"/>
                    <ui-setting-item :item="settingsItems.layers.navigraph.layers.terminalWaypoints"/>
                    <ui-setting-item :item="settingsItems.layers.navigraph.layers.holdings"/>
                    <ui-setting-item :item="settingsItems.layers.navigraph.layers.restrictedAirspace"/>
                </template>
            </ui-columns-display>
        </template>
    </div>
</template>

<script setup lang="ts">
import UiNotification from '~/components/ui/data/UiNotification.vue';
import UiBlockTitle from '~/components/ui/text/UiBlockTitle.vue';
import UiColumnsDisplay from '~/components/ui/data/UiColumnsDisplay.vue';
import { getSettingByItem, getSettingsItems } from '~/composables/settings/v2/sections';
import UiSettingItem from '~/components/ui/data/UiSettingItem.vue';
import UiTabs from '~/components/ui/data/UiTabs.vue';

const settingsItems = getSettingsItems().value;
const natTrakEnabled = useSettingValueFromFunc('map.layers.natTrak.enabled');
const tab = ref('layers');
</script>

<style lang="scss" scoped>
.layers {
    :deep(.tabs_list) {
        height: auto;
    }
}
</style>
