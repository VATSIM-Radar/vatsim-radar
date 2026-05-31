<template>
    <div class="management __vertical-group-16">
        <ui-setting-item :item="settingsItems.account.autoSave"/>
        <ui-setting-display v-if="settingsStore.settingsPresets.length < MAX_SETTINGS_PRESETS">
            <template #title>
                Import Preset
            </template>
            <ui-button
                size="S"
                type="secondary"
                @click="presetImport?.click()"
            >
                Import from File
            </ui-button>
            <input
                v-show="false"
                ref="presetImport"
                accept="application/json"
                type="file"
                @input="importPreset()"
            >
        </ui-setting-display>
        <ui-setting-display>
            <template #title>
                Presets Management
            </template>
            <map-filters-presets
                endpoint-suffix="settings/v2"
                :max-presets="MAX_SETTINGS_PRESETS"
                :presets="settingsStore.settingsPresets"
                :refresh
                :selected-preset="settingsStore.settings"
                type="settings"
                @create="createSettingsPreset"
                @reset="settingsStore.autoSave ? undefined : [settingsStore.activeSettingsPreset = null, settingsStore.save({}, { overwrite: true })]"
                @save="(event, id) => [settingsStore.setPreset(id), settingsStore.save(event, { overwrite: true, autoSave: false })]"
            />
        </ui-setting-display>
        <ui-button type="destructive" @click="resetActive = true">
            Reset All Settings
        </ui-button>
        <popup-fullscreen v-model="resetActive">
            <template #title>
                Map Settings Reset
            </template>

            You are about to reset your local settings to defaults. This action is permanent.<br><br>

            Also, it will set "Auto Update" to "off".

            <template #actions>
                <ui-button
                    type="secondary"
                    @click="[settingsStore.setAutoSave(false), settingsStore.save({}, { overwrite: true, autoSave: false }), resetActive = false]"
                >
                    Confirm reset
                </ui-button>
                <ui-button
                    type="secondary"
                    @click="backupSettings()"
                >
                    Backup data
                </ui-button>
                <ui-button
                    type="primary"
                    @click="resetActive = false"
                >
                    Cancel that
                </ui-button>
            </template>
        </popup-fullscreen>
    </div>
</template>

<script setup lang="ts">
import MapFiltersPresets from '~/components/map/settings/filters/MapFiltersPresets.vue';
import { MAX_SETTINGS_PRESETS } from '~/utils/shared';
import { sendUserPreset } from '~/composables/fetchers';
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import UiSettingDisplay from '~/components/ui/data/UiSettingDisplay.vue';
import type { UserSettingsV2Partial } from '~/utils/settings/types';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import { backupSettings } from '~/composables/settings';
import PopupFullscreen from '~/components/popups/PopupFullscreen.vue';
import { useRadarError } from '~/composables/errors';
import { useSettingsStore } from '~/store/settings';
import UiSettingItem from '~/components/ui/data/UiSettingItem.vue';

const store = useStore();
const settingsStore = useSettingsStore();
const resetActive = ref(false);
const presetImport = useTemplateRef('presetImport');
const settingsItems = getSettingsItems().value;

const createSettingsPreset = async (name: string, json: UserSettingsV2Partial) => {
    // Created manually
    if (!store.presetImport.preset) json.version = '2.0';
    const preset = await sendUserPreset(name, json, 'settings/v2', () => createSettingsPreset(name, json));
    await refresh();
    settingsStore.activeSettingsPreset = settingsStore.settingsPresets.find(x => x.name === name)?.id ?? null;
    await settingsStore.save(preset, { overwrite: true });
};

const createImportedPreset = async () => {
    await createSettingsPreset(store.presetImport.name!, store.presetImport.preset as UserSettingsV2Partial);
    store.presetImport.preset = null;
    refresh();
};

const { refresh } = useLazyAsyncData('map-presets', async () => {
    await settingsStore.fetchPresets();
    return true;
});

const importPreset = async () => {
    const file = presetImport.value?.files?.[0];
    if (!file) return;

    try {
        await new Promise<void>((resolve, reject) => {
            const reader = new FileReader();

            reader.addEventListener('load', async () => {
                try {
                    await store.initPresetImport({
                        file: reader.result as string,
                        prefix: 'settings/v2',
                        save: createImportedPreset,
                    });
                    resolve();
                }
                catch (e) {
                    reject(e);
                }
            });

            reader.addEventListener('error', e => {
                reject(e);
            });

            reader.readAsText(file);
        });
    }
    catch (e) {
        useRadarError(e);
    }
};
</script>
