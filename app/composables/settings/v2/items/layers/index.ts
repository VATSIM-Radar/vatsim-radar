import type { Units } from 'ol/control/ScaleLine.js';
import { getSettingValue, makeSettingsItems, setSettingByKey } from '~/composables/settings/v2/utils';
import type { MapLayoutLayerWithOptions, MapWeatherLayer } from '~/types/map';
import type { UserSettingsV2 } from '~/utils/settings/types';
import { isProductionMode } from '~/utils/shared';
import SettingsDistanceTutorial from '~/components/features/settings/v2/misc/SettingsDistanceTutorial.vue';

type NatTrakDirection = UserSettingsV2['map']['layers']['natTrak']['direction'];

const distanceUnits: Array<{ value: Units | false; text: string }> = [
    { value: false, text: 'Disabled' },
    { value: 'degrees', text: 'Degrees' },
    { value: 'imperial', text: 'Imperial (mi)' },
    { value: 'nautical', text: 'Nautical (NM)' },
    { value: 'metric', text: 'Metric (km)' },
];

const transparencyOptions = (() => {
    const options: Array<{ value: number; text: string }> = [];

    for (let i = 0.1; i <= 1; i += 0.1) {
        options.unshift({
            value: +i.toFixed(2),
            text: `${ Math.round(i * 100) }%`,
        });
    }

    options.unshift({ value: 0.05, text: '5%' });
    options.unshift({ value: 0.07, text: '7%' });
    options.unshift({ value: 0.01, text: '1%' });

    return options.sort((a, b) => b.value - a.value);
})();

const sigmetsTransparencyOptions = transparencyOptions.filter(item => item.value <= 0.5);

