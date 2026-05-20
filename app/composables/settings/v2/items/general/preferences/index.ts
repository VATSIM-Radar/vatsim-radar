import { getSettingValue, makeSettingsItems } from '~/composables/settings/v2/utils';
import type { SearchFilter } from '~/types/map';

export const settingsItemPreferences = () => makeSettingsItems(({ settingsStore, notLoggedIn }) => ({
    autoFollow: {
        title: 'Auto follow me',
        description: 'Enabling this will auto-follow your flight and enable tracking of it (on map load or when spawned on ground)',
        type: 'toggle',
        value: getSettingValue(() => settingsStore.settings.map?.preferences?.autoFollow, false),
        onChange: value => settingsStore.save({ map: { preferences: { autoFollow: value } } }),
        disabled: notLoggedIn,
    },
    autoZoom: {
        title: 'Auto zoom to me',
        description: 'Enabling this will also auto-zoom to your aircraft position when executing auto follow',
        type: 'toggle',
        value: getSettingValue(() => settingsStore.settings.map?.preferences?.autoZoom, false),
        onChange: value => settingsStore.save({ map: { preferences: { autoZoom: value } } }),
        disabled: computed(() => notLoggedIn.value || !settingsStore.settings.map?.preferences?.autoFollow),
    },
    debugMode: {
        title: 'Debug mode',
        description: 'Enables internal debug menu',
        type: 'toggle',
        value: getSettingValue(() => settingsStore.settings.map?.preferences?.debugMode, false),
        onChange: value => settingsStore.save({ map: { preferences: { debugMode: value } } }),
    },
    featuredDefaultBookmarks: {
        title: 'Default to Bookmarks in Favorite',
        description: 'Opens Bookmarks tab by default instead of Favorite airports in Favorite popup',
        type: 'toggle',
        value: getSettingValue(() => settingsStore.settings.map?.preferences?.featuredDefaultBookmarks, false),
        onChange: value => settingsStore.save({ map: { preferences: { featuredDefaultBookmarks: value } } }),
    },
    skipBookmarkAnimation: {
        title: 'Skip Bookmarks animation',
        description: 'Disables animation when opening Bookmarks',
        type: 'toggle',
        value: getSettingValue(() => settingsStore.settings.map?.preferences?.skipBookmarkAnimation, false),
        onChange: value => settingsStore.save({ map: { preferences: { skipBookmarkAnimation: value } } }),
    },
    showTotalDeparturesInFeaturedAirports: {
        title: 'Total departures in Featured Airports',
        description: 'Shows total departures in Featured Airports instead of on-ground counter',
        type: 'toggle',
        value: getSettingValue(() => settingsStore.settings.map?.preferences?.showTotalDeparturesInFeaturedAirports, false),
        onChange: value => settingsStore.save({ map: { preferences: { showTotalDeparturesInFeaturedAirports: value } } }),
    },
    searchBy: {
        title: 'Map Search categories',
        description: 'Limits what categories Map Search works for',
        type: 'multi-select',
        items: [
            { value: 'atc', text: 'ATC' },
            { value: 'airports', text: 'Airports' },
            { value: 'flights', text: 'Flights' },
        ],
        value: getSettingValue(() => settingsStore.settings.map?.preferences?.searchBy, ['atc', 'airports', 'flights']),
        onChange: _value => {
            let value = _value;

            if (!value.length) value = ['atc', 'airports', 'flights'];

            settingsStore.save({ map: { preferences: { searchBy: value as SearchFilter[] } } });
        },
    },
    searchLimit: {
        title: 'Map Search limit',
        description: 'Limits max count of results in each search category',
        type: 'select',
        items: [
            { value: 5 },
            { value: 10 },
            { value: 20 },
            { value: 50 },
            { value: 75 },
        ],
        value: getSettingValue(() => settingsStore.settings.map?.preferences?.searchLimit, 10),
        onChange: value => settingsStore.save({ map: { preferences: { searchLimit: value as number } } }),
    },
    enableQueryUpdate: {
        title: 'Enable query update',
        description: 'Enables browser URL update with center and zoom changes',
        type: 'toggle',
        value: getSettingValue(() => settingsStore.settings.map?.preferences?.enableQueryUpdate, false),
        onChange: value => settingsStore.save({ map: { preferences: { enableQueryUpdate: value } } }),
    },
}));
