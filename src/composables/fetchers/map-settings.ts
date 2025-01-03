import { useStore } from '~/store';
import type { UserMapSettings } from '~/utils/backend/handlers/map-settings';
import { toRaw } from 'vue';
import { isFetchError } from '~/utils/shared';
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

export function setUserMapSettings(settings?: UserMapSettings) {
    const store = useStore();

    const settingsText = localStorage.getItem('map-settings') ?? '{}';
    if (!settings && JSON.stringify(store.mapSettings) === settingsText) return;

    let mapSettings = JSON.parse(settingsText) as UserMapSettings;
    mapSettings = customDefu(settings || {}, mapSettings);

    store.mapSettings = mapSettings;
    localStorage.setItem('map-settings', JSON.stringify(mapSettings));
}

export async function resetUserMapSettings() {
    const store = useStore();
    store.mapSettings = {};
    localStorage.removeItem('map-settings');
}

export async function fetchUserMapSettings() {
    const store = useStore();
    const settings = await $fetch<UserMapSettings>('/api/user/settings/map');
    store.mapSettings = settings;
    localStorage.setItem('map-settings', JSON.stringify(settings));
}

export async function sendUserMapSettings(name: string, json: UserMapSettings, retryMethod: () => Promise<any>) {
    const store = useStore();
    try {
        return await $fetch<UserMapSettings>(`/api/user/settings/map${ store.mapPresetsSaveFail ? '?force=1' : '' }`, {
            method: 'POST',
            body: {
                name,
                json: toRaw(json),
            },
        });
    }
    catch (e) {
        if (isFetchError(e) && e.statusCode === 409) {
            store.mapPresetsSaveFail = retryMethod;
        }

        throw e;
    }
}
