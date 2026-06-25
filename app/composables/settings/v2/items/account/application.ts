import { makeSettingsItems } from '~/composables/settings/v2/utils';

export const settingsItemApplication = globalComputed(() => makeSettingsItems(({ store, notLoggedIn }) => ({
    pilotPresence: {
        type: 'toggle',
        title: 'In Flight',
        description: 'Enables when you are flying as pilot',
        disabled: notLoggedIn,
        value: computed(() => ({
            value: store.localSettings.app?.presence?.modes?.pilot ?? false,
        })),
        onChange: value => {
            if (value === undefined) delete store.localSettings.app?.presence?.modes?.pilot;
            else setUserLocalSettings({ app: { presence: { modes: { pilot: value } } } });
        },
    },
    atcPresence: {
        type: 'toggle',
        title: 'ATC Session',
        description: 'Enables when you are controlling',
        disabled: notLoggedIn,
        value: computed(() => ({
            value: store.localSettings.app?.presence?.modes?.atc ?? false,
        })),
        onChange: value => {
            if (value === undefined) delete store.localSettings.app?.presence?.modes?.atc;
            else setUserLocalSettings({ app: { presence: { modes: { atc: value } } } });
        },
    },
    observerPresence: {
        type: 'toggle',
        title: 'Observer',
        description: 'Shows that you are observing something mysterious or flying as copilot',
        disabled: notLoggedIn,
        value: computed(() => ({
            value: store.localSettings.app?.presence?.modes?.observer ?? false,
        })),
        onChange: value => {
            if (value === undefined) delete store.localSettings.app?.presence?.modes?.observer;
            else setUserLocalSettings({ app: { presence: { modes: { observer: value } } } });
        },
    },
    appAsVATSIMRadar: {
        type: 'radio',
        items: [
            {
                value: false,
                text: 'VATSIM',
            },
            {
                value: true,
                text: 'VATSIM Radar',
            },
        ],
        title: 'Discord App Name',
        disabled: notLoggedIn,
        value: computed(() => ({
            value: store.localSettings.app?.presence?.appAsVATSIMRadar ?? true,
        })),
        onChange: value => {
            if (value === undefined) delete store.localSettings.app?.presence?.appAsVATSIMRadar;
            else setUserLocalSettings({ app: { presence: { appAsVATSIMRadar: value as boolean } } });
        },
    },
    hideToTray: {
        type: 'toggle',
        title: 'Stay Active',
        description: 'Lets app stay active in Tray after you closed',
        value: computed(() => ({
            value: trayValue.value,
        })),
        onChange: value => {
            window.postMessage({ type: 'tray', value }, '*');
            trayValue.value = value ?? false;
        },
    },
} satisfies Record<string, SettingsItem>)));
