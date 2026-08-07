import { getSettingValue, makeSettingsItems, setSettingByKey } from '~/composables/settings/v2/utils';
import type { UserSettingsV2 } from '~/utils/settings/types';

type AirportPreferences = UserSettingsV2['map']['preferences']['airports'];
type AirportCounterMode = NonNullable<AirportPreferences['counters']['departuresMode']>;
type AirportHorizontalCounterMode = NonNullable<AirportPreferences['counters']['horizontalCounter']>;

const airportCounterItems: Array<{ value: AirportCounterMode; text: string }> = [
    { value: 'total', text: 'Total departures' },
    { value: 'totalMoving', text: 'Total departures (moving only)' },
    { value: 'totalLanded', text: 'Total departures (not parked)' },
    { value: 'airborne', text: 'Airborne departures' },
    { value: 'ground', text: 'Departing (default)' },
    { value: 'groundMoving', text: 'Departing (moving only)' },
    { value: 'hide', text: 'Hide' },
];

const airportArrivalCounterItems: Array<{ value: AirportCounterMode; text: string }> = [
    { value: 'total', text: 'Total arrivals' },
    { value: 'totalMoving', text: 'Total arrivals (moving only)' },
    { value: 'totalLanded', text: 'Total arrivals (not parked)' },
    { value: 'airborne', text: 'Airborne arrivals' },
    { value: 'ground', text: 'Landed (default)' },
    { value: 'groundMoving', text: 'Landed (moving only)' },
    { value: 'hide', text: 'Hide' },
];

const horizontalCounterItems: Array<{ value: AirportHorizontalCounterMode; text: string }> = [
    { value: 'total', text: 'Total airport traffic' },
    { value: 'prefiles', text: 'Prefiles (default)' },
    { value: 'ground', text: 'Ground' },
    { value: 'groundMoving', text: 'Ground (moving only)' },
    { value: 'hide', text: 'Hide' },
];

const airportLimitItems = [
    { value: 10 },
    { value: 25 },
    { value: 50 },
    { value: 75 },
    { value: 100 },
    { value: 150 },
    { value: 200 },
    { value: 300 },
    { value: 400 },
    { value: 500 },
    { value: 1000 },
];

