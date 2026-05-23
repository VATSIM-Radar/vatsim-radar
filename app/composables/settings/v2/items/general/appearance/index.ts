import { getSettingValue, makeSettingsItems, setSettingByKey } from '~/composables/settings/v2/utils';

export const settingsItemAppearance = () => makeSettingsItems(({ settingsStore }) => ({
    overlaysPositions: {
        title: 'Minified Overlays positions',
        description: 'Changes position of minified Map Overlays',
        type: 'radio',
        items: [
            { value: 'bottom-left', text: 'Bottom Left' },
            { value: 'top-left', text: 'Top Left' },
        ],
        value: getSettingValue('map.preferences.overlaysPositions'),
        onChange: value => setSettingByKey('map.preferences.overlaysPositions', value as any),
    },
}));
