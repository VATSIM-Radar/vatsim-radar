import { getSettingValue, makeSettingsItems, setSettingByKey } from '~/composables/settings/v2/utils';

const airportLayoutsDisabled = computed(() => !getSettingValue('map.navigraph.airport.enabled').value.value);

export const settingsItemNavigraphAirport = globalComputed(() => makeSettingsItems(({ store }) => ({
    enabled: {
        title: 'Navigraph Airports Layouts',
        description: 'Airports Layouts are available to Navigraph Unlimited subscribers only',
        searchKeywords: ['gates', 'taxiways', 'runway exits', 'airport layout'],
        type: 'toggle',
        value: getSettingValue('map.navigraph.airport.enabled'),
        onChange: value => setSettingByKey('map.navigraph.airport.enabled', value),
        disabled: computed(() => !store.user?.hasCharts),
    },
    taxiways: {
        title: 'Taxiways',
        type: 'toggle',
        value: getSettingValue('map.navigraph.airport.taxiways'),
        onChange: value => setSettingByKey('map.navigraph.airport.taxiways', value),
        disabled: airportLayoutsDisabled,
    },
    runwayExits: {
        title: 'Runway Exits',
        type: 'toggle',
        value: getSettingValue('map.navigraph.airport.runwayExit'),
        onChange: value => setSettingByKey('map.navigraph.airport.runwayExit', value),
        disabled: airportLayoutsDisabled,
    },
    gateGuidance: {
        title: 'Gate Guidance',
        type: 'toggle',
        value: getSettingValue('map.navigraph.airport.gateGuidance'),
        onChange: value => setSettingByKey('map.navigraph.airport.gateGuidance', value),
        disabled: airportLayoutsDisabled,
    },
    deicing: {
        title: 'Deicing Pads',
        type: 'toggle',
        value: getSettingValue('map.navigraph.airport.deicing'),
        onChange: value => setSettingByKey('map.navigraph.airport.deicing', value),
        disabled: airportLayoutsDisabled,
    },
})));
