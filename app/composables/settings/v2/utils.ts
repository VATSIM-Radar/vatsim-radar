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

export interface SettingValue<T> {
    value: T;
    isSet: boolean;
}

export type SettingValueType<T> = ComputedRef<SettingValue<T>>;

export function getSettingValue<T>(setting: () => T | undefined, defaultValue: T): SettingValueType<T> {
    return computed(() => {
        const value = setting();

        return {
            value: value === undefined ? defaultValue : value,
            isSet: value !== undefined,
        };
    });
}

let store: ReturnType<typeof useStore>;
let mapStore: ReturnType<typeof useMapStore>;
let dataStore: ReturnType<typeof useDataStore>;
let settingsStore: ReturnType<typeof useSettingsStore>;
let notLoggedIn: ComputedRef<boolean>;

export function makeSettingsItems<T extends Record<string, SettingsItem>>(func: (settings: {
    store: ReturnType<typeof useStore>;
    mapStore: ReturnType<typeof useMapStore>;
    dataStore: ReturnType<typeof useDataStore>;
    settingsStore: ReturnType<typeof useSettingsStore>;
    notLoggedIn: ComputedRef<boolean>;
}) => T): Record<keyof T, SettingsItem> {
    if (!store || !mapStore || !dataStore || !settingsStore || !notLoggedIn) {
        store = useStore();
        mapStore = useMapStore();
        dataStore = useDataStore();
        settingsStore = useSettingsStore();
        notLoggedIn = computed(() => !store.user);
    }

    return func({
        store,
        mapStore,
        dataStore,
        settingsStore,
        notLoggedIn,
    });
}
