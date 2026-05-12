import type { SettingsMenuGroup } from './types';
import EditIcon from 'assets/icons/kit/edit.svg?component';
import { settingsItemDebug } from '~/composables/settings/v2/items';
import PersonIcon from '~/assets/icons/kit/person.svg?component';
import SettingsUserLists from '~/components/features/settings/v2/lists/SettingsUserLists.vue';

export const settingsSections: SettingsMenuGroup[] = [
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
                        title: 'Section 1',
                        description: 'Section description',
                        key: 'section-1',
                        items: [
                            settingsItemDebug.component,
                            settingsItemDebug.toggle,
                            settingsItemDebug.input,
                        ],
                    },
                    {
                        title: 'Section 2',
                        key: 'section-2',
                        items: [
                            settingsItemDebug.number,
                            settingsItemDebug.color,
                            settingsItemDebug.select,
                            settingsItemDebug.multiSelect,
                        ],
                    },
                    {
                        key: 'section-3',
                        items: [
                            settingsItemDebug.radio,
                        ],
                    },
                ],
            },
            {
                title: 'User Lists',
                url: 'lists',
                items: [{
                    key: 'lists',
                    items: [
                        {
                            type: 'component',
                            component: SettingsUserLists,
                        },
                    ],
                }],
            },
        ],
    },
    {
        title: 'Test',
        url: 'test',
        sections: [],
    },
];
