import {
    getColorByKey,
    getSettingValue,
    makeSettingsItems,
    setColorByKey,
    setSettingByKey,
    settingsDefaultValues,
} from '~/composables/settings/v2/utils';
import type { SettingsKeysWithDefault, SettingValueType } from '~/composables/settings/v2/utils';
import type { UserMapSettingsColor, UserMapSettingsTurns } from '~/utils/server/handlers/map-settings';

type ColorValue = Partial<UserMapSettingsColor> | null;

function colorValue(path: SettingsKeysWithDefault): SettingValueType<ColorValue> {
    return getColorByKey(path) as SettingValueType<ColorValue>;
}

function colorDefault(path: SettingsKeysWithDefault): ColorValue {
    return settingsDefaultValues[path] as ColorValue;
}

function transparencyDefault(path: SettingsKeysWithDefault) {
    return { transparency: settingsDefaultValues[path] as number };
}

export const settingsItemAppearanceColors = globalComputed(() => makeSettingsItems(({ settingsStore }) => ({
    turns: {
        type: 'select',
        title: 'Track theme',
        items: [
            { value: 'magma' },
            { value: 'inferno' },
            { value: 'rainbow' },
            { value: 'viridis' },
        ],
        value: getSettingValue('map.preferences.colors.turns'),
        onChange: value => setSettingByKey('map.preferences.colors.turns', value as UserMapSettingsTurns),
    },
    turnsTransparency: {
        type: 'color',
        title: 'Track transparency',
        mode: 'transparency',
        defaultColor: transparencyDefault('map.preferences.colors.turnsTransparency'),
        value: getSettingValue(() => ({ transparency: getSettingValue('map.preferences.colors.turnsTransparency').value.value }), { transparency: 1 }),
        onChange: value => setSettingByKey('map.preferences.colors.turnsTransparency', value?.transparency ?? undefined),
    },
    approach: {
        type: 'color',
        title: 'Approach tracon/circle',
        defaultColor: colorDefault('map.preferences.colors.default.approach'),
        value: colorValue('map.preferences.colors.default.approach'),
        onChange: value => setColorByKey('map.preferences.colors.default.approach', value as UserMapSettingsColor),
    },
    approachBookings: {
        type: 'color',
        title: 'Booked approach tracon/circle',
        defaultColor: colorDefault('map.preferences.colors.default.approachBookings'),
        value: colorValue('map.preferences.colors.default.approachBookings'),
        onChange: value => setColorByKey('map.preferences.colors.default.approachBookings', value as UserMapSettingsColor),
    },
    firs: {
        type: 'color',
        title: 'FIR (ARTCC)',
        defaultColor: colorDefault('map.preferences.colors.default.firs'),
        value: colorValue('map.preferences.colors.default.firs'),
        onChange: value => setColorByKey('map.preferences.colors.default.firs', value as UserMapSettingsColor),
    },
    centerBookings: {
        type: 'color',
        title: 'Booked FIR (ARTCC)',
        defaultColor: colorDefault('map.preferences.colors.default.centerBookings'),
        value: colorValue('map.preferences.colors.default.centerBookings'),
        onChange: value => setColorByKey('map.preferences.colors.default.centerBookings', value as UserMapSettingsColor),
    },
    uirs: {
        type: 'color',
        title: 'UIR/FSS',
        defaultColor: colorDefault('map.preferences.colors.default.uirs'),
        value: colorValue('map.preferences.colors.default.uirs'),
        onChange: value => setColorByKey('map.preferences.colors.default.uirs', value as UserMapSettingsColor),
    },
    centerText: {
        type: 'color',
        title: 'FIR label (text)',
        defaultColor: colorDefault('map.preferences.colors.default.centerText'),
        value: colorValue('map.preferences.colors.default.centerText'),
        onChange: value => setColorByKey('map.preferences.colors.default.centerText', value as UserMapSettingsColor),
    },
    centerBg: {
        type: 'color',
        title: 'FIR label (background)',
        defaultColor: colorDefault('map.preferences.colors.default.centerBg'),
        value: colorValue('map.preferences.colors.default.centerBg'),
        onChange: value => setColorByKey('map.preferences.colors.default.centerBg', value as UserMapSettingsColor),
    },
    runways: {
        type: 'color',
        title: 'Runways',
        defaultColor: colorDefault('map.preferences.colors.default.runways'),
        value: colorValue('map.preferences.colors.default.runways'),
        onChange: value => setColorByKey('map.preferences.colors.default.runways', value as UserMapSettingsColor),
    },
    gates: {
        type: 'color',
        title: 'Gates',
        mode: 'transparency',
        defaultColor: transparencyDefault('map.preferences.colors.default.gates'),
        value: getSettingValue(() => ({ transparency: getColorByKey('map.preferences.colors.default.gates').value.value }), { transparency: 1 }),
        onChange: value => setColorByKey('map.preferences.colors.default.gates', value?.transparency),
    },
    staffedAirport: {
        type: 'color',
        title: 'Staffed Airport',
        mode: 'transparency',
        defaultColor: transparencyDefault('map.preferences.colors.default.staffedAirport'),
        value: getSettingValue(() => ({ transparency: getColorByKey('map.preferences.colors.default.staffedAirport').value.value }), { transparency: 1 }),
        onChange: value => setColorByKey('map.preferences.colors.default.staffedAirport', value?.transparency),
    },
    defaultAirport: {
        type: 'color',
        title: 'Unstaffed Airport',
        mode: 'transparency',
        defaultColor: transparencyDefault('map.preferences.colors.default.defaultAirport'),
        value: getSettingValue(() => ({ transparency: getColorByKey('map.preferences.colors.default.defaultAirport').value.value }), { transparency: 1 }),
        onChange: value => setColorByKey('map.preferences.colors.default.defaultAirport', value?.transparency),
    },
    aircraftMain: {
        type: 'color',
        title: 'Default aircraft',
        defaultColor: colorDefault('map.preferences.colors.default.aircraft.main'),
        value: colorValue('map.preferences.colors.default.aircraft.main'),
        onChange: value => setColorByKey('map.preferences.colors.default.aircraft.main', value as UserMapSettingsColor),
    },
    aircraftGround: {
        type: 'color',
        title: 'On ground aircraft',
        defaultColor: colorDefault('map.preferences.colors.default.aircraft.ground'),
        value: colorValue('map.preferences.colors.default.aircraft.ground'),
        onChange: value => setColorByKey('map.preferences.colors.default.aircraft.ground', value as UserMapSettingsColor),
    },
    aircraftActive: {
        type: 'color',
        title: 'Active aircraft',
        description: 'Aircraft with opened overlay',
        defaultColor: colorDefault('map.preferences.colors.default.aircraft.active'),
        value: colorValue('map.preferences.colors.default.aircraft.active'),
        onChange: value => setColorByKey('map.preferences.colors.default.aircraft.active', value as UserMapSettingsColor),
    },
    aircraftGreen: {
        type: 'color',
        title: 'Own aircraft',
        defaultColor: colorDefault('map.preferences.colors.default.aircraft.green'),
        value: colorValue('map.preferences.colors.default.aircraft.green'),
        onChange: value => setColorByKey('map.preferences.colors.default.aircraft.green', value as UserMapSettingsColor),
    },
    aircraftHover: {
        type: 'color',
        title: 'Hover aircraft',
        defaultColor: colorDefault('map.preferences.colors.default.aircraft.hover'),
        value: colorValue('map.preferences.colors.default.aircraft.hover'),
        onChange: value => setColorByKey('map.preferences.colors.default.aircraft.hover', value as UserMapSettingsColor),
    },
    aircraftLanded: {
        type: 'color',
        title: 'Landed aircraft',
        description: 'Dashboard or emergency',
        defaultColor: colorDefault('map.preferences.colors.default.aircraft.landed'),
        value: colorValue('map.preferences.colors.default.aircraft.landed'),
        onChange: value => setColorByKey('map.preferences.colors.default.aircraft.landed', value as UserMapSettingsColor),
    },
    aircraftArriving: {
        type: 'color',
        title: 'Arriving aircraft',
        description: 'Dashboard',
        defaultColor: colorDefault('map.preferences.colors.default.aircraft.arriving'),
        value: colorValue('map.preferences.colors.default.aircraft.arriving'),
        onChange: value => setColorByKey('map.preferences.colors.default.aircraft.arriving', value as UserMapSettingsColor),
    },
    aircraftDeparting: {
        type: 'color',
        title: 'Departing aircraft',
        description: 'Dashboard',
        defaultColor: colorDefault('map.preferences.colors.default.aircraft.departing'),
        value: colorValue('map.preferences.colors.default.aircraft.departing'),
        onChange: value => setColorByKey('map.preferences.colors.default.aircraft.departing', value as UserMapSettingsColor),
    },
})));
