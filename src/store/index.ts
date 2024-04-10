import { defineStore } from 'pinia';
import type { ThemesList } from '~/modules/styles';
import type { Extent } from 'ol/extent';

export const useStore = defineStore('index', {
    state: () => ({
        theme: 'default' as ThemesList,
        extent: [0, 0, 0, 0] as Extent,
        openOverlayId: null as string | null,
        openPilotOverlay: false,
    }),
});
