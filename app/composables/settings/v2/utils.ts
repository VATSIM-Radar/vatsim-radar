import type { SettingsItem } from '~/composables/settings/v2/types';
import { useSettingsStore } from '~/store/settings';
import type {
    DeepKeyOfSettings,
    DeepValueOfSetting,
    UserSettingsV2,
    UserSettingsV2Partial,
} from '~/utils/settings/types';
import type { UserCustomPreset } from '~/components/map/settings/filters/MapFiltersPresets.vue';
import { setCustomDefuMergeAsIs } from '~/composables';

type SettingChangeValue<T> =
    T extends { onChange: (value: infer V) => unknown }
        ? V
        : never;

export async function onSettingChange(autoSave = true) {
    const settingsStore = useSettingsStore();

    localStorage.setItem('settings', JSON.stringify(settingsStore.settings));

    if (!settingsStore.activeSettingsPreset || !settingsStore.autoSave || !autoSave) return;

    await $fetch<UserCustomPreset>(`/api/user/settings/v2/${ settingsStore.activeSettingsPreset }`, {
        method: 'PUT',
        body: {
            json: settingsStore.settings,
        },
    });
    useStore().addNotification({
        type: 'success',
        text: 'Settings have been saved!',
        timeout: 2000,
    });
}

export async function handleSettingChange<T extends SettingsItem>(item: T, value: SettingChangeValue<T>): Promise<unknown> {
    if (!('onChange' in item)) throw new Error(`Invalid setting type: received ${ item.type }, mutable expected`);

    return await item.onChange(value as never);
}

export interface SettingValue<T> {
    value: T;
    isSet?: boolean;
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
    'appearance.theme': null,
    'appearance.headerName': '',
    'appearance.timeFormat': '24h',
    'appearance.eventsLocalTimezone': false,
    'appearance.bookingsLocalTimezone': false,
    'appearance.notamsSortBy': null,
    'appearance.favoriteSort': null,

    'map.preferences.aircraft.shortView': false,
    'map.preferences.aircraft.dynamicScale': true,
    'map.preferences.aircraft.scale': 1,
    'map.preferences.aircraft.tracks.mode': 'arrivalsOnly',
    'map.preferences.aircraft.tracks.showOutOfBounds': false,
    'map.preferences.aircraft.tracks.limit': 50,
    'map.preferences.aircraft.showLimit': 100,

    'map.preferences.airports.defaultZoomLevel': 14,

    'map.preferences.airports.shortView': false,
    'map.preferences.airports.showMode': 'staffedAndGroundTraffic',
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

    'map.preferences.colors.default.firs': { color: 'green500', transparency: 0.1 },
    'map.preferences.colors.default.uirs': { color: 'purple400', transparency: 0.1 },
    'map.preferences.colors.default.centerText': { color: 'lightGray500' },
    'map.preferences.colors.default.centerBg': { color: 'darkGray500' },
    'map.preferences.colors.default.approach': { color: 'citrus600' },
    'map.preferences.colors.default.approachBookings': { color: 'purple300', transparency: 0.7 },
    'map.preferences.colors.default.centerBookings': { color: 'lightGray400', transparency: 0.07 },
    'map.preferences.colors.default.staffedAirport': 1,
    'map.preferences.colors.default.defaultAirport': 1,
    'map.preferences.colors.default.runways': { color: 'red300' },
    'map.preferences.colors.default.gates': 1,
    'map.preferences.colors.turns': 'magma',
    'map.preferences.colors.turnsTransparency': 1,

    'map.preferences.colors.default.aircraft.ground': { color: 'red300' },
    'map.preferences.colors.default.aircraft.active': { color: 'red300' },
    'map.preferences.colors.default.aircraft.green': { color: 'red300' },
    'map.preferences.colors.default.aircraft.hover': { color: 'red300' },
    'map.preferences.colors.default.aircraft.landed': { color: 'red300' },
    'map.preferences.colors.default.aircraft.arriving': { color: 'red300' },
    'map.preferences.colors.default.aircraft.departing': { color: 'red300' },
    'map.preferences.colors.default.aircraft.main': { color: 'blue500' },

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

    'map.layers.weather': null,
    'map.layers.layer': 'protoData',
    'map.layers.layerLabels': true,
    'map.layers.relativeIndicator': 'metric',
    'map.layers.terminator': false,
    'map.layers.heatmap': false,

