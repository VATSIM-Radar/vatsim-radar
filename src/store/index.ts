import { defineStore } from 'pinia';
import type { ThemesList } from '~/modules/styles';
import type { Extent } from 'ol/extent';
import type { FullUser } from '~/utils/backend/user';

export const useStore = defineStore('index', {
    state: () => ({
        theme: 'default' as ThemesList,
        extent: [0, 0, 0, 0] as Extent,
        zoom: 0,
        openOverlayId: null as string | null,
        openPilotOverlay: false,
        dataReady: false,
        mapCursorPointerTrigger: false as false | number,
        user: null as null | FullUser,
    }),
});
