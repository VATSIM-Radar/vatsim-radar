import type { SettingsMenuGroup } from './types';
import PersonIcon from '~/assets/icons/kit/person.svg?component';
import DisplaySettingsIcon from '~/assets/icons/kit/display-settings.svg?component';
import { settingsItemAccount } from '~/composables/settings/v2/items/account';
import { settingsItemPreferences } from '~/composables/settings/v2/items/general/preferences';
import { settingsItemAppearance } from '~/composables/settings/v2/items/general/appearance';
import { settingsItemAppearanceAircraft } from '~/composables/settings/v2/items/general/preferences/aircraft';
import { settingsDefaultValues } from '~/composables/settings/v2/utils';

export const getSettingsSections = () => {
    const items = {
        account: settingsItemAccount(),
        preferences: settingsItemPreferences(),
        appearance: settingsItemAppearance(),
        appearanceAircraft: settingsItemAppearanceAircraft(),
    };

    const store = useStore();
    const notLoggedIn = computed(() => !store.user);

    const aircraftColors = aircraftSvgColors();

    const aircraftOptions = ['ground', 'active', 'green', 'hover', 'landed', 'arriving', 'departing'] satisfies MapAircraftStatus[];

    for (const option of aircraftOptions) {
        settingsDefaultValues[`map.preferences.colors.default.aircraft.${ option }`] = { color: aircraftColors[option] };
    }

    return [
        {
            title: 'Account Settings',
            url: 'account',
            icon: PersonIcon,
            sections: [
                {
                    title: 'Account Settings',
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
                            items: [items.account.headerName, items.account.privateMode],
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
            ],
        },
        {
            title: 'General Settings',
            url: 'general',
            icon: DisplaySettingsIcon,
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
                                items.appearance.shortAirportView,
                            ],
                        },
                        {
                            key: 'aircraft',
                            title: 'Aircraft',
                            items: [
                                items.appearanceAircraft.shortView,
                                items.appearanceAircraft.dynamicScale,
                                items.appearanceAircraft.scale,
                            ],
                        },
                    ],
                },
            ],
        },
    ] satisfies SettingsMenuGroup[] as SettingsMenuGroup[];
};
