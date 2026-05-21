import { getSettingValue, makeSettingsItems, setSettingByKey } from '~/composables/settings/v2/utils';
import SettingsScale from '~/components/features/settings/v2/misc/SettingsScale.vue';

export const settingsItemAppearanceAircraft = () => makeSettingsItems(({ settingsStore }) => ({
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
        type: 'select',
        items: [
            {
                value: 'arrivalsAndLanded',
                text: 'Arrivals',
            },
            {
                value: 'arrivalsOnly',
                text: 'Airborne Arrivals (default)',
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
}));
