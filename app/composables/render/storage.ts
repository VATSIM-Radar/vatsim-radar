import type { VatDataVersions } from '~/types/data';
import type { VatSpyAirport, VatSpyAPIData, VatSpyData, VatSpyDataProperties } from '~/types/data/vatspy';
import type {
    VatsimBooking,
    VatsimExtendedPilot,
    VatsimLiveData, VatsimLiveDataShort, VatsimMandatoryConvertedData, VatsimMandatoryData, VatsimMandatoryPilot,
    VatsimMemberStats, VatsimNattrakClient,
    VatsimShortenedAircraft,
    VatsimShortenedController,
} from '~/types/data/vatsim';
import { getCurrentInstance } from 'vue';
import type { Ref, ShallowRef, WatchStopHandle } from 'vue';
import type {
    RadarDataAirline,
    Sigmets,
    SimAwareDataFeature, VatglassesData,
    VatglassesDynamicAPIData, VatglassesPosition,
} from '~/utils/server/storage';
import { View } from 'ol';
import { clientDB } from '~/composables/render/idb';
import type { ClientNavigraphData } from '~/composables/render/idb';
import { checkForWSData } from '~/composables/render/ws';
import { useStore } from '~/store';
import {
    isVatGlassesActive,
} from '~/utils/data/vatglasses';
import type { VatglassesActivePositions, VatglassesActiveRunways } from '~/utils/data/vatglasses';
import { filterVatsimControllers, filterVatsimPilots, hasActivePilotFilter } from '~/composables/settings/filter';
import { useGeographic } from 'ol/proj.js';
import { useRadarError } from '~/composables/errors';

import type {
    NavDataFlightLevel,
    NavDataProcedure,
    NavigraphGetData,
    NavigraphNavData, NavigraphNavDataApproach, NavigraphNavDataEnrouteWaypointPartial, NavigraphNavDataStar,
} from '~/utils/server/navigraph/navdata/types';
import {
    checkForAirlines,
    checkForData, checkForTracks,
    checkForUpdates,
    checkForVATSpy, checkForVG,
    getVatglassesDynamic,
} from '~/composables/init';
import type { PartialRecord } from '~/types';
import type { UserList } from '~/utils/server/handlers/lists';

import type { RadarNotam } from '~/utils/shared/vatsim';
import type { Coordinate } from 'ol/coordinate.js';
import type { Feature, MultiPolygon } from 'geojson';
import type { AirportListItem, AirportTraconFeature } from '~/composables/render/airports';

const versions = ref<null | VatDataVersions>(null);
const vatspy = shallowRef<DataStoreVatspy>();
const navigraphVersion = ref<string | null>(null);
const sigmets = shallowRef<Sigmets>({ type: 'FeatureCollection', features: [] });
const vatglasses = shallowRef('');
const visiblePilots = shallowRef<VatsimMandatoryPilot[]>([]);
const visiblePilotsObj = shallowRef<Record<string, VatsimMandatoryPilot>>({});

if (typeof window !== 'undefined') {
    watch(visiblePilots, () => {
        visiblePilotsObj.value = Object.fromEntries(visiblePilots.value.map(pilot => [pilot.cid.toString(), pilot]));
    });
}

const notam = ref<RadarNotam | null>(null);

export type DataWaypoint = [identifier: string, longitude: number, latitude: number, type?: string];

const waypoints = shallowRef<Record<string, any>>({});

const navigraphProcedures: DataStoreNavigraphProcedures = shallowRef({});
const navigraphAircraftProcedures: DataStoreNavigraphAircraftProcedures = shallowRef({});

const vatglassesActivePositions = shallowRef<VatglassesActivePositions>({});
const vatglassesActiveRunways = shallowRef<VatglassesActiveRunways>({});
const vatglassesDynamicData = shallowRef<VatglassesDynamicAPIData>({ version: null, data: null });
const vatglassesCombiningInProgress = ref(false);
const time = ref(Date.now());
const stats = shallowRef<{
    cid: number;
    stats: VatsimMemberStats;
}[]>([]);

