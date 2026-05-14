import { defineStore } from 'pinia';
import type { UserSettingsV2Partial } from '~/utils/settings/types';
import { onSettingChange } from '~/composables/settings/v2/utils';
import type { UserMapPreset } from '~/utils/server/handlers/map-settings';

export const useSettingsStore = defineStore('settings', {
    state: () => ({
        settings: {} as UserSettingsV2Partial,
        settingsPresets: [] as UserMapPreset[],
        activeSettingsPreset: null as number | null,
        autoSave: true,
    }),
    actions: {
        save(settings: UserSettingsV2Partial) {
            if (this.autoSave && !this.activeSettingsPreset && this.settingsPresets.length) {
                this.activeSettingsPreset = this.settingsPresets[0].id;
            }

            this.settings = customDefu(settings, JSON.parse(localStorage.getItem('settings') ?? '{}'));
            onSettingChange();
        },
    },
});
