import { defineStore } from 'pinia';
import type { UserSettingsPreset, UserSettingsV2Partial } from '~/utils/settings/types';
import { onSettingChange } from '~/composables/settings/v2/utils';
import { sendUserPreset } from '~/composables/fetchers';

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
            this.autoSave = this.getAutoSave();
            this.activeSettingsPreset = settingsActivePreset().value.value ?? null;

            if (this.activeSettingsPreset) {
                const preset = this.settingsPresets.find(x => x.id === this.activeSettingsPreset);

                if (preset) {
                    await this.save(JSON.parse(JSON.stringify(preset.json)), { overwrite: true, autoSave: false });
                    return;
                }
                else {
                    settingsActivePreset().value.value = null;
                }
            }

            if (!this.activeSettingsPreset && this.autoSave && this.settingsPresets.length) {
                this.setPreset(this.settingsPresets[0].id);
                await this.save(JSON.parse(JSON.stringify(this.settingsPresets[0].json)), { overwrite: true, autoSave: false });
            }
            else {
                await this.save(JSON.parse(localStorage.getItem('settings') ?? '{}'), { overwrite: true, autoSave: false });
            }
        },
        async save(settings: UserSettingsV2Partial, { overwrite, onSave, autoSave = true, dontSave }: {
            overwrite?: boolean;
            onSave?: () => void;
            autoSave?: boolean;
            dontSave?: boolean;
        } = {}) {
            console.log(autoSave, this.activeSettingsPreset);

            if (autoSave) {
                this.autoSave = this.getAutoSave();

                if (this.autoSave && !this.activeSettingsPreset && this.settingsPresets.length) {
                    this.activeSettingsPreset = this.settingsPresets[0].id;
                }
                else if (!this.settingsPresets.length && useStore().user) {
                    await sendUserPreset('Default', {}, 'settings/v2', () => new Promise<void>(resolve => resolve));
                    await this.fetchPresets();
                    this.setPreset(this.settingsPresets[0]?.id ?? null);
                }
                else if (!this.autoSave && this.activeSettingsPreset) {
                    this.setPreset(null);
                }
            }

            this.settings = overwrite ? settings : customDefu(settings, JSON.parse(localStorage.getItem('settings') ?? '{}'));
            if (!this.settings.version) this.settings.version = '2.0';
            onSave?.();
            if (!dontSave) {
                await onSettingChange(autoSave);
            }
        },
        getAutoSave() {
            return useStore().user?.settings.settingsAutoSave ?? isSettingsAutoSave().value.value ?? true;
        },
        setAutoSave(val: boolean) {
            const user = useStore().user;

            if (user) {
                user.settings.settingsAutoSave = val;
                $fetch('/api/user/settings', {
                    method: 'POST',
                    body: {
                        ...user.settings,
                        settingsAutoSave: val,
                    },
                });
            }
            isSettingsAutoSave().value.value = val;
            this.autoSave = val;
        },
        setPreset(id: number | null) {
            settingsActivePreset().value.value = id;
            this.activeSettingsPreset = id;
        },
    },
});
