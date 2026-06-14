import { getSettingValue, makeSettingsItems, setSettingByKey } from '~/composables/settings/v2/utils';
import type { MapWeatherLayer } from '~/types/map';

export const settingsItemPerformance = globalComputed(() => makeSettingsItems(({ store, notLoggedIn }) => ({
    weather: {
        title: 'Weather layer',
        description: 'Shows selected weather overlay on the map',
        searchKeywords: ['radar', 'rain', 'clouds', 'wind', 'precipitation'],
        type: 'select',
        items: [
            { value: null, text: 'Disabled' },
            { value: 'PR0', text: 'Precipitation Radar' },
            { value: 'RE', text: 'Relief' },
            { value: 'PR0C', text: 'Precipitation Intensity' },
            { value: 'WND', text: 'Wind' },
            { value: 'CL', text: 'Clouds' },
            { value: 'rainViewer', text: 'RainViewer' },
        ],
        value: getSettingValue('map.layers.weather'),
        onChange: value => setSettingByKey('map.layers.weather', value as MapWeatherLayer | null),
    },

})));
