import { defineStore } from 'pinia';
import type { ThemesList } from '~/modules/styles';
import type { Extent } from 'ol/extent';
import type { FullUser } from '~/utils/backend/user';
import type { VatsimExtendedPilot, VatsimMemberStats } from '~/types/data/vatsim';
import type { UserLocalSettings } from '~/types/map';

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
        stats?: Partial<VatsimMemberStats>
    };
}

export type StoreOverlay = StoreOverlayPilot

export const useStore = defineStore('index', {
    state: () => ({
        theme: 'default' as ThemesList,
        extent: [0, 0, 0, 0] as Extent,
        zoom: 0,
        datetime: Date.now(),
        moving: false,
        openOverlayId: null as string | null,
        openPilotOverlay: false,
        dataReady: false,
        mapCursorPointerTrigger: false as false | number,
        user: null as null | FullUser,
        version: '',
        overlays: [] as StoreOverlay[],
        localSettings: {} as UserLocalSettings,
    }),
    getters: {
        canShowOverlay(): boolean {
            return this.zoom > 4 && !this.moving;
        },
    },
    actions: {
        addOverlay<O extends StoreOverlay = StoreOverlay>(overlay: Pick<O, 'data' | 'type' | 'maxHeight' | 'sticky'>) {
            const id = (this.overlays[this.overlays.length - 1]?.id ?? 0) + 1;
            for (const overlay of this.overlays.filter(x => typeof x.position === 'number')) {
                (overlay.position as number)++;
            }

            const newOverlay: StoreOverlay = {
                id,
                position: 0,
                collapsed: false,
                ...overlay,
            };

            this.overlays.push(newOverlay);
            return this.overlays.find(x => x.id === id)!;
        },
        async addPilotOverlay(cid: string) {
            const existingOverlay = this.overlays.find(x => x.type === 'pilot');

            if (existingOverlay?.data.pilot.cid.toString() === cid) return;
            if (existingOverlay && !existingOverlay?.sticky) this.overlays = this.overlays.filter(x => x.id !== existingOverlay.id);

            const pilot = await $fetch(`/data/vatsim/pilot/${ cid }`);

            const overlay = this.addOverlay({
                data: {
                    pilot,
                    stats: {
                        pilot: 0,
                    },
                },
                type: 'pilot',
                maxHeight: 45,
                sticky: cid === this.user?.cid,
            });

            overlay.data.stats = await $fetch<VatsimMemberStats>(`/data/vatsim/pilot/${ cid }/stats`);
        },
    },
});
