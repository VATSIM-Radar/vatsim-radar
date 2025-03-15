import { useStore } from '~/store';
import { toRaw } from 'vue';
import { isFetchError } from '~/utils/shared';
import type { UserBookmark } from '~/utils/backend/handlers/bookmarks';
import type { Map } from 'ol';

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

export const showBookmark = async (bookmark: UserBookmark, map: Map | null) => {
    const zoom = bookmark.zoom ?? 14;
    const dataStore = useDataStore();
    const store = useStore();

    if (bookmark.icao) {
        showAirportOnMap(dataStore.vatspy.value!.data.keyAirports.realIcao[bookmark.icao]!, map, zoom, !store.localSettings.skipBookmarkAnimation);
    }
    else if (bookmark.coords) {
        if (store.localSettings.skipBookmarkAnimation) {
            map?.getView()?.setCenter(bookmark.coords);
            map?.getView()?.setZoom(zoom);
        }
        else {
            map?.getView()?.animate({
                center: bookmark.coords,
                zoom: zoom,
            });
        }
    }
};