    'map.layers.transparency.osm': 0.5,
    'map.layers.transparency.satellite': 0.3,
    'map.layers.transparency.weatherDark': null,
    'map.layers.transparency.weatherLight': null,
    'map.layers.transparency.sigmets': 0.15,

    'map.layers.natTrak.enabled': false,
    'map.layers.natTrak.concorde': false,
    'map.layers.natTrak.direction': 'all',

    'map.layers.distance.enabled': false,
    'map.layers.distance.units': 'nautical',
    'map.layers.distance.interaction': 'dblclick',

    'map.traffic.showFullRoute': false,
    'map.traffic.toggleAircraftOverlays': false,
    'map.traffic.autoShowAirportTracks': false,
    'map.traffic.disableFastUpdate': false,
    'map.traffic.declutter': false,
    'map.traffic.highlightEmergency': false,

    'map.vatglasses.active': false,
    'map.vatglasses.autoEnable': true,
    'map.vatglasses.autoLevel': true,
    'map.vatglasses.combined': false,
    'map.vatglasses.combineBands': false,

    'map.navigraph.enabled': true,

    'map.navigraph.routeParsing.enabled': true,
    'map.navigraph.routeParsing.enabledOnHover': true,
    'map.navigraph.routeParsing.airportOverlay.enabled': true,
    'map.navigraph.routeParsing.airportOverlay.sid': true,
    'map.navigraph.routeParsing.airportOverlay.star': true,
    'map.navigraph.routeParsing.airportOverlay.holds': true,
    'map.navigraph.routeParsing.airportOverlay.labels': true,
    'map.navigraph.routeParsing.airportOverlay.waypoints': true,

    'map.navigraph.layers.ndb': false,
    'map.navigraph.layers.vordme': false,
    'map.navigraph.layers.waypoints': false,
    'map.navigraph.layers.terminalWaypoints': false,
    'map.navigraph.layers.holdings': false,
    'map.navigraph.layers.ifrMode': 'both',
    'map.navigraph.layers.ifrAuto': true,
    'map.navigraph.layers.airways.enabled': false,
    'map.navigraph.layers.airways.showAirwaysLabel': true,
    'map.navigraph.layers.airways.showWaypointsLabel': true,

    'map.navigraph.airport.enabled': true,
    'map.navigraph.airport.taxiways': true,
    'map.navigraph.airport.gateGuidance': true,
    'map.navigraph.airport.runwayExit': true,
    'map.navigraph.airport.deicing': true,

    'map.visibility.atc.firs': true,
    'map.visibility.atc.approach': true,
    'map.visibility.atc.ground': true,
    'map.visibility.atcLabels': true,
    'map.visibility.vatglassesLabels': true,
    'map.visibility.artccTracons': true,
    'map.visibility.airports': true,
    'map.visibility.pilots': true,
    'map.visibility.gates': true,
    'map.visibility.runways': true,
    'map.visibility.pilotsInfo': true,
    'map.visibility.atcInfo': true,
    'map.visibility.pilotLabels': true,

    'map.bookings.enabled': true,
    'map.bookings.hours': 1,

    'map.events.enabled': true,
    'map.events.hours': 1,

    'sigmets.showOnMap': false,
    'sigmets.enabled': ['CONV', 'TS', 'ICE', 'FZLVL', 'TURB', 'MTW', 'WIND', 'WS', 'IFR', 'OBSC', 'VA'],
    'sigmets.showAirmets': false,
    'sigmets.raw': false,
} satisfies SettingsDefaultValues;

export const settingsDefaultValues = _settingsDefaultValues as {
    [K in keyof typeof _settingsDefaultValues]: DeepValueOfSetting<UserSettingsV2, K>
};

export function setAircraftDefaultColors() {
    const aircraftColors = aircraftStatusColors;

    const aircraftOptions = ['ground', 'active', 'green', 'hover', 'landed', 'arriving', 'departing'] satisfies MapAircraftStatus[];

    for (const option of aircraftOptions) {
        settingsDefaultValues[`map.preferences.colors.default.aircraft.${ option }`] = { color: aircraftColors[option] };
    }
}

export type SettingsKeysWithDefault = keyof typeof settingsDefaultValues;

