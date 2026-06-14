import { getSettingValue, makeSettingsItems, setSettingByKey } from '~/composables/settings/v2/utils';
import type { NotamsSortBy, SearchFilter } from '~/types/map';
import type { UserSettingsV2 } from '~/utils/settings/types';

export const settingsItemPreferences = globalComputed(() => makeSettingsItems(({ settingsStore, notLoggedIn }) => ({
    headerName: {
        title: 'Header Name',
        description: 'Customize shown header name. Default: your real name',
        type: 'text',
        placeholder: 'My Custom Name',
        value: getSettingValue('appearance.headerName'),
        onChange: value => setSettingByKey('appearance.headerName', value ?? undefined),
    },
    timeFormat: {
        title: 'Time format',
        description: 'Changes time display between 12-hour and 24-hour formats',
        type: 'select',
        items: [
            { value: '12h' },
            { value: '24h' },
        ],
        value: getSettingValue('appearance.timeFormat'),
        onChange: value => setSettingByKey('appearance.timeFormat', value as UserSettingsV2['appearance']['timeFormat']),
    },
    eventsLocalTimezone: {
        title: 'Events local time',
        description: 'Shows VATSIM Events in your local timezone instead of Zulu time',
        searchKeywords: ['utc', 'timezone', 'local', 'zulu'],
        type: 'toggle',
        value: getSettingValue('appearance.eventsLocalTimezone'),
        onChange: value => setSettingByKey('appearance.eventsLocalTimezone', value),
    },
    bookingsLocalTimezone: {
        title: 'Bookings local time',
        description: 'Shows ATC bookings in your local timezone instead of Zulu time',
        searchKeywords: ['utc', 'timezone', 'local', 'zulu', 'atc'],
        type: 'toggle',
        value: getSettingValue('appearance.bookingsLocalTimezone'),
        onChange: value => setSettingByKey('appearance.bookingsLocalTimezone', value),
    },
    notamsSortBy: {
        title: 'NOTAMs sort',
        description: 'Default sorting for airport NOTAMs',
        searchKeywords: ['notam', 'sort', 'airport'],
        type: 'select',
        placeholder: 'Choose sort',
        items: [
            { value: 'startDesc', text: 'Effective From (newest, default)' },
            { value: 'startAsc', text: 'Effective From (oldest)' },
            { value: 'endAsc', text: 'Effective To (oldest)' },
            { value: 'endDesc', text: 'Effective To (newest)' },
        ],
        value: getSettingValue('appearance.notamsSortBy'),
        onChange: value => setSettingByKey('appearance.notamsSortBy', value as NotamsSortBy | null),
    },
    favoriteSort: {
        title: 'Favorite list sort',
        description: 'Changes default sorting for favorite lists',
        searchKeywords: ['friends', 'list', 'sort'],
        placeholder: 'Choose sort',
        type: 'select',
        items: [
            { text: 'Newest first', value: 'newest' },
            { text: 'Oldest first', value: 'oldest' },
            { text: 'Name (ASC)', value: 'abcAsc' },
            { text: 'Name (DESC)', value: 'abcDesc' },
            { text: 'CID (ASC)', value: 'cidAsc' },
            { text: 'CID (DESC)', value: 'cidDesc' },
        ],
        value: getSettingValue('appearance.favoriteSort'),
        onChange: value => setSettingByKey('appearance.favoriteSort', value as UserSettingsV2['appearance']['favoriteSort']),
    },
    autoFollow: {
        title: 'Auto follow me',
        description: 'Enabling this will auto-follow your flight and enable tracking of it (on map load or when spawned on ground)',
        type: 'toggle',
        value: getSettingValue('map.preferences.autoFollow'),
        onChange: value => setSettingByKey('map.preferences.autoFollow', value),
        disabled: notLoggedIn,
    },
    autoZoom: {
        title: 'Auto zoom to me',
        description: 'Enabling this will also auto-zoom to your aircraft position when executing auto follow',
        type: 'toggle',
        value: getSettingValue('map.preferences.autoZoom'),
        onChange: value => setSettingByKey('map.preferences.autoZoom', value),
        disabled: computed(() => notLoggedIn.value || !getSettingValue('map.preferences.autoFollow').value.value),
    },
    debugMode: {
        title: 'Debug mode',
        description: 'Enables internal debug menu',
        type: 'toggle',
        value: getSettingValue('map.preferences.debugMode'),
        onChange: value => setSettingByKey('map.preferences.debugMode', value),
    },
    featuredDefaultBookmarks: {
        title: 'Default to Bookmarks in Favorite',
        description: 'Opens Bookmarks tab by default instead of Favorite airports in Favorite popup',
        type: 'toggle',
        value: getSettingValue('map.preferences.featuredDefaultBookmarks'),
        onChange: value => setSettingByKey('map.preferences.featuredDefaultBookmarks', value),
    },
    skipBookmarkAnimation: {
        title: 'Skip Bookmarks animation',
        description: 'Disables animation when opening Bookmarks',
        type: 'toggle',
        value: getSettingValue('map.preferences.skipBookmarkAnimation'),
        onChange: value => setSettingByKey('map.preferences.skipBookmarkAnimation', value),
    },
    showTotalDeparturesInFeaturedAirports: {
        title: 'Total departures in Featured Airports',
        description: 'Shows total departures in Featured Airports instead of on-ground counter',
        type: 'toggle',
        value: getSettingValue('map.preferences.showTotalDeparturesInFeaturedAirports'),
        onChange: value => setSettingByKey('map.preferences.showTotalDeparturesInFeaturedAirports', value),
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
        value: getSettingValue('map.preferences.searchBy'),
        onChange: _value => {
            let value = _value;

            if (!value?.length) value = undefined;

            setSettingByKey('map.preferences.searchBy', value as SearchFilter[]);
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
        value: getSettingValue('map.preferences.searchLimit'),
        onChange: value => setSettingByKey('map.preferences.searchLimit', value as number),
    },
    enableQueryUpdate: {
        title: 'Enable query update',
        description: 'Enables browser URL update with center and zoom changes',
        searchKeywords: ['url', 'link', 'share', 'browser'],
        type: 'toggle',
        value: getSettingValue('map.preferences.enableQueryUpdate'),
        onChange: value => setSettingByKey('map.preferences.enableQueryUpdate', value),
    },
})));
