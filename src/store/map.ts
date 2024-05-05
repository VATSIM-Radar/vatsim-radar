import { defineStore } from 'pinia';
import type { Extent } from 'ol/extent';
import type { VatsimExtendedPilot, VatsimMemberStats, VatsimPrefile } from '~/types/data/vatsim';
import { useStore } from '~/store/index';
import { findAtcByCallsign } from '~/composables/atc';

export interface StoreOverlayDefault {
    id: number;
    key: string;
    position: number | {
        x: number
        y: number
    };
    maxHeight?: number;
    _maxHeight?: number;
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

export interface StoreOverlayAtc extends StoreOverlayDefault {
    type: 'atc';
    data: {
        callsign: string
        stats?: Partial<VatsimMemberStats>
    };
}

export type StoreOverlay = StoreOverlayPilot | StoreOverlayPrefile | StoreOverlayAtc

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
        addOverlay<O extends StoreOverlay = StoreOverlay>(overlay: Pick<O, 'key' | 'data' | 'type' | 'sticky'> & Partial<O>) {
            const id = (this.overlays[this.overlays.length - 1]?.id ?? 0) + 1;
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

                const pilot = await $fetch<VatsimExtendedPilot>(`/data/vatsim/pilot/${ cid }`);
                this.overlays = this.overlays.filter(x => x.type !== 'pilot' || x.sticky);
                await nextTick();

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

                overlay.data.stats = await $fetch<VatsimMemberStats>(`/data/vatsim/stats/${ cid }`);
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

                const prefile = await $fetch<VatsimPrefile>(`/data/vatsim/pilot/${ cid }/prefile`);
                this.overlays = this.overlays.filter(x => x.type !== 'prefile' || x.sticky);
                await nextTick();

                return this.addOverlay<StoreOverlayPrefile>({
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
        async addAtcOverlay(callsign: string) {
            if (this.openingOverlay) return;
            this.openingOverlay = true;

            try {
                const existingOverlay = this.overlays.find(x => x.key === callsign);
                if (existingOverlay) return;

                const controller = findAtcByCallsign(callsign);
                if(!controller) return;

                const stats = await $fetch<VatsimMemberStats>(`/data/vatsim/stats/${ controller.cid }`);
                this.overlays = this.overlays.filter(x => x.type !== 'atc' || x.sticky);
                await nextTick();

                return this.addOverlay<StoreOverlayAtc>({
                    key: callsign,
                    data: {
                        callsign,
                        stats,
                    },
                    type: 'atc',
                    sticky: false,
                    maxHeight: 400,
                });
            }
            finally {
                this.openingOverlay = false;
            }
        },
    },
});
