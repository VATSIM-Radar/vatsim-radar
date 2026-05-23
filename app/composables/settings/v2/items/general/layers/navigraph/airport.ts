import { getSettingValue, makeSettingsItems, setSettingByKey } from '~/composables/settings/v2/utils';

const airportLayoutsDisabled = computed(() => !getSettingValue('map.navigraph.airport.enabled').value.value);

export const settingsItemNavigraphAirport = globalComputed(() => makeSettingsItems(({ store }) => ({
    enabled: {
        title: 'Navigraph Airports Layouts',
        description: 'Airports Layouts are available to Navigraph Unlimited subscribers only',
        type: 'toggle',
        value: getSettingValue('map.navigraph.airport.enabled'),
        onChange: value => setSettingByKey('map.navigraph.airport.enabled', value),
        disabled: computed(() => !store.user?.hasCharts),
    },
    gatesFallback: {
        title: 'New gates system',
        type: 'toggle',
        value: getSettingValue('map.navigraph.airport.gatesFallback'),
        onChange: value => setSettingByKey('map.navigraph.airport.gatesFallback', value),
        disabled: computed(() => !store.user?.hasCharts),
    },
    taxiways: {
        title: 'Taxiways',
        type: 'toggle',
        value: getSettingValue(() => !getSettingValue('map.navigraph.airport.hideTaxiways').value.value, true),
        onChange: value => setSettingByKey('map.navigraph.airport.hideTaxiways', !value),
        disabled: airportLayoutsDisabled,
    },
    runwayExits: {
        title: 'Runway Exits',
        type: 'toggle',
        value: getSettingValue(() => !getSettingValue('map.navigraph.airport.hideRunwayExit').value.value, true),
        onChange: value => setSettingByKey('map.navigraph.airport.hideRunwayExit', !value),
        disabled: airportLayoutsDisabled,
    },
    gateGuidance: {
        title: 'Gate Guidance',
        type: 'toggle',
        value: getSettingValue(() => !getSettingValue('map.navigraph.airport.hideGateGuidance').value.value, true),
        onChange: value => setSettingByKey('map.navigraph.airport.hideGateGuidance', !value),
        disabled: airportLayoutsDisabled,
    },
    deicing: {
        title: 'Deicing Pads',
        type: 'toggle',
        value: getSettingValue(() => !getSettingValue('map.navigraph.airport.hideDeicing').value.value, true),
        onChange: value => setSettingByKey('map.navigraph.airport.hideDeicing', !value),
        disabled: airportLayoutsDisabled,
    },
})));
