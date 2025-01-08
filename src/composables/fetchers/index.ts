import { useStore } from '~/store';
import { toRaw } from 'vue';
import { isFetchError } from '~/utils/shared';

export async function sendUserPreset<T extends Record<string, any>>(name: string, json: T, prefix: string, retryMethod: () => Promise<any>) {
    const store = useStore();
    try {
        return await $fetch<T>(`/api/user/${ prefix }${ store.presetImport.error ? '?force=1' : '' }`, {
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
