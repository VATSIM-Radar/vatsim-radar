<template>
    <div class="management">
        <map-filters-presets
            endpoint-suffix="settings/map"
            :max-presets="MAX_SETTINGS_PRESETS"
            :presets="settingsStore.settingsPresets"
            :refresh
            :selected-preset="settingsStore.settings"
            type="settings"
        />
    </div>
</template>

<script setup lang="ts">
import MapFiltersPresets from '~/components/map/settings/filters/MapFiltersPresets.vue';
import { MAX_MAP_PRESETS, MAX_SETTINGS_PRESETS } from '~/utils/shared';
import { saveMapSettings } from '~/composables/settings';
import type { UserMapSettings } from '~/utils/server/handlers/map-settings';
import { sendUserPreset } from '~/composables/fetchers';

defineProps({});

const store = useStore();
const settingsStore = useSettingsStore();

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
.management {

}
</style>
