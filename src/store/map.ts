import { defineStore } from 'pinia';
import type { Extent } from 'ol/extent';
import type { VatsimExtendedPilot, VatsimPrefile } from '~/types/data/vatsim';
import { useStore } from '~/store/index';
import { findAtcByCallsign } from '~/composables/atc';
import type { VatsimAirportData } from '~/server/api/data/vatsim/airport/[icao]';
import type { VatsimAirportDataNotam } from '~/server/api/data/vatsim/airport/[icao]/notams';
import type { VatsimAirportInfo } from '~/utils/backend/vatsim';
import type { TurnsBulkReturn } from '~/server/api/data/vatsim/pilot/turns';

export interface StoreOverlayDefault {
    id: string;
    key: string;
    position: number | {
        x: number;
        y: number;
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
        pilot: VatsimExtendedPilot;
        airport?: VatsimAirportInfo;
        tracked?: boolean;
    };
}

export interface StoreOverlayPrefile extends StoreOverlayDefault {
    type: 'prefile';
    data: {
        prefile: VatsimPrefile;
    };
}

export interface StoreOverlayAirport extends StoreOverlayDefault {
    type: 'airport';
    data: {
        icao: string;
        airport?: VatsimAirportData;
        notams?: VatsimAirportDataNotam[];
        showTracks?: boolean;
    };
}

export interface StoreOverlayAtc extends StoreOverlayDefault {
    type: 'atc';
    data: {
        callsign: string;
    };
}

export type StoreOverlay = StoreOverlayPilot | StoreOverlayPrefile | StoreOverlayAtc | StoreOverlayAirport;

export const useMapStore = defineStore('map', {
    state: () => ({
        extent: [0, 0, 0, 0] as Extent,
        zoom: 0,
        rotation: 0,
        moving: false,
        openOverlayId: null as string | null,
        openPilotOverlay: false,
        openApproachOverlay: false,

        dataReady: false,
        mapCursorPointerTrigger: false as false | number,
        overlays: [] as StoreOverlay[],
        openingOverlay: false,

        localTurns: new Set<number>(),
        turnsResponse: [] as TurnsBulkReturn[],
    }),
    getters: {
        canShowOverlay(): boolean {
            return this.zoom > 4 && !this.moving;
        },
    },
    actions: {
        addOverlay<O extends StoreOverlay = StoreOverlay>(overlay: Pick<O, 'key' | 'data' | 'type' | 'sticky'> & Partial<O>) {
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

                /* const debugOverlay = this.overlays.find(x => x.type === 'pilot');
                if (debugOverlay) {
                    debugOverlay.data.pilot = await $fetch<VatsimExtendedPilot>(`/api/data/vatsim/pilot/${ cid }`);
                    return;
                }*/

                const pilot = await $fetch<VatsimExtendedPilot>(`/api/data/vatsim/pilot/${ cid }`);
                this.overlays = this.overlays.filter(x => x.type !== 'pilot' || x.sticky || store.user?.settings.toggleAircraftOverlays);
                await nextTick();

                return this.addOverlay<StoreOverlayPilot>({
                    key: cid,
                    data: {
                        pilot,
                        tracked,
                    },
                    type: 'pilot',
                    collapsed: store.user?.settings.toggleAircraftOverlays && this.overlays.some(x => x.type === 'pilot'),
                    sticky: cid === store.user?.cid,
                });
            }
            finally {
                this.openingOverlay = false;
            }
        },
        async addPrefileOverlay(cid: string) {
            if (this.openingOverlay) return;
            this.openingOverlay = true;
            const store = useStore();

            try {
                const existingOverlay = this.overlays.find(x => x.key === cid);
                if (existingOverlay) return;

                const prefile = await $fetch<VatsimPrefile>(`/api/data/vatsim/pilot/${ cid }/prefile`);
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
                if (!controller) return;

                this.overlays = this.overlays.filter(x => x.type !== 'atc' || x.sticky);
                await nextTick();

                return this.addOverlay<StoreOverlayAtc>({
                    key: callsign,
                    data: {
                        callsign,
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
        async addAirportOverlay(airport: string) {
            if (this.openingOverlay) return;
            this.openingOverlay = true;

            const store = useStore();

            try {
                const existingOverlay = this.overlays.find(x => x.key === airport);
                if (existingOverlay) return;

                const vatSpyAirport = useDataStore().vatspy.value?.data.airports.find(x => x.icao === airport);
                if (!vatSpyAirport) return;

                this.overlays = this.overlays.filter(x => x.type !== 'airport' || x.sticky);
                await nextTick();
                const overlay = this.addOverlay<StoreOverlayAirport>({
                    key: airport,
                    data: {
                        icao: airport,
                        showTracks: store.user?.settings.autoShowAirportTracks,
                    },
                    type: 'airport',
                    sticky: false,
                });

                overlay.data.airport = await $fetch<VatsimAirportData>(`/api/data/vatsim/airport/${ airport }`);
                overlay.data.notams = await $fetch<VatsimAirportDataNotam[]>(`/api/data/vatsim/airport/${ airport }/notams`) ?? [];
                return overlay;
            }
            finally {
                this.openingOverlay = false;
            }
        },
    },
});
