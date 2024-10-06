import { useStore } from '~/store';
import type { IUserMapSettings, UserMapSettingsVisibilityATC } from '~/utils/backend/map-settings';
import { useMapStore } from '~/store/map';

export const isHideAtcType = (key: keyof UserMapSettingsVisibilityATC): boolean => {
    const store = useStore();

    if (store.mapSettings.heatmapLayer) return true;

    if (typeof store.mapSettings.visibility?.atc === 'object') {
        return !!store.mapSettings.visibility.atc[key];
    }

    return store.mapSettings.visibility?.atc === false;
};

export const isHideMapObject = (key: keyof IUserMapSettings['visibility']): boolean => {
    const store = useStore();
    const mapStore = useMapStore();

    if (store.mapSettings.heatmapLayer && key !== 'pilots' && (key !== 'airports' || mapStore.zoom < 6)) return true;

    return !!store.mapSettings.visibility?.[key];
};
