import { useStore } from '~/store';
import type { IUserMapSettings, UserMapSettingsVisibilityATC } from '~/server/api/user/settings/map';

export const isHideAtcType = (key: keyof UserMapSettingsVisibilityATC): boolean => {
    const store = useStore();

    if (typeof store.mapSettings.visibility?.atc === 'object') {
        return !!store.mapSettings.visibility.atc[key];
    }

    return store.mapSettings.visibility?.atc === false;
};

export const isHideMapObject = (key: keyof IUserMapSettings['visibility']): boolean => {
    const store = useStore();

    return !!store.mapSettings.visibility?.[key];
};
