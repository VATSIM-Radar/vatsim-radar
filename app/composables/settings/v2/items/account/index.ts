import SettingsNavigraph from '~/components/features/settings/v2/misc/SettingsNavigraph.vue';
import SettingsTheme from '~/components/features/settings/v2/misc/SettingsTheme.vue';
import { getSettingValue, makeSettingsItems } from '~/composables/settings/v2/utils';
import { setPrivateMode } from '~/composables/fetchers/lists';
import SettingsPrivateMode from '~/components/features/settings/v2/misc/SettingsPrivateMode.vue';
import SettingsUser from '~/components/features/settings/v2/misc/SettingsUser.vue';

export const settingsItemAccount = () => makeSettingsItems(({ store, settingsStore, notLoggedIn }) => ({
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
    headerName: {
        title: 'Header Name',
        description: 'Customize shown header name. Default: your real name',
        type: 'text',
        placeholder: 'My Custom Name',
        value: getSettingValue(() => settingsStore.settings.appearance?.headerName, ''),
        onChange: value => settingsStore.save({ appearance: { headerName: value ?? '' } }),
    },
    privateMode: {
        title: 'Private Mode',
        description: 'Hide from everyone following you using "Favorite Lists" feature. You will still be visible on map in "default" color, as well as searchable.',
        type: 'select',
        disabled: notLoggedIn,
        value: getSettingValue(() => store.user?.privateUntil, '0h'),
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
} satisfies Record<string, SettingsItem>));
