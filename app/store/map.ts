import { defineStore } from 'pinia';
import type { Extent } from 'ol/extent';
import type { VatsimExtendedPilot, VatsimPrefile } from '~/types/data/vatsim';
import { useStore } from '~/store/index';
import { findAtcByCallsign } from '~/composables/atc';
import type { VatsimAirportData } from '~~/server/api/data/vatsim/airport/[icao]';
import type { VatsimAirportInfo } from '~/utils/backend/vatsim';
import type { TurnsBulkReturn } from '~~/server/api/data/vatsim/pilot/turns';
import type { Coordinate } from 'ol/coordinate';
import { ownFlight } from '~/composables/pilots';
import type { VatsimAirportDataNotam } from '~/utils/backend/notams';

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
        fullRoute?: boolean;
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
        aircraftTab?: 'departed' | 'ground' | 'arriving';
        tab?: 'aircraft' | 'atc' | 'procedures' | 'info';
    };
}

export interface StoreOverlayAtc extends StoreOverlayDefault {
    type: 'atc';
    data: {
        callsign: string;
    };
}

export type StoreOverlay = StoreOverlayPilot | StoreOverlayPrefile | StoreOverlayAtc | StoreOverlayAirport;

type PartialOverlayParams = Partial<Omit<StoreOverlay, 'key' | 'data' | 'type'>>;

export const useMapStore = defineStore('map', {
    state: () => ({
        extent: [0, 0, 0, 0] as Extent,
        center: [0, 0] as Coordinate,
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
        closedOwnOverlay: false,

        localTurns: new Set<number>(),
        turnsResponse: [] as TurnsBulkReturn[],
        selectedCid: null as number | false | null,

        activeMobileOverlay: null as null | string,
        autoShowTracks: null as null | boolean,

        distance: {
            pixel: null as Coordinate | null,
            initAircraft: null as null | number,
            targetAircraft: null as null | number,
            overlayOpenCheck: false,
            tutorial: false,
            items: [] as {
                date: number;
                length: string;
                coordinates: Coordinate[];
                initAircraft: null | number;
                targetAircraft: null | number;
            }[],
        },
    }),
    getters: {
        canShowOverlay(): boolean {
            return !this.moving && !this.distance.pixel;
        },
    },
    actions: {
        addOverlay<O extends StoreOverlay = StoreOverlay>(overlay: Pick<O, 'key' | 'data' | 'type' | 'sticky'> & Partial<O>) {
            const id = typeof crypto.randomUUID === 'undefined' ? Math.random().toString() : crypto.randomUUID();
            const isMobile = useIsMobile();

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

            if (isMobile.value) {
                this.overlays.forEach(x => {
                    x.collapsed = true;
                });
            }
            this.overlays.push(newOverlay);
            this.activeMobileOverlay = id;

            return this.overlays.find(x => x.id === id)! as O;
        },
        togglePilotOverlay(cid: string, tracked = false) {
            const existingOverlay = this.overlays.find(x => x.type === 'pilot' && x.key === cid);
            if (existingOverlay) {
                this.overlays = this.overlays.filter(x => x.type !== 'pilot' || x.key !== cid);
                this.sendSelectedPilotToDashboard(null);
            }
            else return this.addPilotOverlay(cid, tracked);
        },
        sendSelectedPilotToDashboard(cid: number | null = null) {
            const message = { selectedPilot: cid };
            const targetOrigin = useRuntimeConfig().public.DOMAIN;
            window.parent.postMessage(message, targetOrigin);
        },
        async addPilotOverlay(cid: string | number, tracked = false, params?: PartialOverlayParams) {
            if (this.openingOverlay) return;
            if (typeof cid === 'number') cid = cid.toString();
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
                if (tracked) this.overlays.filter(x => x.type === 'pilot').forEach(x => (x as StoreOverlayPilot).data.tracked = false);
                await nextTick();

                this.sendSelectedPilotToDashboard(+cid);

                if (this.distance.overlayOpenCheck) {
                    this.distance.overlayOpenCheck = false;
                    return;
                }

                return this.addOverlay<StoreOverlayPilot>({
                    key: cid,
                    data: {
                        pilot,
                        tracked,
                    },
                    type: 'pilot',
                    collapsed: store.user?.settings.toggleAircraftOverlays && this.overlays.some(x => x.type === 'pilot'),
                    sticky: cid === ownFlight.value?.cid.toString(),
                    ...params,
                });
            }
            finally {
                this.openingOverlay = false;
            }
        },
        async addPrefileOverlay(cid: string, params?: PartialOverlayParams) {
            if (this.openingOverlay) return;
            this.openingOverlay = true;

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
                    sticky: cid === ownFlight.value?.cid.toString(),
                    ...params,
                });
            }
            finally {
                this.openingOverlay = false;
            }
        },
        async addAtcOverlay(callsign: string, params?: PartialOverlayParams) {
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
                    ...params,
                });
            }
            finally {
                this.openingOverlay = false;
            }
        },
        async addAirportOverlay(airport: string, { aircraftTab, tab }: {
            aircraftTab?: StoreOverlayAirport['data']['aircraftTab'];
            tab?: StoreOverlayAirport['data']['tab'];
        } = {}, params?: PartialOverlayParams) {
            if (this.openingOverlay) return;
            this.openingOverlay = true;

            const store = useStore();

            try {
                const existingOverlay = this.overlays.find(x => x.key === airport);
                if (existingOverlay) {
                    if (store.isMobile) this.overlays.forEach(x => x.collapsed = true);
                    existingOverlay.collapsed = false;
                    this.activeMobileOverlay = existingOverlay.id;
                    return;
                }

                const vatSpyAirport = useDataStore().vatspy.value?.data.keyAirports.realIcao[airport];
                if (!vatSpyAirport) return;

                this.overlays = this.overlays.filter(x => x.type !== 'airport' || x.sticky);
                await nextTick();
                const overlay = this.addOverlay<StoreOverlayAirport>({
                    key: airport,
                    data: {
                        icao: airport,
                        showTracks: this.autoShowTracks ?? store.user?.settings.autoShowAirportTracks,
                        aircraftTab,
                        tab,
                    },
                    type: 'airport',
                    sticky: false,
                    ...params,
                });

                this.openingOverlay = false;

                overlay.data.airport = await $fetch<VatsimAirportData>(`/api/data/vatsim/airport/${ airport }`);
                $fetch<VatsimAirportDataNotam[]>(`/api/data/vatsim/airport/${ airport }/notams`).then(x => overlay.data.notams = x).catch(e => {
                    console.error(e);
                    overlay.data.notams = [];
                });
                return overlay;
            }
            finally {
                this.openingOverlay = false;
            }
        },
    },
});
