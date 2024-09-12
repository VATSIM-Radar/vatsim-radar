<template>
    <div class="settings __info-sections">
        <common-tabs
            v-model="tab"
            :tabs="{
                layers: {
                    title: 'General',
                },
                visibility: {
                    title: 'Visibility',
                },
                colors: {
                    title: 'Colors',
                    disabled: true,
                },
            }"
        />

        <map-settings-layers v-if="tab === 'layers'"/>
        <map-settings-visibility v-else-if="tab === 'visibility'"/>
    </div>
</template>

<script setup lang="ts">
import CommonTabs from '~/components/common/basic/CommonTabs.vue';
import MapSettingsVisibility from '~/components/map/filters/settings/MapSettingsVisibility.vue';
import MapSettingsLayers from '~/components/map/filters/settings/MapSettingsLayers.vue';

const tab = ref('layers');
</script>

<style scoped lang="scss">
.settings {
    &, & .__info-sections {
        gap: 16px !important;
    }

    :deep(.title) {
        margin-bottom: 0;
    }
}
</style>
