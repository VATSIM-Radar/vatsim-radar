<template>
    <div class="settings __info-sections">
        <div
            v-if="store.mapPresetsFetched && !store.mapPresets?.length"
            class="settings_edit_warning"
        >
            Settings are <strong>not</strong> automatically saved to database.
        </div>

        <ui-tabs
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

        <quick-settings-layers v-if="tab === 'layers'"/>
        <quick-settings-visibility v-else-if="tab === 'visibility'"/>
        <quick-settings-colors v-else-if="tab === 'colors'"/>
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
import UiTabs from '~/components/ui/data/UiTabs.vue';
import QuickSettingsVisibility from '~/components/map/settings/quick-settings/QuickSettingsVisibility.vue';
import QuickSettingsLayers from '~/components/map/settings/quick-settings/QuickSettingsLayers.vue';
import QuickSettingsColors from '~/components/map/settings/quick-settings/QuickSettingsColors.vue';
import type { UserMapSettings } from '~/utils/backend/handlers/map-settings';
import { useStore } from '~/store';
import { saveMapSettings } from '~/composables/settings';
import { MAX_MAP_PRESETS } from '~/utils/shared';
import MapFiltersPresets from '~/components/map/settings/filters/MapFiltersPresets.vue';
import { sendUserPreset } from '~/composables/fetchers';

const store = useStore();

const tab = ref('layers');

const createMapPreset = async (name: string, json: UserMapSettings) => {
    await saveMapSettings(await sendUserPreset(name, json, 'settings/map', () => createMapPreset(name, json)));
    await refresh();
};

const { refresh } = useLazyAsyncData('map-presets', async () => {
    await store.fetchMapPresets();
    return true;
});
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