export type VatsimData = {
    [K in keyof Required<Omit<VatsimLiveData, 'keyedPilots'>>]-?: Ref<VatsimLiveData[K] extends Array<any> ? VatsimLiveData[K] : K extends 'general' ? (VatsimLiveData[K] | null) : VatsimLiveData[K]>
} & {
    keyedPilots: Ref<NonNullable<VatsimLiveData['keyedPilots']>>;
    keyedPrefiles: Ref<NonNullable<VatsimLiveData['keyedPrefiles']>>;
    notam: Ref<RadarNotam | null>;
};

const data: VatsimData = {
    // eslint-disable-next-line vue/require-typed-ref
    general: ref(null),
    pilots: shallowRef([]),
    keyedPilots: shallowRef({}),
    keyedPrefiles: shallowRef({}),
    prefiles: shallowRef([]),
    observers: shallowRef([]),
    controllers: shallowRef([]),
    atis: shallowRef([]),
    facilities: shallowRef([]),
    military_ratings: shallowRef([]),
    pilot_ratings: shallowRef([]),
    ratings: shallowRef([]),
    bars: shallowRef({}),
    notam,
};

const vatsim: UseDataStore['vatsim'] = {
    data,
    tracks: shallowRef([]),
    parsedAirports: shallowRef<Record<string, AirportListItem>>({}),
    parsedAirportsList: computed(() => Object.values(vatsim.parsedAirports.value)),
    // For fast turn-on in case we need to restore mandatory data
    /* _mandatoryData: computed<VatsimMandatoryConvertedData | null>(() => {
        if (!data.pilots.value.length) return null;
        return {
            pilots: data.pilots.value,
            controllers: [],
            atis: [],
        } as VatsimMandatoryConvertedData;
    }),*/
    _mandatoryData: shallowRef<VatsimMandatoryConvertedData | null>(null),
    mandatoryData: shallowRef<VatsimMandatoryConvertedData | null>(null),
    versions: ref<VatDataVersions['vatsim'] | null>(null),
    updateTimestamp: ref(''),
    updateTime: ref(0),
    localUpdateTime: ref(0),
    shortUpdateTime: ref(0),
    selfCoordinate: ref<{ coordinate: Coordinate; heading: number; date: number } | null>(null),
    notam,
};

export interface DataStoreNavigraphProcedure<T extends NavigraphNavDataStar | NavigraphNavDataApproach = NavigraphNavDataStar> {
    constraints: boolean;
    transitions: string[];
    procedure: NavDataProcedure<T>;
}

export interface DataStoreNavigraphProceduresAirport {
    setBy: 'airportOverlay' | 'pilotOverlay' | 'dashboard';
    runways: string[];
    stars: Record<string, DataStoreNavigraphProcedure>;
    sids: Record<string, DataStoreNavigraphProcedure>;
    approaches: Record<string, DataStoreNavigraphProcedure<NavigraphNavDataApproach>>;
}

export type DataStoreNavigraphProcedures = Ref<PartialRecord<string, DataStoreNavigraphProceduresAirport>>;
export type DataStoreNavigraphAircraftProcedures = Ref<PartialRecord<string, { departure: DataStoreNavigraphProceduresAirport & { icao: string }; arrival: DataStoreNavigraphProceduresAirport & { icao: string } }>>;

async function getNavigraphIDBData(key: 'version'): Promise<string | null>;
async function getNavigraphIDBData<T extends keyof ClientNavigraphData>(key: T): Promise<ClientNavigraphData[T] | null>;
async function getNavigraphIDBData(key: any) {
    return (await clientDB.navigraphData.get(key)) ?? null;
}

export interface DataAirport {
    icao: string;
    iata?: string;
    airport?: VatSpyAirport | null;
    aircraft: Partial<{
        groundDep: number[];
        groundArr: number[];
        prefiles: number[];
        departures: number[];
        arrivals: number[];
    }>;
    aircraftCount: number;
    departureCall?: string;
    departureCallPosition?: string;
    vgRunways?: string[];
    activeRunway?: string;
    atis: {
        departure?: string;
        arrival?: string;
        combined?: string;
        runways?: {
            departure: string[];
            arrival: string[];
        };
    };
    atc: VatsimShortenedController[];
    features?: AirportTraconFeature[];
}

export interface DataSector {
    fir: VatSpyData['firs'][number];
    uir?: VatSpyData['uirs'][number];
    feature: Feature<MultiPolygon, VatSpyDataProperties>;
    atc: VatsimShortenedController[];
}

