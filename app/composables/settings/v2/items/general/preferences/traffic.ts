import { getSettingValue, makeSettingsItems, setSettingByKey } from '~/composables/settings/v2/utils';
import type { UserSettingsV2 } from '~/utils/settings/types';

export const settingsItemTraffic = globalComputed(() => makeSettingsItems(({ notLoggedIn }) => ({
    showFullRoute: {
        title: 'Default to full route instead of remaining',
        description: 'Shows aircraft full route on map, instead of only remaining',
        type: 'toggle',
        value: getSettingValue('map.traffic.showFullRoute'),
        onChange: value => setSettingByKey('map.traffic.showFullRoute', value),
    },
    showRouteDetails: {
        title: 'Show all route details',
        description: 'Shows miles remaining and other information without need to hover over it in overlay',
        type: 'toggle',
        value: getSettingValue('map.traffic.showRouteDetails'),
        onChange: value => setSettingByKey('map.traffic.showRouteDetails', value),
    },
    toggleAircraftOverlays: {
        title: 'Fast open multiple aircraft',
        description: 'By default, you have to pin aircraft overlay to keep it open - it will close otherwise. With this setting, it will stay open, and others will open minified.',
        type: 'toggle',
        value: getSettingValue('map.traffic.toggleAircraftOverlays'),
        onChange: value => setSettingByKey('map.traffic.toggleAircraftOverlays', value),
    },
    autoShowAirportTracks: {
        title: 'Auto-show airport tracks',
        description: 'Enabling this will auto-show aircraft tracks for any airport overlay you open.',
        type: 'toggle',
        value: getSettingValue('map.traffic.autoShowAirportTracks'),
        onChange: value => setSettingByKey('map.traffic.autoShowAirportTracks', value),
    },
    disableFastUpdate: {
        title: 'Disable fast update',
        description: 'Sets update to once per 15 seconds. Expected delay from 15 to 30 seconds, but it will consume much less traffic',
        type: 'toggle',
        value: getSettingValue('map.traffic.disableFastUpdate'),
        onChange: value => setSettingByKey('map.traffic.disableFastUpdate', value),
    },
    smoothMovement: {
        title: 'Smooth aircraft movement',
        description: 'Animates aircraft between position updates using a spline instead of jumping. Renders ~2s behind real time so positions stay accurate. Uses a bit more CPU.',
        searchKeywords: ['interpolate', 'interpolation', 'animation', 'spline'],
        type: 'toggle',
        value: getSettingValue('map.traffic.smoothMovement'),
        onChange: value => setSettingByKey('map.traffic.smoothMovement', value),
    },
    declutter: {
        title: 'Aircraft Declutter',
        searchKeywords: ['labels', 'overlap', 'hide'],
        type: 'select',
        items: [
            { text: 'Disabled', value: false },
            { text: 'Enabled (when many)', value: true },
            { text: 'Enabled (always)', value: 'always' },
        ],
        value: getSettingValue('map.traffic.declutter'),
        onChange: value => setSettingByKey('map.traffic.declutter', value as UserSettingsV2['map']['traffic']['declutter']),
    },
    highlightEmergency: {
        title: 'Highlight Emergencies',
        description: 'Emergencies are aircraft squawking 7700 and 7600',
        searchKeywords: ['squawk', '7700', '7600', '7500'],
        type: 'toggle',
        value: getSettingValue('map.traffic.highlightEmergency'),
        onChange: value => setSettingByKey('map.traffic.highlightEmergency', value),
    },
    showAirlineLogos: {
        title: 'Show airline logos',
        description: 'Displays airline logo next to aircraft callsign in overlay header',
        type: 'toggle',
        value: getSettingValue('map.traffic.showAirlineLogos'),
        onChange: value => setSettingByKey('map.traffic.showAirlineLogos', value),
    },
    showCountryFlags: {
        title: 'Show country flags',
        description: 'Displays country flag next to aircraft callsign in overlay header',
        type: 'toggle',
        value: getSettingValue('map.traffic.showCountryFlags'),
        onChange: value => setSettingByKey('map.traffic.showCountryFlags', value),
    },
    showRegistrationFlags: {
        title: 'Show registration flags',
        description: 'Displays country flag next to aircraft registration in flight plan',
        type: 'toggle',
        value: getSettingValue('map.traffic.showRegistrationFlags'),
        onChange: value => setSettingByKey('map.traffic.showRegistrationFlags', value),
    },
})));
