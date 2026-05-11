import type { SettingsMenuGroup } from './types';
import EditIcon from 'assets/icons/kit/edit.svg?component';
import { settingsItemDebug } from '~/composables/settings/v2/items';

export const settingsSections: SettingsMenuGroup[] = [
    {
        title: 'Account Settings',
        url: 'account',
        icon: EditIcon,
        sections: [
            {
                title: 'Account Settings',
                url: '',
                items: [
                    {
                        title: 'Section 1',
                        description: 'Section description',
                        items: [
                            settingsItemDebug.component,
                            settingsItemDebug.inlineComponent,
                            settingsItemDebug.toggle,
                            settingsItemDebug.input,
                        ],
                    },
                    {
                        title: 'Section 2',
                        items: [
                            settingsItemDebug.number,
                            settingsItemDebug.color,
                            settingsItemDebug.select,
                            settingsItemDebug.multiSelect,
                        ],
                    },
                    {
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
                    title: 'Section 1',
                    description: 'Section description',
                    items: [
                        settingsItemDebug.component,
                        settingsItemDebug.inlineComponent,
                        settingsItemDebug.toggle,
                        settingsItemDebug.input,
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
