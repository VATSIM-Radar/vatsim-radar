import { defineStore } from 'pinia';
import type { ThemesList } from '~/modules/styles';
import type { Extent } from 'ol/extent';
import type { FullUser } from '~/utils/backend/user';
import type { VatsimExtendedPilot, VatsimMemberStats } from '~/types/data/vatsim';

export interface StoreOverlayDefault {
    id: number;
    position: number | {
        x: number
        y: number
    };
    maxHeight: number;
    collapsed: boolean;
    sticky: boolean;
}

export interface StoreOverlayPilot extends StoreOverlayDefault {
    type: 'pilot';
    data: {
        pilot: VatsimExtendedPilot
        stats?: VatsimMemberStats
    };
}

export type StoreOverlay = StoreOverlayPilot

export const useStore = defineStore('index', {
    state: () => ({
        theme: 'default' as ThemesList,
        extent: [0, 0, 0, 0] as Extent,
        zoom: 0,
        moving: false,
        openOverlayId: null as string | null,
        openPilotOverlay: false,
        dataReady: false,
        mapCursorPointerTrigger: false as false | number,
        user: null as null | FullUser,
        version: '',
        overlays: [] as StoreOverlay[],
    }),
    getters: {
        canShowOverlay(): boolean {
            return this.zoom > 4 && !this.moving;
        },
    },
    actions: {
        addOverlay(overlay: Pick<StoreOverlay, 'data' | 'type' | 'maxHeight' | 'sticky'>) {
            const id = (this.overlays[this.overlays.length - 1]?.id ?? 0) + 1;
            for (const overlay of this.overlays.filter(x => typeof x.position === 'number')) {
                (overlay.position as number)++;
            }

            this.overlays.push({
                id,
                position: 0,
                collapsed: false,
                ...overlay,
            });
        },
    },
});
