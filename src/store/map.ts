import { defineStore } from 'pinia';
import type { Extent } from 'ol/extent';
import type { VatsimExtendedPilot, VatsimMemberStats, VatsimPrefile } from '~/types/data/vatsim';
import { useStore } from '~/store/index';

export interface StoreOverlayDefault {
    id: string;
    key: string;
    position: number | {
        x: number
        y: number
    };
    maxHeight?: number;
    height: number;
    collapsed: boolean;
    sticky: boolean;
}

export interface StoreOverlayPilot extends StoreOverlayDefault {
    type: 'pilot';
    data: {
        pilot: VatsimExtendedPilot
        stats?: Partial<VatsimMemberStats>
        tracked?: boolean
    };
}

export interface StoreOverlayPrefile extends StoreOverlayDefault {
    type: 'prefile';
    data: {
        prefile: VatsimPrefile
    };
}

export type StoreOverlay = StoreOverlayPilot | StoreOverlayPrefile

export const useMapStore = defineStore('map', {
    state: () => ({
        extent: [0, 0, 0, 0] as Extent,
        zoom: 0,
        moving: false,
        openOverlayId: null as string | null,
        openPilotOverlay: false,

        dataReady: false,
        mapCursorPointerTrigger: false as false | number,
        overlays: [] as StoreOverlay[],
        openingOverlay: false,
    }),
    getters: {
        canShowOverlay(): boolean {
            return this.zoom > 4 && !this.moving;
        },
    },
    actions: {
        addOverlay<O extends StoreOverlay = StoreOverlay>(overlay: Pick<O, 'key' | 'data' | 'type' | 'sticky'>) {
            const id = crypto.randomUUID();
            for (const overlay of this.overlays.filter(x => typeof x.position === 'number')) {
                (overlay.position as number)++;
            }

            const newOverlay: StoreOverlay = {
                id,
                position: 0,
                height: 0,
                collapsed: false,
                ...overlay,
            } as O;

            this.overlays.push(newOverlay);
            return this.overlays.find(x => x.id === id)! as O;
        },
        async addPilotOverlay(cid: string, tracked = false) {
            if (this.openingOverlay) return;
            this.openingOverlay = true;
            const store = useStore();

            try {
                const existingOverlay = this.overlays.find(x => x.key === cid);
                if (existingOverlay) return;

                const pilot = await $fetch(`/data/vatsim/pilot/${ cid }`);
                this.overlays = this.overlays.filter(x => x.type !== 'pilot' || x.sticky);
                await nextTick();

                if (existingOverlay) {
                    //@ts-ignore
                    existingOverlay.data.pilot = pilot;
                    return;
                }

                const overlay = this.addOverlay<StoreOverlayPilot>({
                    key: cid,
                    data: {
                        pilot,
                        stats: {
                            pilot: 0,
                        },
                        tracked,
                    },
                    type: 'pilot',
                    sticky: cid === store.user?.cid,
                });

                overlay.data.stats = await $fetch<VatsimMemberStats>(`/data/vatsim/pilot/${ cid }/stats`);
                return overlay;
            }
            finally {
                this.openingOverlay = false;
            }
        },
        async addPrefileOverlay(cid: string, tracked = false) {
            if (this.openingOverlay) return;
            this.openingOverlay = true;
            const store = useStore();

            try {
                const existingOverlay = this.overlays.find(x => x.key === cid);
                if (existingOverlay) return;

                const prefile = await $fetch(`/data/vatsim/pilot/${ cid }/prefile`);
                this.overlays = this.overlays.filter(x => x.type !== 'prefile' || x.sticky);
                await nextTick();

                return this.addOverlay({
                    key: cid,
                    data: {
                        prefile,
                    },
                    type: 'prefile',
                    sticky: cid === store.user?.cid,
                });
            }
            finally {
                this.openingOverlay = false;
            }
        },
    },
});