export function setSettingByKey<K extends DeepKeyOfSettings>(path: K, value: DeepValueOfSetting<UserSettingsV2, K> | undefined) {
    try {
        const settingsStore = useSettingsStore();

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
            return settingsStore.save(root, { overwrite: true });
        }
        else {
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                result[part] = {};
                result = result[part] as Record<string, unknown>;
            }

            const last = parts[parts.length - 1];
            result[last] = value as unknown;

            if (value === null) setCustomDefuMergeAsIs();
            return settingsStore.save(root);
        }
    }
    catch (e) {
        console.log(path ?? 'no path', value);
        throw e;
    }
}

function changeColorPath<T extends string>(path: T) {
    if (!path.includes('preferences.colors')) return path;

    const store = useStore();

    if (store.theme === 'light' && path.includes('colors.default')) {
        path = path.replace('colors.default', 'colors.light') as T;
    }

    else if (store.theme === 'default' && path.includes('colors.light')) {
        path = path.replace('colors.light', 'colors.default') as T;
    }

    return path;
}

export function getColorByKey<K extends SettingsKeysWithDefault>(path: K) {
    const colorPath = changeColorPath(path);
    const settingsStore = useSettingsStore();

    return getSettingValue(
        () => getSettingByKey(settingsStore.settings, colorPath) ?? getSettingByKey(settingsStore.settings, path),
        settingsDefaultValues[path],
    );
}

export function getColorValueByKey<K extends SettingsKeysWithDefault>(path: K) {
    const colorPath = changeColorPath(path);

    return getKeyedValueFromSettings(colorPath) ?? getKeyedValueFromSettings(path) ?? settingsDefaultValues[path];
}

export function setColorByKey<K extends DeepKeyOfSettings>(path: K, value: DeepValueOfSetting<UserSettingsV2, K> | undefined) {
    setSettingByKey(changeColorPath(path), value);
}

export function getSettingValue<K extends SettingsKeysWithDefault, V = DeepValueOfSetting<UserSettingsV2, any>>(setting: K): SettingValueType<V>;
export function getSettingValue<T>(setting: (() => T | undefined), defaultValue: T): SettingValueType<T>;
export function getSettingValue(setting: SettingsKeysWithDefault | (() => unknown | undefined), defaultValue?: unknown): SettingValueType<unknown> {
    const settingsStore = useSettingsStore();

    return computed(() => {
        if (typeof setting === 'string') {
            const val = getSettingByKey(settingsStore.settings, setting);
            return {
                value: val === undefined ? settingsDefaultValues[setting] : val,
                isSet: val !== undefined && val !== settingsDefaultValues[setting],
            };
        }

        const value = setting();

        return {
            value: value === undefined ? defaultValue : value,
        };
    });
}

export function useSettingValueFromFunc<K extends SettingsKeysWithDefault, V = DeepValueOfSetting<UserSettingsV2, any>>(setting: K): ComputedRef<V>;
export function useSettingValueFromFunc<T>(setting: (() => T | undefined), defaultValue: T): ComputedRef<T>;
export function useSettingValueFromFunc(setting: SettingsKeysWithDefault | (() => unknown | undefined), defaultValue?: unknown): ComputedRef<DeepValueOfSetting<UserSettingsV2, any>> {
    // Otherwise TS curses me
    const settingValue = typeof setting === 'function'
        ? getSettingValue(setting, defaultValue as any)
        : getSettingValue(setting);

    return computed(() => settingValue.value.value);
}

export function getKeyedValueFromSettings<K extends SettingsKeysWithDefault, V = DeepValueOfSetting<UserSettingsV2, any>>(setting: K, noDefault: true): V | undefined;
export function getKeyedValueFromSettings<K extends SettingsKeysWithDefault, V = DeepValueOfSetting<UserSettingsV2, any>>(setting: K, noDefault?: false): V;
export function getKeyedValueFromSettings<K extends SettingsKeysWithDefault, V = DeepValueOfSetting<UserSettingsV2, any>>(setting: K, noDefault = false): V | undefined {
    const settingValue = getSettingByKey(useSettingsStore().settings, setting);

    if (noDefault && settingValue === undefined) return settingValue;

    return (settingValue === undefined ? settingsDefaultValues[setting] : settingValue);
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
