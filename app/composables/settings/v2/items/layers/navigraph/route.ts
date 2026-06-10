import { getSettingValue, makeSettingsItems, setSettingByKey } from '~/composables/settings/v2/utils';

const airportOverlayDisabled = computed(() => !getSettingValue('map.navigraph.routeParsing.enabled').value.value || !getSettingValue('map.navigraph.routeParsing.airportOverlay.enabled').value.value);

export const settingsItemNavigraphRoute = globalComputed(() => makeSettingsItems(() => ({
    enabled: {
        title: 'Enable route parsing',
        searchKeywords: ['navigraph', 'flight plan', 'route'],
        type: 'toggle',
        value: getSettingValue('map.navigraph.routeParsing.enabled'),
        onChange: value => setSettingByKey('map.navigraph.routeParsing.enabled', value),
    },
    enabledOnHover: {
        title: 'Route parsing on hover',
        type: 'toggle',
        value: getSettingValue('map.navigraph.routeParsing.enabledOnHover'),
        onChange: value => setSettingByKey('map.navigraph.routeParsing.enabledOnHover', value),
        disabled: computed(() => !getSettingValue('map.navigraph.routeParsing.enabled').value.value),
    },
    airportOverlayEnabled: {
        title: 'Airport Tracks',
        description: 'Allows to turn on or off airport traffic tracks parsing. It will only be parsed on hover or click',
        searchKeywords: ['sid', 'star', 'procedure', 'route'],
        type: 'toggle',
        value: getSettingValue('map.navigraph.routeParsing.airportOverlay.enabled'),
        onChange: value => setSettingByKey('map.navigraph.routeParsing.airportOverlay.enabled', value),
        disabled: computed(() => !getSettingValue('map.navigraph.routeParsing.enabled').value.value),
    },
    airportOverlaySid: {
        title: 'Auto-SID parsing',
        hint: 'For dashboard/airport only',
        type: 'toggle',
        value: getSettingValue('map.navigraph.routeParsing.airportOverlay.sid'),
        onChange: value => setSettingByKey('map.navigraph.routeParsing.airportOverlay.sid', value),
        disabled: airportOverlayDisabled,
    },
    airportOverlayStar: {
        title: 'Auto-STAR parsing',
        hint: 'For dashboard/airport only',
        type: 'toggle',
        value: getSettingValue('map.navigraph.routeParsing.airportOverlay.star'),
        onChange: value => setSettingByKey('map.navigraph.routeParsing.airportOverlay.star', value),
        disabled: airportOverlayDisabled,
    },
    airportOverlayHolds: {
        title: 'Holdings',
        hint: 'For dashboard/airport only',
        type: 'toggle',
        value: getSettingValue('map.navigraph.routeParsing.airportOverlay.holds'),
        onChange: value => setSettingByKey('map.navigraph.routeParsing.airportOverlay.holds', value),
        disabled: airportOverlayDisabled,
    },
    airportOverlayLabels: {
        title: 'Labels',
        hint: 'For dashboard/airport only',
        type: 'toggle',
        value: getSettingValue('map.navigraph.routeParsing.airportOverlay.labels'),
        onChange: value => setSettingByKey('map.navigraph.routeParsing.airportOverlay.labels', value),
        disabled: airportOverlayDisabled,
    },
    airportOverlayWaypoints: {
        title: 'Waypoints',
        hint: 'For dashboard/airport only',
        type: 'toggle',
        value: getSettingValue('map.navigraph.routeParsing.airportOverlay.waypoints'),
        onChange: value => setSettingByKey('map.navigraph.routeParsing.airportOverlay.waypoints', value),
        disabled: airportOverlayDisabled,
    },
})));
