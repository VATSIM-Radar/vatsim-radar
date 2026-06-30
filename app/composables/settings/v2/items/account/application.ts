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
    offlinePresence: {
        type: 'toggle',
        title: 'Offline',
        description: `Offline presence: highlights that you are in Radar all the time it's open`,
        value: computed(() => ({
            value: store.localSettings.app?.presence?.modes?.offline ?? false,
        })),
        onChange: value => {
            if (value === undefined) delete store.localSettings.app?.presence?.modes?.offline;
            else setUserLocalSettings({ app: { presence: { modes: { offline: value } } } });
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
