import type { SettingsItemDefault, SettingsMenuGroup } from './types';
import PersonIcon from '~/assets/icons/kit/person.svg?component';
import DisplaySettingsIcon from '~/assets/icons/kit/display-settings.svg?component';
import MapSettingsIcon from '~/assets/icons/kit/map-settings.svg?component';
import { settingsItemAccount } from '~/composables/settings/v2/items/account';
import { settingsItemPreferences } from '~/composables/settings/v2/items/general/preferences';
import { settingsItemAppearance } from '~/composables/settings/v2/items/general/appearance';
import { settingsItemPreferencesAircraft } from '~/composables/settings/v2/items/general/preferences/aircraft';
import { getSettingValue, setSettingByKey } from '~/composables/settings/v2/utils';
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
import SaveIcon from 'assets/icons/kit/save.svg?component';
import SettingsManagement from '~/components/features/settings/v2/misc/SettingsManagement.vue';
import SettingsRecommendedPerformance from '~/components/features/settings/v2/misc/SettingsRecommendedPerformance.vue';
import { isApp } from '~/composables';
import { settingsItemApplication } from '~/composables/settings/v2/items/account/application';

export const getSettingsItems = globalComputed(() => {
    return {
        account: {
            ...settingsItemAccount().value,
            application: settingsItemApplication().value,
        },
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

    const items = getSettingsItems().value;
    const routeParsingItems = [
        items.layers.navigraph.route.airportOverlayEnabled,
        items.layers.navigraph.route.dashedLine,
        items.layers.navigraph.route.hideLineIfNoProcedure,
        items.layers.navigraph.route.airportOverlaySid,
        items.layers.navigraph.route.airportOverlayStar,
        items.layers.navigraph.route.airportOverlayHolds,
        items.layers.navigraph.route.airportOverlayLabels,
        items.layers.navigraph.route.airportOverlayWaypoints,
    ];

    return [
        {
            title: 'General Settings',
            url: 'general',
            icon: PersonIcon,
            sections: [
                {
                    title: 'Account',
                    url: '',
                    hide: notLoggedIn,
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
                    ],
                },
                {
                    title: 'Time & Sorting',
                    url: 'preferences',
                    items: [
                        {
                            key: 'preferences',
                            items: [items.preferences.timeFormat, items.preferences.eventsLocalTimezone, items.preferences.bookingsLocalTimezone, items.preferences.notamsSortBy, items.preferences.favoriteSort],
                        },
                    ],
                },
                {
                    title: 'Favorite Lists',
                    url: 'favorite',
                    items: [{
                        key: 'favorite',
                        items: [items.account.favorite],
                    }],
                },
                {
                    title: 'Application Settings',
                    url: 'application',
                    hide: computed(() => !isApp.value),
                    items: [
                        {
                            key: 'application',
                            title: 'Discord Presence',
                            description: 'Want to highlight your activity? Toggle these on!',
                            items: [items.account.application.pilotPresence, items.account.application.atcPresence, items.account.application.observerPresence, items.account.application.offlinePresence],
                        },
                        {
                            key: 'general',
                            title: 'General App Settings',
                            description: `App Version: ${ store.appVersion }`,
                            items: [items.account.application.hideToTray],
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
                    title: 'Map Behavior',
                    url: '',
                    items: [
                        {
                            key: 'position',
                            title: 'Position & URL',
                            items: [items.preferences.autoFollow, items.preferences.autoZoom, items.preferences.enableQueryUpdate, items.preferences.hoverInteraction],
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
                            title: 'Debug',
                            items: [items.preferences.debugMode],
                        },
                    ],
                },
                {
                    title: 'Appearance & Colors',
                    url: 'appearance',
                    items: [
                        {
                            title: 'Interface',
                            key: 'interface',
                            items: [items.account.theme],
                        },
                        {
                            key: 'layout',
                            title: 'Layout',
                            items: [items.appearance.overlaysPositions, items.appearance.mapQuality, items.appearance.favoriteLocation],
                        },
                        {
                            key: 'tracks',
                            title: 'Track Colors',
                            items: [items.appearance.colors.turns, items.appearance.colors.turnsTransparency],
                        },
                        {
                            key: 'airspace-colors',
                            title: 'Airspace Colors',
                            items: [
                                items.appearance.colors.approach,
                                items.appearance.colors.approachBookings,
                                items.appearance.colors.approachText,
                                items.appearance.colors.approachBg,
                                items.appearance.colors.firs,
                                items.appearance.colors.centerBookings,
                                items.appearance.colors.uirs,
                                items.appearance.colors.centerText,
                                items.appearance.colors.centerBg,
                            ],
                        },
                        {
                            key: 'airport-colors',
                            title: 'Airport Colors',
                            items: [
                                items.appearance.colors.runways,
                                items.appearance.colors.gates,
                                items.appearance.colors.staffedAirport,
                                items.appearance.colors.defaultAirport,
                            ],
                        },
                        {
                            key: 'aircraft-colors',
                            title: 'Aircraft Colors',
                            items: Object.entries(items.appearance.colors).filter(x => x[0].startsWith('aircraft')).map(x => x[1]),
                        },
                    ],
                },
                {
                    title: 'Aircraft',
                    url: 'aircraft',
                    items: [
                        {
                            key: 'aircraft',
                            items: [items.preferences.aircraft.shortView, items.preferences.traffic.declutter, items.preferences.traffic.highlightEmergency, items.preferences.aircraft.showLimit, items.preferences.aircraft.dynamicScale, items.preferences.aircraft.ownAtcHighlight, items.preferences.aircraft.scale],
                        },
                        {
                            key: 'tracks',
                            title: 'Tracks',
                            items: [items.preferences.aircraft.tracksMode, items.preferences.aircraft.tracksShowLimit, items.preferences.aircraft.showOutOfBounds, items.appearance.colors.turns, items.appearance.colors.turnsTransparency],
                        },
                        {
                            key: 'route',
                            title: 'Tracks for Airport/Dashboard',
                            description: 'Tracks settings for Airport Tracks or Dashboard',
                            items: routeParsingItems,
                        },
                        {
                            key: 'overlays',
                            title: 'Overlays',
                            items: [items.preferences.traffic.showFullRoute, items.preferences.traffic.showRouteDetails, items.preferences.traffic.toggleAircraftOverlays],
                        },
                        {
                            key: 'traffic',
                            title: 'Traffic',
                            items: [items.preferences.traffic.disableFastUpdate, items.preferences.traffic.smoothMovement],
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
                            items: [items.preferences.airports.showMode, items.preferences.airports.showZoomLimit, items.preferences.airports.declutterIf, items.preferences.airports.ATISAsUnstaffed, items.preferences.airports.voiceButton, items.preferences.airports.showLimit],
                        },
                        {
                            key: 'traffic',
                            title: 'Ground Traffic Options',
                            items: [items.preferences.airports.groundTrafficHide, items.preferences.airports.groundTrafficExcludeMyLocation, items.preferences.airports.groundTrafficExcludeMyArrival],
                        },
                        {
                            key: 'counters',
                            title: 'Traffic Counter',
                            items: [items.preferences.airports.countersEnabled, items.preferences.airports.countersDeparturesMode, items.preferences.airports.countersSyncDeparturesArrivals, items.preferences.airports.countersArrivalsMode, items.preferences.airports.countersHorizontalCounter, items.preferences.airports.countersDisableTraining],
                        },
                        {
                            key: 'overlays',
                            title: 'Overlay Settings',
                            items: [items.preferences.airports.departuresCountInOverlay, items.preferences.traffic.autoShowAirportTracks],
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
                    title: 'Layers and Weather',
                    url: '',
                    items: [
                        {
                            key: '',
                            title: 'Map Layer',
                            items: [items.layers.layerLabels, items.layers.layer, items.layers.osmTransparency, items.layers.satelliteTransparency],
                        },
                        {
                            key: 'weather',
                            title: 'Weather',
                            items: [items.layers.weather, items.layers.weatherDarkTransparency, items.layers.weatherLightTransparency],
                        },
                        {
                            key: 'extras',
                            title: 'Extra Layers',
                            items: [items.layers.relativeIndicator, items.layers.terminator, items.layers.heatmap],
                        },
                    ],
                },
                {
                    title: 'Map Overlays',
                    url: 'traffic',
                    items: [
                        {
                            key: 'nat-tracks',
                            title: 'NAT Tracks',
                            items: [items.layers.natTrakEnabled, items.layers.natTrakConcorde, items.layers.natTrakDirection],
                        },
                        {
                            key: 'vatglasses',
                            title: 'VATGlasses',
                            items: [items.layers.vatglassesAutoEnable, items.layers.vatglassesActive, items.layers.vatglassesCombined, items.layers.vatglassesAutoLevel],
                        },
                        {
                            key: 'bookings',
                            title: 'Bookings',
                            items: [items.layers.bookingsEnabled, items.layers.bookingsHours],
                        },
                        {
                            key: 'events',
                            title: 'Events',
                            items: [items.layers.eventsEnabled, items.layers.eventsHours],
                        },
                        {
                            key: 'sigmets',
                            title: 'SIGMETs',
                            items: [items.layers.sigmets.showOnMap, items.layers.sigmets.disabled, items.layers.sigmets.showAirmets, items.layers.sigmets.raw, items.layers.sigmetsTransparency],
                        },
                        {
                            key: 'distance-tool',
                            title: 'Distance Tool',
                            items: [items.layers.distanceEnabled, items.layers.distanceUnits, items.layers.distanceInteraction],
                        },
                    ],
                },
                {
                    title: 'Visibility',
                    url: 'visibility',
                    items: [
                        {
                            key: 'controllers',
                            title: 'Controllers',
                            items: [items.layers.visibility.atcFirs, items.layers.visibility.atcApproach, items.layers.visibility.atcGround, items.layers.visibility.atcLabels, items.layers.visibility.vatglassesLabels, items.layers.visibility.artccTracons],
                        },
                        {
                            key: 'layers',
                            title: 'Map Objects',
                            items: [items.layers.visibility.airports, items.layers.visibility.pilots, items.layers.visibility.gates, items.layers.visibility.runways, items.layers.visibility.pilotLabels],
                        },
                        {
                            key: 'privacy',
                            title: 'Private Information',
                            items: [items.layers.visibility.pilotsInfo, items.layers.visibility.atcInfo],
                        },
                    ],
                },
                {
                    title: 'Navigraph Layers',
                    url: 'navigraph',
                    items: [
                        {
                            key: 'general',
                            items: [items.layers.navigraph.enabled],
                        },
                        {
                            key: 'route',
                            title: 'Route Parsing',
                            description: 'General settings',
                            items: [items.layers.navigraph.route.enabled, items.layers.navigraph.route.enabledOnHover],
                        },
                        {
                            key: 'route',
                            title: 'Airport Traffic Route Parsing',
                            description: 'Settings for Airport Tracks or Dashboard',
                            items: routeParsingItems,
                        },
                        {
                            key: 'layers',
                            title: 'Map Layers',
                            items: Object.values(items.layers.navigraph.layers),
                        },
                        {
                            key: 'airport',
                            title: 'Airport Layout',
                            hide: computed(() => !store.user?.hasCharts),
                            items: Object.values(items.layers.navigraph.airports),
                        },
                    ],
                },
            ],
        },
        {
            title: 'Presets & Save',
            url: 'management',
            icon: SaveIcon,
            sections: [
                {
                    title: 'Save or Load',
                    url: '',
                    items: [
                        {
                            key: 'save',
                            items: [{ type: 'component', component: SettingsManagement }],
                        },
                    ],
                },
                {
                    title: 'Performance preset',
                    url: 'performance',
                    items: [
                        {
                            key: 'performance',
                            title: 'Performance Settings',
                            description: 'Here, you can manage performance-related settings, and learn how they affect VATSIM Radar performance',
                            items: [
                                {
                                    type: 'inline-component',
                                    title: 'Apply recommended',
                                    component: SettingsRecommendedPerformance,
                                },
                            ],
                        },
                        {
                            key: 'aircraft',
                            title: 'Aircraft',
                            items: [
                                {
                                    ...items.preferences.traffic.declutter,
                                    description: 'Aircraft are hidden when displayed close to each other, resulting in less elements to render for your CPU',
                                } as typeof items.preferences.traffic.declutter,
                                {
                                    ...items.preferences.aircraft.showLimit,
                                    description: 'Less labels and tracks to render for your CPU - the lower, the better',
                                } as typeof items.preferences.aircraft.showLimit,
                                items.preferences.aircraft.tracksShowLimit,
                                items.preferences.traffic.smoothMovement,
                            ],
                        },
                        {
                            key: 'airports',
                            title: 'Airports',
                            items: [
                                {
                                    ...items.preferences.airports.showMode,
                                    description: 'Set this setting to render less airports',
                                } as typeof items.preferences.airports.showMode,
                                {
                                    ...items.preferences.airports.showLimit,
                                    description: 'The lower, the better',
                                } as typeof items.preferences.airports.showLimit,
                            ],
                        },
                        {
                            key: 'layers',
                            title: 'Map & Layers',
                            items: [
                                {
                                    type: 'toggle',
                                    title: 'Basic Layer',
                                    description: 'Sets map layer to Basic to significantly improve zooming performance',
                                    value: getSettingValue(() => getKeyedValueFromSettings('map.layers.layer') === 'basic', false),
                                    onChange: value => setSettingByKey('map.layers.layer', value === true ? 'basic' : undefined),
                                },
                                items.appearance.mapQuality,
                            ],
                        },
                    ],
                },
            ],
        },
    ] satisfies SettingsMenuGroup[] as SettingsMenuGroup[];
};

export function getSettingByItem(item: SettingsItem, settings: Partial<SettingsItemDefault>) {
    return {
        ...(item as any),
        ...settings,
    };
}
