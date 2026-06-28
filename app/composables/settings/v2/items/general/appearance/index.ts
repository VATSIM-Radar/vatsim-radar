import { getSettingValue, makeSettingsItems, setSettingByKey } from '~/composables/settings/v2/utils';

export const settingsItemAppearance = globalComputed(() => makeSettingsItems(({ settingsStore }) => ({
    overlaysPositions: {
        title: 'Minified Overlays positions',
        description: 'Changes position of minified Map Overlays',
        searchKeywords: ['popup', 'overlay', 'pin', 'position'],
        type: 'radio',
        items: [
            { value: 'bottom-left', text: 'Bottom Left' },
            { value: 'top-left', text: 'Top Left' },
        ],
        value: getSettingValue('map.preferences.overlaysPositions'),
        onChange: value => setSettingByKey('map.preferences.overlaysPositions', value as any),
    },
    highRatio: {
        title: 'Map Quality',
        description: 'Improves map smoothness and graphics by rendering it with a higher pixel ratio',
        hint: `Your pixel ratio is ${ window.devicePixelRatio } by default`,
        type: 'radio',
        items: [
            { value: true, text: 'High' },
            { value: false, text: 'Default' },
            { value: 'low', text: 'Low (when available)' },
        ],
        value: getSettingValue('map.preferences.highRatio'),
        onChange: value => setSettingByKey('map.preferences.highRatio', value as any),
    },
})));
