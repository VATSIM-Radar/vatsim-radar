import { getSettingValue, makeSettingsItems, setSettingByKey } from '~/composables/settings/v2/utils';
import type { UserSettingsV2 } from '~/utils/settings/types';

export const settingsItemTraffic = () => makeSettingsItems(({ notLoggedIn }) => ({
    showFullRoute: {
        title: 'Default to full route instead of remaining',
        type: 'toggle',
        value: getSettingValue('map.traffic.showFullRoute'),
        onChange: value => setSettingByKey('map.traffic.showFullRoute', value),
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
    declutter: {
        title: 'Aircraft Declutter',
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
        type: 'toggle',
        value: getSettingValue('map.traffic.highlightEmergency'),
        onChange: value => setSettingByKey('map.traffic.highlightEmergency', value),
    },
}));
