import SettingsNavigraph from '~/components/features/settings/v2/misc/SettingsNavigraph.vue';
import SettingsTheme from '~/components/features/settings/v2/misc/SettingsTheme.vue';
import { getSettingValue, makeSettingsItems } from '~/composables/settings/v2/utils';
import { setPrivateMode } from '~/composables/fetchers/lists';
import SettingsPrivateMode from '~/components/features/settings/v2/misc/SettingsPrivateMode.vue';
import SettingsUser from '~/components/features/settings/v2/misc/SettingsUser.vue';
import SettingsUserLists from '~/components/features/settings/v2/lists/SettingsUserLists.vue';

export const settingsItemAccount = globalComputed(() => makeSettingsItems(({ store, settingsStore, notLoggedIn }) => ({
    navigraph: {
        title: 'Status',
        description: 'Link Navigraph to receive latest AIRAC for route data and gates. Navigraph Unlimited members also get Airport Layouts feature',
        type: 'inline-component',
        component: SettingsNavigraph,
        disabled: notLoggedIn,
    },
    theme: {
        title: 'Interface theme',
        type: 'inline-component',
        component: SettingsTheme,
    },
    favorite: {
        type: 'component',
        component: SettingsUserLists,
        searchKeywords: ['favorite', 'friends'],
    },
    privateMode: {
        title: 'Private Mode',
        description: 'Hide from everyone following you using "Favorite Lists" feature. You will still be visible on map in "default" color, as well as searchable.',
        type: 'select',
        disabled: notLoggedIn,
        value: getSettingValue(() => undefined, '0h'),
        onChange: value => setPrivateMode(value as any),
        placeholder: 'Select Private duration',
        showPlaceholder: true,
        items: [
            { value: '1h', text: '1 Hour' },
            { value: '3h', text: '3 Hours' },
            { value: '6h', text: '6 Hours' },
            { value: '12h', text: '12 Hours' },
            { value: '24h', text: '24 Hours' },
            { value: '7d', text: '1 Week' },
            { value: null, text: 'Until disabled' },
        ],
        appendComponent: SettingsPrivateMode,
    },
    account: {
        title: 'Account',
        type: 'inline-component',
        disabled: notLoggedIn,
        component: SettingsUser,
    },
    autoSave: {
        title: 'Auto Save',
        description: 'Selects first preset on new device and saves settings automatically',
        type: 'toggle',
        disabled: notLoggedIn,
        value: getSettingValue(() => useSettingsStore().getAutoSave(), true),
        onChange: value => useSettingsStore().setAutoSave(value ?? true),
    },
} satisfies Record<string, SettingsItem>)));
