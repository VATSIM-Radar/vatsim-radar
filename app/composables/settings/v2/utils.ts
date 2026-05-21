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

type SettingsDefaultValues<T extends UserSettingsV2 = UserSettingsV2> = {
    [K in DeepKeyOfSettings<T>]?: DeepValueOfSetting<T, K>
};

const _settingsDefaultValues = {
    'map.preferences.aircraft.shortView': false,
    'map.preferences.aircraft.dynamicScale': true,
    'map.preferences.aircraft.scale': 1,
    'map.preferences.aircraft.tracks.mode': 'arrivalsOnly',
    'map.preferences.aircraft.tracks.showOutOfBounds': false,
    'map.preferences.aircraft.tracks.limit': 50,
    'map.preferences.aircraft.showLimit': 100,

    'map.preferences.airports.defaultZoomLevel': 14,


    'map.preferences.airports.shortView': false,
    'map.preferences.airports.showMode': 'all',
    'map.preferences.airports.declutterIf': 'unstaffed',
    'map.preferences.airports.ATISAsUnstaffed': false,

    'map.preferences.airports.groundTraffic.hide': 'lowZoom',
    'map.preferences.airports.groundTraffic.excludeMyArrival': true,
    'map.preferences.airports.groundTraffic.excludeMyLocation': true,

    'map.preferences.airports.departuresCountInOverlay': false,

    'map.preferences.airports.counters.enabled': true,
    'map.preferences.airports.counters.syncDeparturesArrivals': true,
    'map.preferences.airports.counters.departuresMode': 'ground',
    'map.preferences.airports.counters.arrivalsMode': 'ground',
    'map.preferences.airports.counters.horizontalCounter': 'prefiles',
    'map.preferences.airports.counters.disableTraining': false,
    'map.preferences.airports.showLimit': 100,

    // Stopped here
    'map.preferences.colors.default.firs': { color: 'green500', transparency: 0.1 },

    'map.preferences.overlaysPositions': 'bottom-left',
    'map.preferences.autoFollow': false,
    'map.preferences.autoZoom': false,
    'map.preferences.debugMode': false,
    'map.preferences.featuredDefaultBookmarks': false,
    'map.preferences.skipBookmarkAnimation': false,
    'map.preferences.showTotalDeparturesInFeaturedAirports': false,
    'map.preferences.searchBy': ['atc', 'airports', 'flights'],
    'map.preferences.searchLimit': 10,
    'map.preferences.enableQueryUpdate': false,
    'appearance.headerName': '',
} satisfies SettingsDefaultValues;

const settingsDefaultValues = _settingsDefaultValues as {
    [K in keyof typeof _settingsDefaultValues]: DeepValueOfSetting<UserSettingsV2, K>
};

type SettingsKeysWithDefault = keyof typeof settingsDefaultValues;

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

export function getSettingValue<K extends SettingsKeysWithDefault, V = DeepValueOfSetting<UserSettingsV2, any>>(setting: K): SettingValueType<V>;
export function getSettingValue<T>(setting: (() => T | undefined), defaultValue: T): SettingValueType<T>;
export function getSettingValue(setting: SettingsKeysWithDefault | (() => unknown | undefined), defaultValue?: unknown): SettingValueType<unknown> {
    return computed(() => {
        if (typeof setting === 'string') {
            const val = getSettingByKey(settingsStore.settings, setting);
            return {
                value: val === undefined ? settingsDefaultValues[setting] : val,
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

export function getSettingValueFromFunc<K extends SettingsKeysWithDefault, V = DeepValueOfSetting<UserSettingsV2, any>>(setting: K): V;
export function getSettingValueFromFunc<T>(setting: (() => T | undefined), defaultValue: T): T;
export function getSettingValueFromFunc(setting: SettingsKeysWithDefault | (() => unknown | undefined), defaultValue?: unknown) {
    // Otherwise TS curses me
    const settingValue = typeof setting === 'function'
        ? getSettingValue(setting, defaultValue as any)
        : getSettingValue(setting);

    return computed(() => settingValue.value.value);
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
