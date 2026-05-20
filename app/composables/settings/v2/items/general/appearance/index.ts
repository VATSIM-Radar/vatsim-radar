import {getSettingValue, makeSettingsItems, setSettingByKey} from '~/composables/settings/v2/utils';

export const settingsItemAppearance = () => makeSettingsItems(({ settingsStore }) => ({
    shortAirportView: {
        title: 'Short facilities view',
        description: 'Always shows airport facilities as lines',
        type: 'toggle',
        value: getSettingValue(() => settingsStore.settings.map?.preferences?.shortAirportView, false),
        onChange: value => settingsStore.save({ map: { preferences: { shortAirportView: value } } }),
    },
    overlaysPositions: {
        title: 'Minified Overlays positions',
        description: 'Changes position of minified Map Overlays',
        type: 'radio',
        items: [
            { value: 'bottom-left', text: 'Bottom Left' },
            { value: 'top-left', text: 'Top Left' },
        ],
        value: getSettingValue('map.preferences.overlaysPositions', 'bottom-left'),
        onChange: value => setSettingByKey('map.preferences.overlaysPositions', value as any),
    },
}));
