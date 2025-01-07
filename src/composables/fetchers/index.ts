import { useStore } from '~/store';
import type { UserMapSettings } from '~/utils/backend/handlers/map-settings';
import { toRaw } from 'vue';
import { isFetchError } from '~/utils/shared';

export async function sendUserPreset(name: string, json: Record<string, any>, prefix: string, retryMethod: () => Promise<any>) {
    const store = useStore();
    try {
        return await $fetch<UserMapSettings>(`/api/user/${ prefix }${ store.presetImport.error ? '?force=1' : '' }`, {
            method: 'POST',
            body: {
                name,
                json: toRaw(json),
            },
        });
    }
    catch (e) {
        if (isFetchError(e) && e.statusCode === 409) {
            store.presetImport.error = retryMethod;
        }

        throw e;
    }
}