export type DataStoreVatspy = Omit<VatSpyAPIData, 'data'> & {
    data: Pick<VatSpyAPIData['data'], 'id' | 'keyAirports' | 'countries' | 'firs' | 'uirs'>;
    feature: (boundary: string) => Promise<Feature<MultiPolygon, VatSpyDataProperties>[] | null>;
};

export interface UseDataStore {
    versions: Ref<null | VatDataVersions>;
    vatspy: ShallowRef<DataStoreVatspy | undefined>;

    vatsim: {
        data: VatsimData;

        parsedAirports: ShallowRef<Record<string, AirportListItem>>;
        parsedAirportsList: Ref<AirportListItem[]>;

        tracks: ShallowRef<VatsimNattrakClient[]>;
        _mandatoryData: ShallowRef<VatsimMandatoryConvertedData | null>;
        mandatoryData: ShallowRef<VatsimMandatoryConvertedData | null>;
        versions: Ref<VatDataVersions['vatsim'] | null>;
        updateTimestamp: Ref<string>;
        updateTime: Ref<number>;
        localUpdateTime: Ref<number>;
        shortUpdateTime: Ref<number>;
        selfCoordinate: Ref<{
            coordinate: Coordinate;
            heading: number;
            date: number;
        } | null>;
        notam: Ref<RadarNotam | null>;
    };
    simaware: (icao: string, iata?: string) => Promise<SimAwareDataFeature[]>;

    vatglasses: ShallowRef<string>;

    vgData: {
        position: (prefix: string) => Promise<VatglassesPosition[] | null>;
        country: (id: string) => Promise<VatglassesData[string] | null>;
    };

    airportsList: ShallowRef<Record<string, DataAirport>>;
    sectorsList: ShallowRef<DataSector[]>;
    atcAddedDuringUpdate: ShallowRef<Set<string>>;
    vatglassesActivePositions: ShallowRef<VatglassesActivePositions>;
    /**
     * @deprecated
     */
    vatglassesActiveRunways: ShallowRef<VatglassesActiveRunways>;
    vatglassesCombiningInProgress: Ref<boolean>;
    vatglassesDynamicData: ShallowRef<VatglassesDynamicAPIData | undefined>;

    stats: ShallowRef<{ cid: number; stats: VatsimMemberStats }[]>;
    visiblePilots: ShallowRef<VatsimMandatoryPilot[]>;
    visiblePilotsObj: ShallowRef<Record<string, VatsimMandatoryPilot>>;
    time: Ref<number>;
    sigmets: ShallowRef<Sigmets>;
    airlines: (icao: string, virtual?: boolean) => Promise<RadarDataAirline | null>;
    navigraphWaypoints: Ref<Record<string, {
        pilot: VatsimShortenedAircraft;
        coordinates: Coordinate;
        calculatedArrival?: Pick<VatsimExtendedPilot, 'toGoTime' | 'toGoDist' | 'toGoPercent' | 'stepclimbs' | 'depDist'>;
        full: boolean;
        disableHoldings?: boolean;
        disableLabels?: boolean;
        disableWaypoints?: boolean;
        waypoints: NavigraphNavDataEnrouteWaypointPartial[];
    }>>;
    navigraphProcedures: DataStoreNavigraphProcedures;
    navigraphAircraftProcedures: DataStoreNavigraphAircraftProcedures;
    navigraph: {
        version: Ref<string | null>;
        data: typeof getNavigraphIDBData;
    };
}

