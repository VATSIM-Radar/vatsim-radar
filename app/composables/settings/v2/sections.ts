import type { SettingsMenuGroup } from './types';
import PersonIcon from '~/assets/icons/kit/person.svg?component';
import DisplaySettingsIcon from '~/assets/icons/kit/display-settings.svg?component';
import { settingsItemAccount } from '~/composables/settings/v2/items/account';

export const getSettingsSections = () => {
    const itemsAccount = settingsItemAccount();
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
                            items: [itemsAccount.account],
                            hide: notLoggedIn,
                        },
                        {
                            title: 'Privacy',
                            key: 'privacy',
                            items: [itemsAccount.headerName, itemsAccount.privateMode],
                            hide: notLoggedIn,
                        },
                        {
                            title: 'Navigraph Account',
                            key: 'navigraph',
                            items: [itemsAccount.navigraph],
                            hide: notLoggedIn,
                        },
                        {
                            title: 'Interface',
                            key: 'interface',
                            items: [itemsAccount.theme],
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

            ],
        },
    ] satisfies SettingsMenuGroup[];
};
