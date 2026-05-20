import type { SettingsItem } from '~/composables/settings/v2/types';
import { useSettingsStore } from '~/store/settings';
import type {
    DeepKeyOfSettings,
    DeepValueOfSetting,
    UserSettingsV2,
    UserSettingsV2Partial,
} from '~/utils/settings/types';

type SettingChangeValue<T> =
    T extends { onChange: (value: infer V) => unknown }
        ? V
        : never;

export function onSettingChange() {
    const settingsStore = useSettingsStore();

    // TODO
    console.log('save action executed', settingsStore.activeSettingsPreset);

    localStorage.setItem('settings', JSON.stringify(settingsStore.settings));
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

export function getSettingByKey<K extends DeepKeyOfSettings>(settings: UserSettingsV2Partial, path: K): DeepValueOfSetting<UserSettingsV2, K> | undefined {
    const parts = path.split('.');
    let result: unknown = settings;

    for (const part of parts) {
        if (result === null || typeof result !== 'object') return undefined;
        if (!(part in (result as Record<string, unknown>))) return undefined;
        result = (result as Record<string, unknown>)[part];
    }

    return result as any;
}

export function setSettingByKey<K extends DeepKeyOfSettings>(path: K, value: DeepValueOfSetting<UserSettingsV2, K> | undefined) {
    const parts = path.split('.');
    let root: UserSettingsV2Partial = {};
    let result: Record<string, unknown> = root;

    if (value === undefined) {
        root = settingsStore.settings;
        result = root;

        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];

            if (!(part in (result as Record<string, unknown>))) return;
            result = result[part] as Record<string, unknown>;
            if (result === null || typeof result !== 'object') return;
        }

        const last = parts[parts.length - 1];
        const container = result as Record<string, unknown>;
        if (!(last in container)) return;

        delete container[last];
        return useSettingsStore().save(root, true);
    }
    else {
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            result[part] = {};
            result = result[part] as Record<string, unknown>;
        }

        const last = parts[parts.length - 1];
        result[last] = value as unknown;

        return useSettingsStore().save(root);
    }
}

export function getSettingValue<K extends DeepKeyOfSettings, V = DeepValueOfSetting<UserSettingsV2, any>>(setting: K, defaultValue: V): SettingValueType<V>;
export function getSettingValue<T>(setting: (() => T | undefined), defaultValue: T): SettingValueType<T>;
export function getSettingValue(setting: DeepKeyOfSettings | (() => unknown | undefined), defaultValue: unknown): SettingValueType<unknown> {
    return computed(() => {
        if (typeof setting === 'string') {
            const val = getSettingByKey(settingsStore.settings, setting);
            return {
                value: val === undefined ? defaultValue : val,
                isSet: val !== undefined,
            };
        }

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
