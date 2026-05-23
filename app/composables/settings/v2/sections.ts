import type { SettingsMenuGroup } from './types';
import PersonIcon from '~/assets/icons/kit/person.svg?component';
import DisplaySettingsIcon from '~/assets/icons/kit/display-settings.svg?component';
import MapSettingsIcon from '~/assets/icons/kit/map-settings.svg?component';
import { settingsItemAccount } from '~/composables/settings/v2/items/account';
import { settingsItemPreferences } from '~/composables/settings/v2/items/general/preferences';
import { settingsItemAppearance } from '~/composables/settings/v2/items/general/appearance';
import { settingsItemPreferencesAircraft } from '~/composables/settings/v2/items/general/preferences/aircraft';
import { settingsDefaultValues } from '~/composables/settings/v2/utils';
import { settingsItemAppearanceColors } from '~/composables/settings/v2/items/general/appearance/colors';
import { settingsItemLayers } from '~/composables/settings/v2/items/layers';
import { settingsItemSigmets } from '~/composables/settings/v2/items/layers/sigmets';
import { settingsItemVisibility } from '~/composables/settings/v2/items/layers/visibility';
import { settingsItemNavigraph } from '~/composables/settings/v2/items/layers/navigraph';
import { settingsItemNavigraphAirport } from '~/composables/settings/v2/items/layers/navigraph/airport';
import { settingsItemNavigraphLayers } from '~/composables/settings/v2/items/layers/navigraph/layers';
import { settingsItemNavigraphRoute } from '~/composables/settings/v2/items/layers/navigraph/route';
import { settingsItemPreferencesAirports } from '~/composables/settings/v2/items/general/preferences/airports';
import { settingsItemTraffic } from '~/composables/settings/v2/items/general/preferences/traffic';
import { aircraftStatusColors } from '~/composables/vatsim/pilots';

export const getSettingsItems = globalComputed(() => {
    return {
        account: settingsItemAccount().value,
        appearance: {
            ...settingsItemAppearance().value,
            colors: settingsItemAppearanceColors().value,
        },
        layers: {
            ...settingsItemLayers().value,
            sigmets: settingsItemSigmets().value,
            visibility: settingsItemVisibility().value,
            navigraph: {
                ...settingsItemNavigraph().value,
                airports: settingsItemNavigraphAirport().value,
                layers: settingsItemNavigraphLayers().value,
                route: settingsItemNavigraphRoute().value,
            },
        },
        preferences: {
            ...settingsItemPreferences().value,
            aircraft: settingsItemPreferencesAircraft().value,
            airports: settingsItemPreferencesAirports().value,
            traffic: settingsItemTraffic().value,
        },
    };
});

