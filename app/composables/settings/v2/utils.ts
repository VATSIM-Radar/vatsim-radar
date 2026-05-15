import type { SettingsItem } from '~/composables/settings/v2/types';
import { useSettingsStore } from '~/store/settings';

type SettingChangeValue<T> =
    T extends { onChange: (value: infer V) => unknown }
        ? V
        : never;

export function onSettingChange() {
    const settingsStore = useSettingsStore();

    // TODO
    console.log('save action executed', settingsStore.activeSettingsPreset);

    localStorage.setItem('settings', JSON.stringify(settingsStore.activeSettingsPreset));
}

export async function handleSettingChange<T extends SettingsItem>(item: T, value: SettingChangeValue<T>): Promise<unknown> {
    if (!('onChange' in item)) throw new Error(`Invalid setting type: received ${ item.type }, mutable expected`);

    return await item.onChange(value as never);
}
