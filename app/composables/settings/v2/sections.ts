import type { SettingsMenuGroup } from './types';
import PersonIcon from '~/assets/icons/kit/person.svg?component';
import DisplaySettingsIcon from '~/assets/icons/kit/display-settings.svg?component';
import { settingsItemAccount } from '~/composables/settings/v2/items/account';
import { settingsItemPreferences } from '~/composables/settings/v2/items/general/preferences';
import {settingsItemAppearance} from "~/composables/settings/v2/items/general/appearance";

export const getSettingsSections = () => {
    const items = {
        account: settingsItemAccount(),
        preferences: settingsItemPreferences(),
        appearance: settingsItemAppearance(),
    }
    
    const store = useStore();
    const notLoggedIn = computed(() => !store.user);

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
                    title: 'Appearance',
                    url: '',
                    items: [
                        {
                            key: 'appearance',
                            items: [items.preferences.searchBy, items.preferences.searchLimit, items.appearance.overlaysPositions],
                        },
                    ],
                },
            ],
        },
    ] satisfies SettingsMenuGroup[] as SettingsMenuGroup[];
};
