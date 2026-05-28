import { defineStore } from 'pinia';
import type { UserSettingsPreset, UserSettingsV2Partial } from '~/utils/settings/types';
import { onSettingChange } from '~/composables/settings/v2/utils';
import type { UserMapPreset } from '~/utils/server/handlers/map-settings';

export const isSettingsAutoSave = globalComputed(() => useCookie<boolean>('is-settings-auto-save', {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'none',
    secure: true,
}));

export const settingsActivePreset = globalComputed(() => useCookie<number | null>('settings-preset', {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'none',
    secure: true,
}));

export const useSettingsStore = defineStore('settings', {
    state: () => ({
        settings: {} as UserSettingsV2Partial,
        settingsPresets: [] as UserSettingsPreset[],
        activeSettingsPreset: null as number | null,
        autoSave: true,
    }),
    actions: {
        async fetchPresets() {
            if (!useStore().user) return;
            this.settingsPresets = await $fetch<UserSettingsPreset[]>('/api/user/settings/v2');
            this.autoSave = isSettingsAutoSave().value.value ?? true;
            this.activeSettingsPreset = settingsActivePreset().value.value ?? null;

            if (this.activeSettingsPreset) {
                const preset = this.settingsPresets.find(x => x.id === this.activeSettingsPreset);

                if (preset) {
                    await this.save(preset.json, { overwrite: true, autoSave: false });
                    return;
                }
                else {
                    settingsActivePreset().value.value = null;
                }
            }

            if (!this.activeSettingsPreset && this.autoSave && this.settingsPresets.length) {
                this.activeSettingsPreset = this.settingsPresets[0].id;
                await this.save(this.settingsPresets[0].json, { overwrite: true, autoSave: false });
            }
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
            await onSettingChange(autoSave);
        },
        setAutoSave(val: boolean) {
            isSettingsAutoSave().value.value = val;
            this.autoSave = val;
        },
        setPreset(id: number) {
            settingsActivePreset().value.value = id;
        },
    },
});