const dataStore: UseDataStore = {
    versions,
    vatspy,
    vatsim,
    simaware: async (icao, iata) => {
        const request = [icao];
        if (iata) request.push(iata);

        const icaoResult = await clientDB.simaware.get(icao) as SimAwareDataFeature[] ?? [];
        const iataResult = iata ? await clientDB.simaware.get(iata) as SimAwareDataFeature[] ?? [] : [];

        icaoResult.push(...iataResult);
        iataResult.length = 0;
        return icaoResult;
    },
    vatglasses,
    airportsList: shallowRef({}),
    sectorsList: shallowRef([]),
    atcAddedDuringUpdate: shallowRef(new Set()),
    vatglassesActivePositions,
    vatglassesActiveRunways,
    vatglassesCombiningInProgress,
    vatglassesDynamicData,

    vgData: {
        position: async prefix => {
            return (await clientDB.vatglasses.get(`position-${ prefix }`) as VatglassesPosition[]) ?? null;
        },
        country: async id => {
            return (await clientDB.vatglasses.get(`country-${ id }`) as VatglassesData[string]) ?? null;
        },
    },

    stats,
    time,
    visiblePilots,
    visiblePilotsObj,
    sigmets,
    airlines: (icao, virtual?: boolean) => {
        return clientDB.airlines.get(`${ icao }${ virtual ? '-virtual' : '' }`) as Promise<RadarDataAirline>;
    },
    navigraphWaypoints: waypoints,
    navigraphProcedures,
    navigraphAircraftProcedures,
    navigraph: {
        version: navigraphVersion,
        data: getNavigraphIDBData,
    },
};

// @ts-expect-error Dynamic key
if (typeof window !== 'undefined') window.dataStore = dataStore;

export const vgFallbackKeys = computed(() => Object.keys(vatglassesActivePositions.value['fallback']));

export function useDataStore(): UseDataStore {
    return dataStore;
}

// Short data
export function setVatsimDataStore(vatsimData: VatsimLiveDataShort) {
    const filteredControllers = filterVatsimControllers(vatsimData.controllers, vatsimData.atis);

    for (const key in vatsimData) {
        if (key === 'pilots' || key === 'prefiles') vatsimData[key] = filterVatsimPilots<any>(vatsimData[key]);

        if (key === 'controllers') vatsimData.controllers = filteredControllers.controllers;
        if (key === 'atis') vatsimData.atis = filteredControllers.atis;
        if (key === 'notam') {
            if (vatsimData.notam && data.notam.value) {
                Object.assign(data.notam.value, vatsimData.notam);
            }
            else if (data.notam.value !== vatsimData.notam) data.notam.value = vatsimData.notam;
            continue;
        }

        // @ts-expect-error Dynamic assignment
        data[key].value = vatsimData[key];
    }

    data.keyedPilots.value = Object.fromEntries(vatsimData.pilots.map(pilot => [pilot.cid.toString(), {
        ...pilot,
        longitude: data.keyedPilots.value[pilot.cid.toString()]?.longitude ?? pilot.longitude,
        latitude: data.keyedPilots.value[pilot.cid.toString()]?.latitude ?? pilot.latitude,
        heading: data.keyedPilots.value[pilot.cid.toString()]?.heading ?? pilot.heading,
    }]));

    data.keyedPrefiles.value = Object.fromEntries(vatsimData.prefiles.map(pilot => [pilot.cid.toString(), pilot]));
}

export function setVatsimMandatoryData(mandatoryData: VatsimMandatoryData) {
    time.value = mandatoryData.serverTime;
    vatsim.localUpdateTime.value = Date.now();
    vatsim.updateTime.value = mandatoryData.timestampNum;

    if (hasActivePilotFilter()) mandatoryData.pilots = mandatoryData.pilots.filter(x => vatsim.data.pilots.value.some(y => y.cid === x[0]));

    vatsim.mandatoryData.value = {
        pilots: mandatoryData.pilots.map(([cid, lon, lat, icon, heading]) => {
            const cidString = cid.toString();
            if (data.keyedPilots.value?.[cidString]) {
                data.keyedPilots.value[cidString].longitude = lon;
                data.keyedPilots.value[cidString].latitude = lat;
                data.keyedPilots.value[cidString].heading = heading;
            }

            return {
                cid,
                longitude: lon,
                latitude: lat,
                icon,
                heading,
            };
        }),
    };

    triggerRef(data.keyedPilots);
    vatsim._mandatoryData.value = vatsim.mandatoryData.value;
}

