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
    mapQuality: {
        title: 'Map Quality',
        description: 'Improves map smoothness and graphics by rendering it with a higher pixel ratio',
        hint: `Your pixel ratio is ${ typeof window === 'undefined' ? 'N/A' : window.devicePixelRatio } by default`,
        type: 'range',
        minLabel: '25% scale',
        maxLabel: '200% scale',
        min: 25,
        max: 200,
        step: 5,
        showInput: true,
        showLabels: true,
        value: getSettingValue('map.preferences.mapQuality'),
        onChange: value => setSettingByKey('map.preferences.mapQuality', value as any),
    },
    favoriteLocation: {
        title: 'Favorite Location',
        description: 'Choose where Favorite button is located in Desktop mode',
        hint: 'Affects desktop and wide tablets only',
        type: 'radio',
        items: [
            { value: 'header', text: 'Header' },
            { value: 'footer', text: 'Footer' },
        ],
        value: getSettingValue('map.preferences.favoriteLocation'),
        onChange: value => setSettingByKey('map.preferences.favoriteLocation', value as any),
    },
})));
