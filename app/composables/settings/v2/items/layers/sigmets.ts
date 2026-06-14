import {
    getSettingValue,
    makeSettingsItems,
    setSettingByKey,
    settingsDefaultValues,
} from '~/composables/settings/v2/utils';
import type { SigmetType } from '~/types/map';

export const settingsItemSigmets = globalComputed(() => makeSettingsItems(({ notLoggedIn }) => ({
    showOnMap: {
        title: 'Enable',
        description: 'Shows SIGMETs on the map',
        type: 'toggle',
        value: getSettingValue('sigmets.showOnMap'),
        onChange: value => setSettingByKey('sigmets.showOnMap', value),
        searchKeywords: ['sigmet'],
    },
    disabled: {
        title: 'SIGMET types',
        description: 'Selects which SIGMET and AIRMET hazard types are shown',
        type: 'multi-select',
        items: [
            { value: 'CONV', text: 'CONV' },
            { value: 'TS', text: 'TS' },
            { value: 'ICE', text: 'ICE' },
            { value: 'FZLVL', text: 'FZLVL' },
            { value: 'TURB', text: 'TURB' },
            { value: 'MTW', text: 'MTW' },
            { value: 'WIND', text: 'WIND' },
            { value: 'WS', text: 'WS' },
            { value: 'IFR', text: 'IFR' },
            { value: 'OBSC', text: 'OBSC' },
            { value: 'VA', text: 'VA' },
        ],
        value: getSettingValue('sigmets.enabled'),
        onChange: value => {
            if (value && !value.length) value = settingsDefaultValues['sigmets.enabled'];

            return setSettingByKey('sigmets.enabled', value as SigmetType[]);
        },
        searchKeywords: ['sigmet'],
    },
    showAirmets: {
        title: 'AIRMETs',
        type: 'toggle',
        value: getSettingValue('sigmets.showAirmets'),
        onChange: value => setSettingByKey('sigmets.showAirmets', value),
        searchKeywords: ['sigmet'],
    },
    raw: {
        title: 'Show raw SIGMET data only',
        type: 'toggle',
        value: getSettingValue('sigmets.raw'),
        onChange: value => setSettingByKey('sigmets.raw', value),
        searchKeywords: ['sigmet'],
    },
})));