export const settingsItemPreferencesAirports = globalComputed(() => makeSettingsItems(({ notLoggedIn }) => ({
    defaultZoomLevel: {
        title: 'Default airport zoom level',
        description: 'Changes zoom level used when opening an airport on the map',
        type: 'select',
        items: [
            { value: 10 },
            { value: 11 },
            { value: 12 },
            { value: 13 },
            { value: 14 },
            { value: 15 },
            { value: 16 },
        ],
        value: getSettingValue('map.preferences.airports.defaultZoomLevel'),
        onChange: value => setSettingByKey('map.preferences.airports.defaultZoomLevel', value as number),
    },
    shortView: {
        title: 'Short facilities view',
        description: 'Shows airport facilities as lines',
        type: 'radio',
        items: [
            { value: true, text: 'Always' },
            { value: false, text: 'Auto' },
            { value: 'never', text: 'Never' },
        ],
        value: getSettingValue('map.preferences.airports.shortView'),
        onChange: value => setSettingByKey('map.preferences.airports.shortView', value as any),
    },
    showMode: {
        title: 'Display mode',
        description: 'Controls which airports are shown on the map',
        type: 'select',
        items: [
            { text: 'All with at least one aircraft or ATC', value: 'all' },
            { text: 'All existing airports', value: 'allExisting' },
            { text: 'Staffed only', value: 'staffedOnly' },
            { text: 'Staffed or has ground traffic', value: 'staffedAndGroundTraffic' },
        ],
        value: getSettingValue('map.preferences.airports.showMode'),
        onChange: value => setSettingByKey('map.preferences.airports.showMode', value as AirportPreferences['showMode']),
    },
    declutterIf: {
        title: 'Hide airports on zoom',
        description: 'Controls airport decluttering when map labels overlap',
        type: 'select',
        items: [
            { text: 'Unstaffed only (default)', value: 'unstaffed' },
            { text: 'Always', value: 'all' },
            { text: 'Never', value: 'none' },
        ],
        value: getSettingValue('map.preferences.airports.declutterIf'),
        onChange: value => setSettingByKey('map.preferences.airports.declutterIf', value as AirportPreferences['declutterIf']),
    },
    ATISAsUnstaffed: {
        title: 'Hide info when only ATIS',
        description: 'Hides ATIS icon when airport only has ATIS',
        searchKeywords: ['atis', 'unstaffed', 'airport'],
        type: 'toggle',
        value: getSettingValue('map.preferences.airports.ATISAsUnstaffed'),
        onChange: value => setSettingByKey('map.preferences.airports.ATISAsUnstaffed', value),
    },
    voiceButton: {
        title: 'Show "Listen to callsign" button in on-hover info',
        searchKeywords: ['listen', 'voice', 'icon'],
        type: 'toggle',
        value: getSettingValue('map.preferences.airports.voiceButton'),
        onChange: value => setSettingByKey('map.preferences.airports.voiceButton', value),
    },
    groundTrafficHide: {
        title: 'Ground traffic mode',
        description: 'Controls when ground traffic is hidden on the map',
        type: 'select',
        items: [
            { text: 'Hide all', value: 'always' },
            { text: 'Hide if zoomed out', value: 'lowZoom' },
            { text: 'Show all', value: 'never' },
        ],
        value: getSettingValue('map.preferences.airports.groundTraffic.hide'),
        onChange: value => setSettingByKey('map.preferences.airports.groundTraffic.hide', value as AirportPreferences['groundTraffic']['hide']),
    },
    groundTrafficExcludeMyLocation: {
        title: 'Apply to current',
        description: 'By default, we still show traffic for airport you are currently in',
        searchKeywords: ['ground traffic', 'current airport', 'own aircraft'],
        type: 'toggle',
        value: getSettingValue('map.preferences.airports.groundTraffic.excludeMyLocation'),
        onChange: value => setSettingByKey('map.preferences.airports.groundTraffic.excludeMyLocation', value),
        disabled: computed(() => notLoggedIn.value || getSettingValue('map.preferences.airports.groundTraffic.hide').value.value === 'never'),
    },
    groundTrafficExcludeMyArrival: {
        title: 'Apply to arrival',
        description: 'By default, we still show traffic for airport you are flying to',
        searchKeywords: ['ground traffic', 'arrival airport', 'destination'],
        type: 'toggle',
        value: getSettingValue('map.preferences.airports.groundTraffic.excludeMyArrival'),
        onChange: value => setSettingByKey('map.preferences.airports.groundTraffic.excludeMyArrival', value),
        disabled: computed(() => notLoggedIn.value || getSettingValue('map.preferences.airports.groundTraffic.hide').value.value === 'never'),
    },
    departuresCountInOverlay: {
        title: 'Departures count in overlay',
        description: 'Shows total departures in airport overlay instead of on-ground counter',
        type: 'toggle',
        value: getSettingValue('map.preferences.airports.departuresCountInOverlay'),
        onChange: value => setSettingByKey('map.preferences.airports.departuresCountInOverlay', value),
    },
    countersEnabled: {
        title: 'Show Airports Counters',
        type: 'toggle',
        value: getSettingValue('map.preferences.airports.counters.enabled'),
        onChange: value => setSettingByKey('map.preferences.airports.counters.enabled', value),
    },
    countersDeparturesMode: {
        title: 'Departures Mode',
        type: 'select',
        items: airportCounterItems,
        value: getSettingValue('map.preferences.airports.counters.departuresMode'),
        onChange: value => setSettingByKey('map.preferences.airports.counters.departuresMode', value as AirportCounterMode),
        disabled: computed(() => !getSettingValue('map.preferences.airports.counters.enabled').value.value),
    },
    countersSyncDeparturesArrivals: {
        title: 'Sync arrivals mode with departures',
        type: 'toggle',
        value: getSettingValue('map.preferences.airports.counters.syncDeparturesArrivals'),
        onChange: value => setSettingByKey('map.preferences.airports.counters.syncDeparturesArrivals', value),
        disabled: computed(() => !getSettingValue('map.preferences.airports.counters.enabled').value.value),
    },
    countersArrivalsMode: {
        title: 'Arrivals Mode',
        type: 'select',
        items: airportArrivalCounterItems,
        value: getSettingValue('map.preferences.airports.counters.arrivalsMode'),
        onChange: value => setSettingByKey('map.preferences.airports.counters.arrivalsMode', value as AirportCounterMode),
        disabled: computed(() => !getSettingValue('map.preferences.airports.counters.enabled').value.value || getSettingValue('map.preferences.airports.counters.syncDeparturesArrivals').value.value),
    },
    countersHorizontalCounter: {
        title: 'Horizontal (prefiles)',
        searchKeywords: ['prefile', 'counter', 'airport traffic'],
        type: 'select',
        items: horizontalCounterItems,
        value: getSettingValue('map.preferences.airports.counters.horizontalCounter'),
        onChange: value => setSettingByKey('map.preferences.airports.counters.horizontalCounter', value as AirportHorizontalCounterMode),
        disabled: computed(() => !getSettingValue('map.preferences.airports.counters.enabled').value.value),
    },
    countersDisableTraining: {
        title: 'Hide Locals Counter',
        description: 'Hides counter with aircraft on ground with same departure-arrival',
        type: 'toggle',
        value: getSettingValue('map.preferences.airports.counters.disableTraining'),
        onChange: value => setSettingByKey('map.preferences.airports.counters.disableTraining', value),
        disabled: computed(() => !getSettingValue('map.preferences.airports.counters.enabled').value.value),
    },
    showLimit: {
        title: 'Show Limit',
        description: 'Removes dots, counters and other stuff if airports on map exceed this value',
        type: 'select',
        items: airportLimitItems,
        value: getSettingValue('map.preferences.airports.showLimit'),
        onChange: value => setSettingByKey('map.preferences.airports.showLimit', value as number),
        disabled: computed(() => !getSettingValue('map.preferences.airports.counters.enabled').value.value),
    },
})));
