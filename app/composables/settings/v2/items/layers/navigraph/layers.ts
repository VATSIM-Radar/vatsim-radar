import { getSettingValue, makeSettingsItems, setSettingByKey } from '~/composables/settings/v2/utils';
import type { NavigraphSettingsLevel } from '~/utils/server/handlers/map-settings';

export const settingsItemNavigraphLayers = globalComputed(() => makeSettingsItems(({ notLoggedIn }) => ({
    airwaysEnabled: {
        title: 'Airways',
        type: 'toggle',
        value: getSettingValue('map.navigraph.layers.airways.enabled'),
        onChange: value => setSettingByKey('map.navigraph.layers.airways.enabled', value),
    },
    airwaysLabels: {
        title: 'Airways labels',
        type: 'toggle',
        value: getSettingValue('map.navigraph.layers.airways.showAirwaysLabel'),
        onChange: value => setSettingByKey('map.navigraph.layers.airways.showAirwaysLabel', value),
        disabled: computed(() => !getSettingValue('map.navigraph.layers.airways.enabled').value.value),
    },
    airwaysWaypointsLabels: {
        title: 'Airway waypoints labels',
        type: 'toggle',
        value: getSettingValue('map.navigraph.layers.airways.showWaypointsLabel'),
        onChange: value => setSettingByKey('map.navigraph.layers.airways.showWaypointsLabel', value),
        disabled: computed(() => !getSettingValue('map.navigraph.layers.airways.enabled').value.value),
    },
    ndb: {
        title: 'NDB',
        searchKeywords: ['navigraph', 'navaid'],
        type: 'toggle',
        value: getSettingValue('map.navigraph.layers.ndb'),
        onChange: value => setSettingByKey('map.navigraph.layers.ndb', value),
    },
    vordme: {
        title: 'VORDME',
        searchKeywords: ['vor', 'dme', 'navigraph', 'navaid'],
        type: 'toggle',
        value: getSettingValue('map.navigraph.layers.vordme'),
        onChange: value => setSettingByKey('map.navigraph.layers.vordme', value),
    },
    waypoints: {
        title: 'Waypoints',
        type: 'toggle',
        value: getSettingValue('map.navigraph.layers.waypoints'),
        onChange: value => setSettingByKey('map.navigraph.layers.waypoints', value),
    },
    terminalWaypoints: {
        title: 'Terminal Waypoints',
        type: 'toggle',
        value: getSettingValue('map.navigraph.layers.terminalWaypoints'),
        onChange: value => setSettingByKey('map.navigraph.layers.terminalWaypoints', value),
        disabled: computed(() => !getSettingValue('map.navigraph.layers.waypoints').value.value),
    },
    holdings: {
        title: 'Holdings',
        type: 'toggle',
        value: getSettingValue('map.navigraph.layers.holdings'),
        onChange: value => setSettingByKey('map.navigraph.layers.holdings', value),
    },
    ifrAuto: {
        title: 'Automatic IFR level',
        type: 'toggle',
        value: getSettingValue('map.navigraph.layers.ifrAuto'),
        onChange: value => setSettingByKey('map.navigraph.layers.ifrAuto', value),
        disabled: notLoggedIn,
    },
    ifrMode: {
        title: 'IFR level',
        description: 'Affects airways and holdings',
        searchKeywords: ['ifr high', 'ifr low', 'airways', 'holdings'],
        type: 'radio',
        items: [
            { value: 'ifrHigh', text: 'IFR High' },
            { value: 'ifrLow', text: 'IFR Low' },
            { value: 'both', text: 'Both' },
        ],
        value: getSettingValue('map.navigraph.layers.ifrMode'),
        onChange: value => setSettingByKey('map.navigraph.layers.ifrMode', value as NavigraphSettingsLevel),
        disabled: computed(() => getSettingValue('map.navigraph.layers.ifrAuto').value.value),
    },
})));