function initBookings() {
    const store = useStore();
    const dataStore = useDataStore();

    let lastUpdate = Date.now();
    const end = ref(0);
    const bookingsQueryParams = computed(() => ({
        starting: store.bookingOverride
            ? store.bookingsStartTime.getTime()
            : Date.now(),
        ending: store.bookingOverride
            ? store.bookingsEndTime.getTime()
            : end.value,
    }));

    async function updateBookings() {
        lastUpdate = Date.now();
        store.fetchedBookings = await $fetch<VatsimBooking[]>('/api/data/vatsim/bookings', {
            query: bookingsQueryParams.value,
        });
    }

    function updateEnd() {
        const d = new Date();
        d.setTime(Date.now() + ((((store.mapSettings.bookingHours ?? 0.5) * 60) * 60) * 1000));
        end.value = d.getTime();
    }

    const bookingHours = computed(() => store.mapSettings.bookingHours);
    // Every 15 minutes
    const needToUpdate = computed(() => dataStore.time.value - lastUpdate > 1000 * 60 * 15);

    watch(bookingsQueryParams, updateBookings);
    watch(bookingHours, updateEnd, { immediate: true });
    watch(needToUpdate, val => val && updateEnd(), { immediate: true });
}

export async function setupDataFetch({ onMount, onFetch, onSuccessCallback }: {
    onMount?: () => any;
    onFetch?: () => any;
    onSuccessCallback?: () => any;
} = {}) {
    if (!getCurrentInstance()) throw new Error('setupDataFetch has been called outside setup');
    const store = useStore();
    const dataStore = useDataStore();
    let interval: NodeJS.Timeout | null = null;
    let vgInterval: NodeJS.Timeout | null = null;
    let visibilityInterval: NodeJS.Timeout | null = null;
    let mandatoryInProgess = false;
    let ws: (() => void) | null = null;
    const isMounted = ref(false);
    const config = useRuntimeConfig();

    function receiveMessage(event: MessageEvent) {
        if (event.origin !== config.public.DOMAIN) {
            return;
        }

        if (event.source === window) return; // the message is from the same window, so we ignore it

        if (event.data && 'type' in event.data && event.data.type === 'efbX') {
            store.isTabVisible = event.data.action === 'resume';
        }
    }

    const socketsEnabled = () => String(config.public.DISABLE_WEBSOCKETS) !== 'true' && !store.localSettings.traffic?.disableFastUpdate;

    function startIntervalChecks() {
        vgInterval = setInterval(async () => {
            if (isVatGlassesActive.value) {
                getVatglassesDynamic(dataStore);
            }

            checkForTracks();
        }, 30000);

        interval = setInterval(async () => {
            if (mandatoryInProgess || !store.isTabVisible) return;
            if (socketsEnabled()) {
                mandatoryInProgess = true;

                try {
                    const mandatoryData = await $fetch<VatsimMandatoryData>(`/api/data/vatsim/data/mandatory`, {
                        timeout: 1000 * 60,
                    });
                    if (mandatoryData) setVatsimMandatoryData(mandatoryData);

                    if (dataStore.vatsim.data.general.value) {
                        dataStore.vatsim.data.general.value!.update_timestamp = mandatoryData.timestamp;
                    }
                    dataStore.vatsim.updateTimestamp.value = mandatoryData.timestamp;
                }
                catch (e) {
                    useRadarError(e);
                }
                mandatoryInProgess = false;
            }
        }, 2000);

        visibilityInterval = setInterval(async () => {
            store.isTabVisible = document.visibilityState === 'visible';
            if (!store.isTabVisible) return;
            await store.getVATSIMData(socketsEnabled());
            onFetch?.();
            localStorage.setItem('radar-visibility-check', Date.now().toString());
        }, 10000);
    }

    function setVisibilityState() {
        store.isTabVisible = document.visibilityState === 'visible';
    }

    onMounted(async () => {
        useGeographic();
        onMount?.();
        store.isTabVisible = document.visibilityState === 'visible';
        isMounted.value = true;
        let watcher: WatchStopHandle | undefined;
        const config = useRuntimeConfig();

        document.addEventListener('visibilitychange', setVisibilityState);
        window.addEventListener('message', receiveMessage);

        watch(() => store.localSettings.traffic?.disableFastUpdate, val => {
            if (String(config.public.DISABLE_WEBSOCKETS) === 'true') val = true;
            watcher?.();
            if (val !== true) {
                ws = checkForWSData(isMounted);
            }
        }, {
            immediate: true,
        });

        watch(isVatGlassesActive, val => {
            if (val) {
                checkForVG();
            }
        });

        watch(() => store.lists.flatMap(x => x.users.filter(x => x.type !== 'offline' || x.hidden).map(x => x.cid)).join(','), async val => {
            if (store.initStatus.status !== false) return;
            store.user!.lists = await $fetch<UserList[]>('/api/user/lists');
        });

        initBookings();

        store.initStatus.status = true;

        if (!store.initStatus.dataGet) {
            await checkForUpdates();

            await Promise.all([
                checkForData(),
                checkForVATSpy(),
                checkForSimAware(),
                checkForAirlines(),
            ]);

            checkForTracks();
            await checkForVG();
            await checkForNavigraph();

            if (Object.values(store.initStatus).some(x => x === 'loading' || x === 'failed')) {
                await new Promise<void>(resolve => {
                    const interval = setInterval(async () => {
                        if (Object.values(store.initStatus).some(x => x === 'loading' || x === 'failed')) return;
                        clearInterval(interval);
                        resolve();
                    }, 1000);
                });
            }
        }

        store.initStatus.status = false;

        new View({
            center: [37.617633, 55.755820],
            zoom: 2,
            multiWorld: false,
        });

        startIntervalChecks();
        onSuccessCallback?.();
    });

    onBeforeUnmount(() => {
        document.removeEventListener('visibilitychange', setVisibilityState);
        window.removeEventListener('message', receiveMessage);
        isMounted.value = false;
        ws?.();
        if (interval) clearInterval(interval);
        if (vgInterval) clearInterval(vgInterval);
        if (visibilityInterval) clearInterval(visibilityInterval);
    });
}

