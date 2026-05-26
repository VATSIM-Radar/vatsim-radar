import { defineStore } from 'pinia';
import type { UserSettingsV2Partial } from '~/utils/settings/types';
import { onSettingChange } from '~/composables/settings/v2/utils';
import type { UserMapPreset } from '~/utils/server/handlers/map-settings';

export const isSettingsAutoSave = globalComputed(() => useCookie<boolean>('is-settings-auto-save', {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'none',
    secure: true,
}));

export const useSettingsStore = defineStore('settings', {
    state: () => ({
        settings: {} as UserSettingsV2Partial,
        settingsPresets: [] as UserMapPreset[],
        activeSettingsPreset: null as number | null,
        autoSave: true,
    }),
    actions: {
        async fetchPresets() {
            if (!useStore().user) return;
            this.settingsPresets = await $fetch<UserMapPreset[]>('/api/user/settings/v2');
        },
        async save(settings: UserSettingsV2Partial, { overwrite, onSave, autoSave = true }: {
            overwrite?: boolean;
            onSave?: () => void;
            autoSave?: boolean;
        } = {}) {
            if (autoSave) {
                this.autoSave = isSettingsAutoSave().value.value ?? true;

                if (this.autoSave && !this.activeSettingsPreset && this.settingsPresets.length) {
                    this.activeSettingsPreset = this.settingsPresets[0].id;
                }
            }

            this.settings = overwrite ? settings : customDefu(settings, JSON.parse(localStorage.getItem('settings') ?? '{}'));
            onSave?.();
            await onSettingChange();
        },
        setAutoSave(val: boolean) {
            isSettingsAutoSave().value.value = val;
            this.autoSave = val;
        },
    },
});
