<template>
    <div class="settings __info-sections">
        <div
            v-if="store.mapPresets && !store.mapPresets?.length"
            class="settings_edit_warning"
        >
            Settings are <strong>not</strong> automatically saved to database.
        </div>

        <common-tabs
            v-model="tab"
            class="settings_tabs"
            mobile-vertical
            :tabs="{
                layers: {
                    title: 'General',
                },
                visibility: {
                    title: 'Visibility',
                },
                colors: {
                    title: 'Colors',
                },
                management: {
                    title: 'Manage',
                },
            }"
        />

        <map-settings-layers v-if="tab === 'layers'"/>
        <map-settings-visibility v-else-if="tab === 'visibility'"/>
        <map-settings-colors v-else-if="tab === 'colors'"/>
        <map-filters-presets
            v-else-if="store.mapPresets && tab === 'management'"
            endpoint-suffix="settings/map"
            :max-presets="MAX_MAP_PRESETS"
            :presets="store.mapPresets"
            :refresh
            :selected-preset="store.mapSettings"
            type="settings"
            @create="createMapPreset"
            @reset="resetUserMapSettings"
            @save="saveMapSettings"
        />
    </div>
</template>

<script setup lang="ts">
import CommonTabs from '~/components/common/basic/CommonTabs.vue';
import MapSettingsVisibility from '~/components/map/filters/settings/MapSettingsVisibility.vue';
import MapSettingsLayers from '~/components/map/filters/settings/MapSettingsLayers.vue';
import MapSettingsColors from '~/components/map/filters/settings/MapSettingsColors.vue';
import type { UserMapSettings } from '~/utils/backend/handlers/map-settings';
import { useStore } from '~/store';
import { saveMapSettings } from '~/composables/settings';
import { MAX_MAP_PRESETS } from '~/utils/shared';
import MapFiltersPresets from '~/components/map/filters/MapFiltersPresets.vue';
import { sendUserPreset } from '~/composables/fetchers';

defineProps({
    refresh: {
        type: Function,
        required: true,
    },
});

const store = useStore();

const tab = ref('layers');

const createMapPreset = async (name: string, json: UserMapSettings) => {
    await saveMapSettings(await sendUserPreset(name, json, 'settings/map', () => createMapPreset(name, json)));
};
</script>

<style scoped lang="scss">
.settings {
    &, & .__info-sections {
        gap: 16px !important;
    }

    :deep(.title) {
        margin-bottom: 0;
    }

    &_edit {
        display: flex;
        flex-direction: column;
        gap: 8px;

        &_warning {
            font-size: 14px;
            color: $error400;
        }
    }

    &_tabs {
        position: sticky;
        z-index: 10;
        top: 48px - 16px;

        margin-bottom: -16px;
        padding-bottom: 16px;

        background: $darkgray1000;
    }
}
</style>
