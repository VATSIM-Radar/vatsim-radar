import { useStore } from '~/store';
import type { UserLocalSettings } from '~/types/map';
import { customDefu } from '~/composables';

export function setUserLocalSettings(settings?: UserLocalSettings) {
    const store = useStore();

    const settingsText = localStorage.getItem('local-settings') ?? '{}';
    if (!settings && JSON.stringify(store.localSettings) === settingsText) return;

    let localSettings = JSON.parse(settingsText) as UserLocalSettings;
    localSettings = customDefu(settings || {}, localSettings);
    if (settings?.location) localSettings.location = settings.location;

    store.localSettings = localSettings;
    localStorage.setItem('local-settings', JSON.stringify(localSettings));
}