export const getSettingsSections = () => {
    const store = useStore();
    const notLoggedIn = computed(() => !store.user);

    const aircraftColors = aircraftStatusColors;

    const aircraftOptions = ['ground', 'active', 'green', 'hover', 'landed', 'arriving', 'departing'] satisfies MapAircraftStatus[];

    for (const option of aircraftOptions) {
        settingsDefaultValues[`map.preferences.colors.default.aircraft.${ option }`] = { color: aircraftColors[option] };
    }

    const items = getSettingsItems().value;

    return [
        {
            title: 'Account Settings',
            url: 'account',
            icon: PersonIcon,
            sections: [
                {
                    title: 'Account',
                    url: '',
                    items: [
                        {
                            key: 'account',
                            items: [items.account.account],
                            hide: notLoggedIn,
                        },
                        {
                            title: 'Privacy',
                            key: 'privacy',
                            items: [items.preferences.headerName, items.account.privateMode],
                            hide: notLoggedIn,
                        },
                        {
                            title: 'Navigraph Account',
                            key: 'navigraph',
                            items: [items.account.navigraph],
                            hide: notLoggedIn,
                        },
                        {
                            title: 'Interface',
                            key: 'interface',
                            items: [items.account.theme],
                        },
                    ],
                },
                {
                    title: 'Preferences',
                    url: 'preferences',
                    items: [
                        {
                            key: 'preferences',
                            items: [items.preferences.timeFormat, items.preferences.eventsLocalTimezone, items.preferences.bookingsLocalTimezone, items.preferences.notamsSortBy, items.preferences.favoriteSort],
                        },
                    ],
                },
            ],
        },
        {
            title: 'Map Settings',
            url: 'map',
            icon: DisplaySettingsIcon,
            sections: [
                {
                    title: 'Preferences',
                    url: '',
                    items: [
                        {
                            key: 'preferences',
                            items: [items.preferences.autoFollow, items.preferences.autoZoom, items.preferences.enableQueryUpdate, items.appearance.overlaysPositions, items.preferences.airports.defaultZoomLevel],
                        },
                        {
                            key: 'favorite',
                            title: 'Featured and Favorite',
                            items: [items.preferences.featuredDefaultBookmarks, items.preferences.skipBookmarkAnimation, items.preferences.showTotalDeparturesInFeaturedAirports],
                        },
                        {
                            key: 'search',
                            title: 'Search',
                            items: [items.preferences.searchBy, items.preferences.searchLimit],
                        },
                        {
                            key: 'debug',
                            items: [items.preferences.debugMode],
                        },
                    ],
                },
                {
                    title: 'Colors & Appearance',
                    url: 'appearance',
                    items: [
                        {
                            key: 'appearance',
                            items: [items.appearance.overlaysPositions],
                        },
                        {
                            key: 'tracks',
                            items: [items.appearance.colors.turns, items.appearance.colors.turnsTransparency],
                        },
                        {
                            key: 'colors',
                            title: 'Colors',
                            items: Object.entries(items.appearance.colors).filter(x => !x[0].startsWith('turns')).map(x => x[1]),
                        },
                    ],
                },
                {
                    title: 'Aircraft',
                    url: 'aircraft',
                    items: [
                        {
                            key: 'aircraft',
                            items: [items.preferences.aircraft.shortView, items.preferences.traffic.highlightEmergency, items.preferences.aircraft.showLimit, items.preferences.aircraft.dynamicScale, items.preferences.aircraft.scale],
                        },
                        {
                            key: 'tracks',
                            title: 'Tracks',
                            items: [items.preferences.aircraft.tracksMode, items.preferences.aircraft.tracksShowLimit, items.preferences.aircraft.showOutOfBounds],
                        },
                        {
                            key: 'Overlays',
                            title: 'Overlays',
                            items: [items.preferences.traffic.showFullRoute, items.preferences.traffic.toggleAircraftOverlays, items.preferences.traffic.autoShowAirportTracks],
                        },
                        {
                            key: 'traffic',
                            title: 'Traffic',
                            items: [items.preferences.traffic.disableFastUpdate],
                        },
                    ],
                },
                {
                    title: 'Airports',
                    url: 'airports',
                    items: [
                        {
                            key: '',
                            items: [items.preferences.airports.defaultZoomLevel, items.preferences.airports.shortView],
                        },
                        {
                            key: 'display',
                            title: 'Display Options',
                            items: [items.preferences.airports.showMode, items.preferences.airports.declutterIf, items.preferences.airports.ATISAsUnstaffed, items.preferences.airports.showLimit],
                        },
                        {
                            key: 'traffic',
                            title: 'Ground Traffic Options',
                            items: [items.preferences.airports.groundTrafficHide, items.preferences.airports.groundTrafficExcludeMyLocation, items.preferences.airports.groundTrafficExcludeMyArrival],
                        },
                        {
                            key: 'counters',
                            title: 'Traffic Counter',
                            items: [items.preferences.airports.countersEnabled, items.preferences.airports.countersDeparturesMode, items.preferences.airports.countersSyncDeparturesArrivals, items.preferences.airports.countersArrivalsMode, items.preferences.airports.countersDisableTraining],
                        },
                        {
                            key: 'overlays',
                            title: 'Overlay Settings',
                            items: [items.preferences.traffic.autoShowAirportTracks],
                        },
                    ],
                },
            ],
        },
        {
            title: 'Map Layers',
            url: 'layers',
            icon: MapSettingsIcon,
            sections: [
                {
                    title: 'Preferences',
                    url: '',
                    items: [
                        {
                            key: 'preferences',
                            items: [items.preferences.autoFollow, items.preferences.autoZoom, items.preferences.enableQueryUpdate, items.preferences.debugMode],
                        },
                        {
                            key: 'favorite',
                            title: 'Featured and Favorite',
                            items: [items.preferences.featuredDefaultBookmarks, items.preferences.skipBookmarkAnimation, items.preferences.showTotalDeparturesInFeaturedAirports],
                        },
                        {
                            key: 'search',
                            title: 'Search',
                            items: [items.preferences.searchBy, items.preferences.searchLimit],
                        },
                    ],
                },
                {
                    title: 'Appearance',
                    url: 'appearance',
                    items: [
                        {
                            key: 'appearance',
                            items: [
                                items.appearance.overlaysPositions,
                                items.preferences.airports.shortView,
                            ],
                        },
                        {
                            key: 'aircraft',
                            title: 'Aircraft',
                            items: [
                                items.preferences.aircraft.shortView,
                                items.preferences.aircraft.dynamicScale,
                                items.preferences.aircraft.scale,
                            ],
                        },
                    ],
                },
            ],
        },
    ] satisfies SettingsMenuGroup[] as SettingsMenuGroup[];
};
