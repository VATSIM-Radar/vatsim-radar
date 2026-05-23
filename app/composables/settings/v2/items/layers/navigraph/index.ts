import { getSettingValue, makeSettingsItems, setSettingByKey } from '~/composables/settings/v2/utils';

export const settingsItemNavigraph = globalComputed(() => makeSettingsItems(() => ({
    enabled: {
        title: 'Enabled',
        description: 'Enables Navigraph layers',
        type: 'toggle',
        value: getSettingValue('map.navigraph.enabled'),
        onChange: value => setSettingByKey('map.navigraph.enabled', value),
    },
})));