export interface ControllerStats {
    rating: number | null; total: number;
}

function getAtcStats(controller: VatsimShortenedController, stats: VatsimMemberStats): ControllerStats {
    const dataStore = useDataStore();
    const rating = dataStore.vatsim.data.ratings.value.find(x => x.id === controller.rating)?.short;

    const shortRating = (stats[rating?.toLowerCase() as keyof VatsimMemberStats] ?? null) as number | null;

    return {
        rating: shortRating && Math.floor(shortRating),
        total: Math.floor(
            (stats.atc ?? 0) - (stats.sup ?? 0),
        ),
    };
}

export async function getVATSIMMemberStats(aircraft: VatsimShortenedAircraft | number, type: 'both'): Promise<{ pilot: number; atc: number }>;
export async function getVATSIMMemberStats(aircraft: VatsimShortenedAircraft | number, type: 'pilot'): Promise<number>;
export async function getVATSIMMemberStats(controller: VatsimShortenedController, type: 'atc'): Promise<ControllerStats>;
export async function getVATSIMMemberStats(data: VatsimShortenedAircraft | VatsimShortenedController | number, type: 'pilot' | 'atc' | 'both'): Promise<number | ControllerStats | { pilot: number; atc: number }> {
    const dataStore = useDataStore();
    const cid = typeof data === 'number' ? data : data.cid;
    let stats = dataStore.stats.value.find(x => x.cid === cid)?.stats;
    if (!stats) {
        stats = await $fetch<VatsimMemberStats>(`/api/data/vatsim/stats/${ cid }`);
        dataStore.stats.value.push({
            cid,
            stats,
        });
    }

    if (type === 'atc') return getAtcStats(data as VatsimShortenedController, stats);
    if (type === 'both') {
        return {
            atc: getAtcStats(data as VatsimShortenedController, stats).total,
            pilot: Math.floor(stats.pilot ?? 0),
        };
    }
    return Math.floor(stats.pilot ?? 0);
}

export async function getNavigraphData<T extends keyof NavigraphNavData>({ data, key }: {
    data: T;
    key: string;
}): Promise<NavigraphGetData<T>> {
    const store = useStore();
    return $fetch<NavigraphGetData<T>>(`/api/data/navigraph/item/${ store.user?.hasFms && store.user.hasCharts ? 'current' : 'outdated' }/${ data }/${ key }`);
}

export function checkFlightLevel(level: NavDataFlightLevel) {
    const store = useStore();

    if (level === 'B' || level === null || !store.mapSettings.navigraphData?.mode || store.mapSettings.navigraphData.mode === 'both') return true;

    if (store.mapSettings.navigraphData?.mode && store.mapSettings.navigraphData?.mode !== 'ifrHigh') {
        return level === 'L';
    }
    else return level === 'H';
}
