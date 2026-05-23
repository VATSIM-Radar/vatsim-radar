import { getSettingValue, makeSettingsItems, setSettingByKey } from '~/composables/settings/v2/utils';

export const settingsItemVisibility = () => makeSettingsItems(({ notLoggedIn }) => ({
    atcFirs: {
        title: 'FIRs',
        type: 'toggle',
        value: getSettingValue('map.visibility.atc.firs'),
        onChange: value => setSettingByKey('map.visibility.atc.firs', value),
    },
    atcApproach: {
        title: 'Approach',
        type: 'toggle',
        value: getSettingValue('map.visibility.atc.approach'),
        onChange: value => setSettingByKey('map.visibility.atc.approach', value),
    },
    atcGround: {
        title: 'Locals',
        type: 'toggle',
        value: getSettingValue('map.visibility.atc.ground'),
        onChange: value => setSettingByKey('map.visibility.atc.ground', value),
    },
    atcLabels: {
        title: 'ATC Labels',
        type: 'toggle',
        value: getSettingValue('map.visibility.atcLabels'),
        onChange: value => setSettingByKey('map.visibility.atcLabels', value),
    },
    airports: {
        title: 'Airports',
        type: 'toggle',
        value: getSettingValue('map.visibility.airports'),
        onChange: value => setSettingByKey('map.visibility.airports', value),
    },
    pilots: {
        title: 'Aircraft',
        type: 'toggle',
        value: getSettingValue('map.visibility.pilots'),
        onChange: value => setSettingByKey('map.visibility.pilots', value),
    },
    gates: {
        title: 'Gates',
        type: 'toggle',
        value: getSettingValue('map.visibility.gates'),
        onChange: value => setSettingByKey('map.visibility.gates', value),
    },
    runways: {
        title: 'Runways',
        type: 'toggle',
        value: getSettingValue('map.visibility.runways'),
        onChange: value => setSettingByKey('map.visibility.runways', value),
    },
    pilotsInfo: {
        title: 'Pilots info',
        type: 'toggle',
        value: getSettingValue('map.visibility.pilotsInfo'),
        onChange: value => setSettingByKey('map.visibility.pilotsInfo', value),
    },
    atcInfo: {
        title: 'Controllers info',
        type: 'toggle',
        value: getSettingValue('map.visibility.atcInfo'),
        onChange: value => setSettingByKey('map.visibility.atcInfo', value),
    },
    pilotLabels: {
        title: 'Pilot labels',
        type: 'toggle',
        value: getSettingValue('map.visibility.pilotLabels'),
        onChange: value => setSettingByKey('map.visibility.pilotLabels', value),
        disabled: computed(() => !getSettingValue('map.visibility.pilots').value.value),
    },
}));
