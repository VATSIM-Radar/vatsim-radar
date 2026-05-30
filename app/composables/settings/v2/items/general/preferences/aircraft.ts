import { getSettingValue, makeSettingsItems, setSettingByKey } from '~/composables/settings/v2/utils';
import SettingsScale from '~/components/features/settings/v2/misc/SettingsScale.vue';

export const settingsItemPreferencesAircraft = globalComputed(() => makeSettingsItems(({ settingsStore }) => ({
    shortView: {
        title: 'Short facilities view',
        description: 'Reduces on-hover displayed info',
        type: 'toggle',
        value: getSettingValue('map.preferences.aircraft.shortView'),
        onChange: value => setSettingByKey('map.preferences.aircraft.shortView', value as any),
    },
    dynamicScale: {
        title: 'Dynamic Scale',
        description: 'Smoothly scales aircraft icons as you zoom in or out - and shows close to real aircraft size when on ground',
        type: 'toggle',
        value: getSettingValue('map.preferences.aircraft.dynamicScale'),
        onChange: value => setSettingByKey('map.preferences.aircraft.dynamicScale', value as any),
    },
    scale: {
        title: 'Scale',
        description: 'Scales aircraft in general - no matter if Dynamic Scale is enabled',
        type: 'range',
        min: 0.50,
        max: 1.50,
        step: 0.05,
        value: getSettingValue('map.preferences.aircraft.scale'),
        onChange: value => setSettingByKey('map.preferences.aircraft.scale', value as any),
        appendComponent: SettingsScale,
    },
    tracksMode: {
        title: 'Show Aircraft tracks for...',
        searchKeywords: ['turns', 'trail', 'history', 'track'],
        type: 'select',
        items: [
            {
                value: 'arrivalsAndLanded',
                text: 'Arrivals',
            },
            {
                value: 'arrivalsOnly',
                text: 'Airborne Arrivals',
            },
            {
                value: 'departures',
                text: 'Airborne Departures',
            },
            {
                value: 'ground',
                text: 'Ground traffic',
            },
            {
                value: 'allAirborne',
                text: 'All Airborne',
            },
            {
                value: 'all',
                text: 'All',
            },
        ],
        value: getSettingValue('map.preferences.aircraft.tracks.mode'),
        onChange: value => setSettingByKey('map.preferences.aircraft.tracks.mode', value as any),
    },
    showOutOfBounds: {
        title: 'Show tracks when out of bounds',
        description: 'Shows tracks for aircraft when out of bounds according to max shown tracks limit',
        type: 'toggle',
        value: getSettingValue('map.preferences.aircraft.tracks.showOutOfBounds'),
        onChange: value => setSettingByKey('map.preferences.aircraft.tracks.showOutOfBounds', value),
    },
    tracksShowLimit: {
        title: 'Max shown tracks limit',
        description: 'Max tracks to be shown and fetched at the same time',
        type: 'select',
        items: [{ value: 100 }, { value: 75 }, { value: 50 }, { value: 40 }, { value: 25 }, { value: 15 }, { value: 10 }],
        value: getSettingValue('map.preferences.aircraft.tracks.limit'),
        onChange: value => setSettingByKey('map.preferences.aircraft.tracks.limit', value as any),
    },
    showLimit: {
        title: 'Aircraft Display limit',
        description: 'Max aircraft to show labels for, max aircraft to apply declutter, and other optimization settings',
        type: 'select',
        items: [
            { value: 10 },
            { value: 25 },
            { value: 50 },
            { value: 75 },
            { value: 100 },
            { value: 150 },
            { value: 200 },
            { value: 300 },
            { value: 400 },
            { value: 500 },
            { value: 1000 },
        ],
        value: getSettingValue('map.preferences.aircraft.showLimit'),
        onChange: value => setSettingByKey('map.preferences.aircraft.showLimit', value as number),
    },
})));