export const settingsItemLayers = globalComputed(() => makeSettingsItems(({ store, notLoggedIn }) => ({
    weather: {
        title: 'Weather layer',
        description: 'Shows selected weather overlay on the map. Provided by OpenWeather',
        searchKeywords: ['radar', 'rain', 'clouds', 'wind', 'precipitation'],
        type: 'radio',
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
        onChange: value => setSettingByKey('map.layers.weather', (value === null ? undefined : value) as MapWeatherLayer | null),
    },
    layer: {
        title: 'Map layer',
        description: 'Changes base map layer',
        searchKeywords: ['osm', 'satellite', 'basemap', 'background'],
        type: 'radio',
        items: [
            { value: 'protoData', text: 'Light' },
            { value: 'protoGeneral', text: 'Detailed' },
            { value: 'basic', text: 'Basic' },
            { value: 'Satellite', text: 'Satellite (USA only)' },
            { value: 'SatelliteEsri', text: 'Satellite (Esri)' },
            { value: 'OSM', text: 'OSM (Light theme only)' },
        ].filter(x => !isProductionMode() || x.value !== 'SatelliteEsri'),
        value: getSettingValue('map.layers.layer'),
        onChange: value => setSettingByKey('map.layers.layer', value as MapLayoutLayerWithOptions),
    },
    layerLabels: {
        title: 'Show labels',
        description: 'Shows labels on supported map layers',
        searchKeywords: ['map labels', 'basemap labels'],
        type: 'toggle',
        value: getSettingValue('map.layers.layerLabels'),
        onChange: value => setSettingByKey('map.layers.layerLabels', value),
    },
    relativeIndicator: {
        title: 'Relative distance unit',
        searchKeywords: ['scale', 'distance', 'indicator', 'units'],
        type: 'select',
        items: distanceUnits,
        value: getSettingValue('map.layers.relativeIndicator'),
        onChange: value => setSettingByKey('map.layers.relativeIndicator', value as Units),
    },
    terminator: {
        title: 'Day/Night line',
        searchKeywords: ['terminator', 'sun', 'night', 'daylight'],
        type: 'toggle',
        value: getSettingValue('map.layers.terminator'),
        onChange: value => setSettingByKey('map.layers.terminator', value),
    },
    heatmap: {
        title: 'Traffic Heatmap',
        searchKeywords: ['traffic', 'density'],
        type: 'toggle',
        value: getSettingValue('map.layers.heatmap'),
        onChange: value => setSettingByKey('map.layers.heatmap', value),
    },
    osmTransparency: {
        title: 'OSM opacity',
        type: 'select',
        hidden: computed(() => getSettingValue('map.layers.layer').value.value !== 'OSM'),
        items: transparencyOptions,
        value: getSettingValue('map.layers.transparency.osm'),
        onChange: value => setSettingByKey('map.layers.transparency.osm', value as number),
    },
    satelliteTransparency: {
        title: 'Satellite opacity',
        type: 'select',
        hidden: computed(() => !getSettingValue('map.layers.layer').value.value.includes('Satellite')),
        items: transparencyOptions,
        value: getSettingValue('map.layers.transparency.satellite'),
        onChange: value => setSettingByKey('map.layers.transparency.satellite', value as number),
    },
    weatherDarkTransparency: {
        title: 'Weather opacity',
        type: 'select',
        placeholder: 'Auto',
        items: transparencyOptions,
        hidden: computed(() => store.theme === 'light'),
        value: getSettingValue('map.layers.transparency.weatherDark'),
        onChange: value => setSettingByKey('map.layers.transparency.weatherDark', value as number),
    },
    weatherLightTransparency: {
        title: 'Weather opacity',
        type: 'select',
        items: transparencyOptions,
        placeholder: 'Auto',
        hidden: computed(() => store.theme === 'default'),
        value: getSettingValue('map.layers.transparency.weatherLight'),
        onChange: value => setSettingByKey('map.layers.transparency.weatherLight', value as number),
    },
    sigmetsTransparency: {
        title: 'SIGMETs opacity',
        type: 'select',
        items: sigmetsTransparencyOptions,
        value: getSettingValue('map.layers.transparency.sigmets'),
        onChange: value => setSettingByKey('map.layers.transparency.sigmets', value as number),
    },
    natTrakEnabled: {
        title: 'NAT Tracks',
        searchKeywords: ['north atlantic', 'oceanic', 'tracks'],
        type: 'toggle',
        value: getSettingValue('map.layers.natTrak.enabled'),
        onChange: value => setSettingByKey('map.layers.natTrak.enabled', value),
    },
    natTrakConcorde: {
        title: 'Concorde tracks',
        type: 'toggle',
        value: getSettingValue('map.layers.natTrak.concorde'),
        onChange: value => setSettingByKey('map.layers.natTrak.concorde', value),
        disabled: computed(() => !getSettingValue('map.layers.natTrak.enabled').value.value),
    },
    natTrakDirection: {
        title: 'Tracks Direction',
        type: 'select',
        items: [
            { value: 'all', text: 'All' },
            { value: 'east', text: 'East' },
            { value: 'west', text: 'West' },
            { value: 'both', text: 'Both directions' },
        ],
        value: getSettingValue('map.layers.natTrak.direction'),
        onChange: value => setSettingByKey('map.layers.natTrak.direction', value as NatTrakDirection),
        disabled: computed(() => !getSettingValue('map.layers.natTrak.enabled').value.value),
    },
    distanceEnabled: {
        title: 'Distance tool',
        searchKeywords: ['ruler', 'measure', 'measurement'],
        type: 'toggle',
        value: getSettingValue('map.layers.distance.enabled'),
        onChange: value => setSettingByKey('map.layers.distance.enabled', value),
        appendComponent: SettingsDistanceTutorial,
    },
    distanceUnits: {
        title: 'Distance unit',
        type: 'select',
        items: distanceUnits.filter(item => item.value !== 'degrees' && item.value),
        value: getSettingValue('map.layers.distance.units'),
        onChange: value => setSettingByKey('map.layers.distance.units', value as Units),
        disabled: computed(() => !getSettingValue('map.layers.distance.enabled').value.value),
    },
    distanceInteraction: {
        title: 'Distance interaction',
        description: 'Use CTRL+Click instead of Double Click. Re-enables double-click-to-zoom',
        type: 'radio',
        items: [
            { value: 'dblclick', text: 'Double Click' },
            { value: 'ctrlclick', text: 'CTRL+Click' },
        ],
        value: getSettingValue('map.layers.distance.interaction'),
        onChange: value => setSettingByKey('map.layers.distance.interaction', value as UserSettingsV2['map']['layers']['distance']['interaction']),
        disabled: computed(() => !getSettingValue('map.layers.distance.enabled').value.value),
    },
    vatglassesAutoEnable: {
        title: 'Auto-enable',
        description: 'Enables when you have active flight',
        searchKeywords: ['vatglasses', 'sectors', 'airspace'],
        type: 'toggle',
        value: getSettingValue('map.vatglasses.autoEnable'),
        onChange: value => setSettingByKey('map.vatglasses.autoEnable', value),
        disabled: notLoggedIn,
    },
    vatglassesActive: {
        title: 'Toggle Active',
        searchKeywords: ['vatglasses', 'sectors', 'airspace'],
        type: 'toggle',
        value: getSettingValue('map.vatglasses.active'),
        onChange: value => setSettingByKey('map.vatglasses.active', value),
    },
    vatglassesCombined: {
        title: 'Combined Mode',
        description: 'All sectors at once. Slows down updates depending on your device.',
        searchKeywords: ['vatglasses', 'sectors', 'airspace'],
        type: 'toggle',
        value: getSettingValue('map.vatglasses.combined'),
        onChange: value => setSettingByKey('map.vatglasses.combined', value),
        disabled: computed(() => !getSettingValue('map.vatglasses.active').value.value),
    },
    vatglassesAutoLevel: {
        title: 'Auto-Set Level',
        description: 'Based on your flight',
        searchKeywords: ['vatglasses', 'altitude', 'level'],
        type: 'toggle',
        value: getSettingValue('map.vatglasses.autoLevel'),
        onChange: value => setSettingByKey('map.vatglasses.autoLevel', value),
        disabled: computed(() => !getSettingValue('map.vatglasses.active').value.value),
    },
    bookingsEnabled: {
        title: 'Bookings on map',
        type: 'toggle',
        value: getSettingValue('map.bookings.enabled'),
        onChange: value => setSettingByKey('map.bookings.enabled', value),
    },
    bookingsHours: {
        title: 'Hours in advance for bookings',
        type: 'select',
        items: [
            { value: 0.5, text: '30 min' },
            { value: 1, text: '1h' },
            { value: 2, text: '2h' },
            { value: 3, text: '3h' },
            { value: 4, text: '4h' },
        ],
        value: getSettingValue('map.bookings.hours'),
        onChange: value => setSettingByKey('map.bookings.hours', value as number),
        disabled: computed(() => !getSettingValue('map.bookings.enabled').value.value),
    },
    eventsEnabled: {
        title: 'Events on map',
        type: 'toggle',
        value: getSettingValue('map.events.enabled'),
        onChange: value => setSettingByKey('map.events.enabled', value),
    },
    eventsHours: {
        title: 'Hours in advance for events',
        type: 'select',
        items: [
            { value: 1, text: '1h' },
            { value: 2, text: '2h' },
            { value: 3, text: '3h' },
            { value: 6, text: '6h' },
            { value: 12, text: '12h' },
            { value: 24, text: '24h' },
        ],
        value: getSettingValue('map.events.hours'),
        onChange: value => setSettingByKey('map.events.hours', value as number),
        disabled: computed(() => !getSettingValue('map.events.enabled').value.value),
    },
})));
