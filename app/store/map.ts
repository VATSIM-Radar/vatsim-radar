import { defineStore } from 'pinia';
import type { Extent } from 'ol/extent.js';
import type { VatsimAchievementUser, VatsimExtendedPilot, VatsimPrefile } from '~/types/data/vatsim';
import { useStore } from '~/store/index';
import { findAtcByCallsign } from '~/composables/vatsim/controllers';
import type { VatsimAirportData } from '~~/server/api/data/vatsim/airport/[icao]';
import type { VatsimAirportInfo } from '~/utils/server/vatsim';
import type { Coordinate } from 'ol/coordinate.js';
import { ownFlight } from '~/composables/vatsim/pilots';
import type { VatsimAirportDataNotam } from '~/utils/server/notams';

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
    minified: boolean;
    sticky: boolean;
}

export interface StoreOverlayPilot extends StoreOverlayDefault {
    type: 'pilot';
    data: {
        pilot: VatsimExtendedPilot;
        achievements?: VatsimAchievementUser[];
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

type PartialOverlayParams<T = StoreOverlay> = Partial<Omit<T, 'key' | 'type' | 'data'>> & {
    // @ts-expect-error T always has data
    data?: Partial<T['data']>;
};

export const useMapStore = defineStore('map', {
    state: () => ({
        extent: [0, 0, 0, 0] as Extent,
        center: [0, 0] as Coordinate,
        zoom: 0,
        preciseZoom: 0,
        rotation: 0,
        moving: false,
        openOverlayId: null as string | null,

        hoveredPilot: null as number | null,
        renderedAirports: null as null | string[],
        renderedPilots: null as null | number[],

        overlays: [] as StoreOverlay[],
        openingOverlay: false,
        closedOwnOverlay: false,

        isNavigraphUpdating: false,
        navigraphUpdateProgress: 5,

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
        showAirportDetails(): boolean {
            return !!this.renderedAirports && this.renderedAirports.length < (useStore().mapSettings.airportCounterLimit ?? 100) && this.zoom > 5.5;
        },
        compactAirportView(): boolean {
            return !!useStore().mapSettings.shortAirportView || !this.showAirportDetails
        },
    },
    actions: {
        addOverlay<O extends StoreOverlay = StoreOverlay>(overlay: Pick<O, 'key' | 'data' | 'type' | 'sticky'> & Partial<O>) {
            const id = overlay.id ?? (typeof crypto.randomUUID === 'undefined' ? Math.random().toString() : crypto.randomUUID());
            const isMobile = useIsMobile();

            for (const overlay of this.overlays.filter(x => typeof x.position === 'number')) {
                (overlay.position as number)++;
            }

            const newOverlay: StoreOverlay = {
                id,
                position: 0,
                height: 0,
                collapsed: false,
                minified: false,
                ...overlay,
            } as O;

            if (isMobile.value) {
                this.overlays.forEach(x => {
                    x.minified = true;
                });
            }
            this.overlays.push(newOverlay);
            this.activeMobileOverlay = id;

            return this.overlays.find(x => x.id === id)! as O;
        },
        sendSelectedPilotToDashboard(cid: number | null = null) {
            const message = { selectedPilot: cid };
            const targetOrigin = useRuntimeConfig().public.DOMAIN;
            window.parent.postMessage(message, targetOrigin);
        },
        async addPilotOverlay(cid: string | number, tracked?: boolean, params: PartialOverlayParams<StoreOverlayPilot> = {}) {
            if (this.openingOverlay) return;

            if (tracked !== undefined) {
                if (!params.data) params.data = {};
                if (!('tracked' in params.data)) params.data.tracked = tracked;
            }

            if (typeof cid === 'number') cid = cid.toString();
            this.openingOverlay = true;
            const store = useStore();

            try {
                const existingOverlay = this.overlays.find(x => x.key === cid);
                if (existingOverlay) {
                    existingOverlay.minified = false;
                    existingOverlay.collapsed = false;
                    return;
                }

                const achievementsRequest = $fetch<VatsimAchievementUser[]>(`/api/data/vatsim/pilot/${ cid }/achievements`, {
                    timeout: 5000,
                });
                const pilot = await $fetch<VatsimExtendedPilot>(`/api/data/vatsim/pilot/${ cid }`, {
                    timeout: 5000,
                });
                if (!params.sticky) {
                    this.overlays = this.overlays.filter(x => x.type !== 'pilot' || x.sticky || store.user?.settings.toggleAircraftOverlays);
                }
                if (params?.data?.tracked) this.overlays.filter(x => x.type === 'pilot').forEach(x => (x as StoreOverlayPilot).data.tracked = false);
                await nextTick();

                this.sendSelectedPilotToDashboard(+cid);

                if (this.distance.overlayOpenCheck) {
                    this.distance.overlayOpenCheck = false;
                    return;
                }

                const overlay = this.addOverlay<StoreOverlayPilot>({
                    key: cid,
                    type: 'pilot',
                    collapsed: store.user?.settings.toggleAircraftOverlays && this.overlays.some(x => x.type === 'pilot'),
                    sticky: cid === ownFlight.value?.cid.toString(),
                    ...params,
                    data: {
                        ...params?.data ?? {},
                        pilot,
                        tracked: params?.data?.tracked,
                    },
                });

                achievementsRequest.then(result => overlay.data.achievements = result).catch(console.error);
                return overlay;
            }
            finally {
                this.openingOverlay = false;
            }
        },
        async addPrefileOverlay(cid: string, params?: PartialOverlayParams<StoreOverlayPrefile>) {
            if (this.openingOverlay) return;
            this.openingOverlay = true;

            try {
                const existingOverlay = this.overlays.find(x => x.key === cid);
                if (existingOverlay) {
                    existingOverlay.minified = false;
                    existingOverlay.collapsed = false;
                    return;
                }

                const prefile = await $fetch<VatsimPrefile>(`/api/data/vatsim/pilot/${ cid }/prefile`, {
                    timeout: 5000,
                });
                if (!params?.sticky) {
                    this.overlays = this.overlays.filter(x => x.type !== 'prefile' || x.sticky);
                }
                await nextTick();

                return this.addOverlay<StoreOverlayPrefile>({
                    key: cid,
                    type: 'prefile',
                    sticky: cid === ownFlight.value?.cid.toString(),
                    ...params,
                    data: {
                        ...params?.data ?? {},
                        prefile,
                    },
                });
            }
            finally {
                this.openingOverlay = false;
            }
        },
        async addAtcOverlay(callsign: string, params?: PartialOverlayParams<StoreOverlayAtc>) {
            if (this.openingOverlay) return;
            this.openingOverlay = true;

            try {
                const existingOverlay = this.overlays.find(x => x.key === callsign);
                if (existingOverlay) {
                    existingOverlay.minified = false;
                    existingOverlay.collapsed = false;
                    return;
                }

                const controller = findAtcByCallsign(callsign);
                if (!controller) return;

                if (!params?.sticky) {
                    this.overlays = this.overlays.filter(x => x.type !== 'atc' || x.sticky);
                }
                await nextTick();

                return this.addOverlay<StoreOverlayAtc>({
                    key: callsign,
                    type: 'atc',
                    sticky: false,
                    ...params,
                    data: {
                        ...params?.data ?? {},
                        callsign,
                    },
                });
            }
            finally {
                this.openingOverlay = false;
            }
        },
        async addAirportOverlay(airport: string, { aircraftTab, tab }: {
            aircraftTab?: StoreOverlayAirport['data']['aircraftTab'];
            tab?: StoreOverlayAirport['data']['tab'];
        } = {}, params?: PartialOverlayParams<StoreOverlayAirport>) {
            if (this.openingOverlay) return;
            this.openingOverlay = true;

            const store = useStore();

            try {
                const existingOverlay = this.overlays.find(x => x.key === airport);
                if (existingOverlay) {
                    if (store.isMobile) this.overlays.forEach(x => x.minified = true);
                    existingOverlay.collapsed = false;
                    existingOverlay.minified = false;
                    this.activeMobileOverlay = existingOverlay.id;
                    return;
                }

                const vatSpyAirport = useDataStore().vatspy.value?.data.keyAirports.realIcao[airport];
                if (!vatSpyAirport) return;

                if (!params?.sticky) {
                    this.overlays = this.overlays.filter(x => x.type !== 'airport' || x.sticky);
                }
                await nextTick();
                const overlay = this.addOverlay<StoreOverlayAirport>({
                    key: airport,
                    type: 'airport',
                    sticky: false,
                    ...params,
                    data: {
                        icao: airport,
                        showTracks: this.autoShowTracks ?? store.user?.settings.autoShowAirportTracks,
                        aircraftTab,
                        tab,
                        ...params?.data ?? {},
                    },
                });

                this.openingOverlay = false;

                overlay.data.airport = await $fetch<VatsimAirportData>(`/api/data/vatsim/airport/${ airport }`, {
                    timeout: 5000,
                });
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
