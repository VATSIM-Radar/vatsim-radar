import type { VatDataVersions } from '~/types/data';
import type { VatSpyAPIData } from '~/types/data/vatspy';
import type {
    VatsimLiveData, VatsimLiveDataShort, VatsimMandatoryConvertedData, VatsimMandatoryData,
    VatsimMemberStats,
    VatsimShortenedAircraft,
    VatsimShortenedController,
} from '~/types/data/vatsim';
import type { Ref, ShallowRef, WatchStopHandle } from 'vue';
import type {
    RadarDataAirlinesAllList, Sigmets,
    SimAwareAPIData,
    VatglassesAPIData,
} from '~/utils/backend/storage';
import { View } from 'ol';
import type { IDBAirlinesData } from '~/utils/client-db';
import { clientDB } from '~/utils/client-db';
import { useMapStore } from '~/store/map';
import { checkForWSData } from '~/composables/ws';
import { useStore } from '~/store';
import type { AirportsList } from '~/components/map/airports/MapAirportsList.vue';
import type { VatglassesActivePositions, VatglassesActiveRunways } from '~/utils/data/vatglasses';
import { filterVatsimControllers, filterVatsimPilots, hasActivePilotFilter } from '~/composables/filter';
import { useGeographic } from 'ol/proj';

const versions = ref<null | VatDataVersions>(null);
const vatspy = shallowRef<VatSpyAPIData>();
const airlines = shallowRef<RadarDataAirlinesAllList>({
    airlines: {},
    virtual: {},
    all: {},
});
const simaware = shallowRef<SimAwareAPIData>();
const sigmets = shallowRef<Sigmets>({ type: 'FeatureCollection', features: [] });
const vatglasses = shallowRef<VatglassesAPIData>();

const vatglassesActivePositions = shallowRef<VatglassesActivePositions>({});
const vatglassesActiveRunways = shallowRef<VatglassesActiveRunways>({});
const vatglassesCombiningInProgress = ref(false);
const time = ref(Date.now());
const stats = shallowRef<{
    cid: number;
    stats: VatsimMemberStats;
}[]>([]);

export type VatsimData = {
    [K in keyof Required<VatsimLiveData>]-?: Ref<VatsimLiveData[K] extends Array<any> ? VatsimLiveData[K] : (VatsimLiveData[K] | null)>
};

const data: VatsimData = {
    // eslint-disable-next-line vue/require-typed-ref
    general: ref(null),
    pilots: shallowRef([]),
    keyedPilots: shallowRef([]),
    airports: shallowRef([]),
    prefiles: shallowRef([]),
    locals: shallowRef([]),
    firs: shallowRef([]),
    facilities: shallowRef([]),
    military_ratings: shallowRef([]),
    pilot_ratings: shallowRef([]),
    ratings: shallowRef([]),
};

const rawData: VatsimData = {
    // eslint-disable-next-line vue/require-typed-ref
    general: ref(null),
    pilots: shallowRef([]),
    keyedPilots: shallowRef([]),
    airports: shallowRef([]),
    prefiles: shallowRef([]),
    locals: shallowRef([]),
    firs: shallowRef([]),
    facilities: shallowRef([]),
    military_ratings: shallowRef([]),
    pilot_ratings: shallowRef([]),
    ratings: shallowRef([]),
};

const vatsim = {
    data,
    rawData,
    parsedAirports: shallowRef<AirportsList[]>([]),
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
};

export interface UseDataStore {
    versions: Ref<null | VatDataVersions>;
    vatspy: ShallowRef<VatSpyAPIData | undefined>;
    vatsim: {
        data: VatsimData;
        parsedAirports: ShallowRef<AirportsList[]>;
        _mandatoryData: ShallowRef<VatsimMandatoryConvertedData | null>;
        mandatoryData: ShallowRef<VatsimMandatoryConvertedData | null>;
        versions: Ref<VatDataVersions['vatsim'] | null>;
        updateTimestamp: Ref<string>;
        updateTime: Ref<number>;
        localUpdateTime: Ref<number>;
    };
    simaware: ShallowRef<SimAwareAPIData | undefined>;
    vatglasses: ShallowRef<VatglassesAPIData | undefined>;
    vatglassesActivePositions: ShallowRef<VatglassesActivePositions>;
    vatglassesActiveRunways: ShallowRef<VatglassesActiveRunways>;
    vatglassesCombiningInProgress: Ref<boolean>;
    stats: ShallowRef<{ cid: number; stats: VatsimMemberStats }[]>;
    time: Ref<number>;
    sigmets: ShallowRef<Sigmets>;
    airlines: ShallowRef<RadarDataAirlinesAllList>;
}

export function useDataStore(): UseDataStore {
    return {
        versions,
        vatspy,
        vatsim,
        simaware,
        vatglasses,
        vatglassesActivePositions,
        vatglassesActiveRunways,
        vatglassesCombiningInProgress,
        stats,
        time,
        sigmets,
        airlines,
    };
}

export function setVatsimDataStore(vatsimData: VatsimLiveDataShort) {
    const filteredControllers = filterVatsimControllers(vatsimData.locals, vatsimData.firs);

    for (const key in vatsimData) {
        // @ts-expect-error Dynamic assignment
        rawData[key].value = vatsimData[key];
    }

    for (const key in vatsimData) {
        if (key === 'pilots' || key === 'prefiles') vatsimData[key] = filterVatsimPilots<any>(vatsimData[key]);

        if (key === 'locals') vatsimData.locals = filteredControllers.locals;
        if (key === 'firs') vatsimData.firs = filteredControllers.firs;

        if (key === 'airports' && hasActivePilotFilter()) {
            const filteredPilots = vatsimData.pilots.map(x => x.cid);
            vatsimData.airports = vatsimData.airports.filter(x => {
                return vatsimData.locals.some(y => y.airport.icao === x.icao || (x.iata && y.airport.iata === x.iata)) || Object.values(x.aircraft).some(x => x.some(x => filteredPilots.includes(x)));
            });
        }

        // @ts-expect-error Dynamic assignment
        data[key].value = vatsimData[key];
    }

    data.keyedPilots.value = Object.fromEntries(vatsimData.pilots.map(pilot => [pilot.cid, pilot]));
}

export function setVatsimMandatoryData(data: VatsimMandatoryData) {
    time.value = data.serverTime;
    vatsim.updateTime.value = data.timestampNum;
    vatsim.localUpdateTime.value = Date.now();

    if (hasActivePilotFilter()) data.pilots = data.pilots.filter(x => vatsim.data.pilots.value.some(y => y.cid === x[0]));

    vatsim.mandatoryData.value = {
        pilots: data.pilots.map(([cid, lon, lat, icon, heading]) => {
            return {
                cid,
                longitude: lon,
                latitude: lat,
                icon,
                heading,
            };
        }),
        controllers: data.controllers.map(([cid, callsign, frequency, facility]) => ({
            cid,
            callsign,
            frequency,
            facility,
        })),
        atis: data.atis.map(([cid, callsign, frequency, facility]) => ({
            cid,
            callsign,
            frequency,
            facility,
        })),
    };

    vatsim._mandatoryData.value = vatsim.mandatoryData.value;
}

export async function setupDataFetch({ onMount, onFetch, onSuccessCallback }: {
    onMount?: () => any;
    onFetch?: () => any;
    onSuccessCallback?: () => any;
} = {}) {
    if (!getCurrentInstance()) throw new Error('setupDataFetch has been called outside setup');
    const mapStore = useMapStore();
    const store = useStore();
    const dataStore = useDataStore();
    let interval: NodeJS.Timeout | null = null;
    let mandatoryInProgess = false;
    let ws: (() => void) | null = null;
    const isMounted = ref(false);
    const config = useRuntimeConfig();

    const socketsEnabled = () => String(config.public.DISABLE_WEBSOCKETS) !== 'true' && !store.localSettings.traffic?.disableFastUpdate;

    function startIntervalChecks() {
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
                    console.error(e);
                }
                mandatoryInProgess = false;
            }
        }, 2000);

        interval = setInterval(async () => {
            store.isTabVisible = document.visibilityState === 'visible';
            if (!store.isTabVisible) return;
            await store.getVATSIMData(socketsEnabled());
            onFetch?.();
            localStorage.setItem('radar-visibility-check', Date.now().toString());
        }, 10000);
    }

    function setVisibilityState() {
        document.addEventListener('visibilitychange', event => {
            store.isTabVisible = document.visibilityState === 'visible';
        });
    }

    onMounted(async () => {
        useGeographic();
        onMount?.();
        store.isTabVisible = document.visibilityState === 'visible';
        isMounted.value = true;
        let watcher: WatchStopHandle | undefined;
        const config = useRuntimeConfig();
        startIntervalChecks();

        document.addEventListener('visibilitychange', setVisibilityState);

        watch(() => store.localSettings.traffic?.disableFastUpdate, val => {
            if (String(config.public.DISABLE_WEBSOCKETS) === 'true') val = true;
            watcher?.();
            if (val !== true) {
                ws = checkForWSData(isMounted);
            }
        }, {
            immediate: true,
        });

        // Data is not yet ready
        if (!mapStore.dataReady) {
            await new Promise<void>(resolve => {
                const interval = setInterval(async () => {
                    const { ready } = await $fetch('/api/data/status');
                    if (ready) {
                        resolve();
                        clearInterval(interval);
                    }
                }, 1000);
            });
        }

        if (!dataStore.versions.value) {
            dataStore.versions.value = await $fetch<VatDataVersions>('/api/data/versions');
            dataStore.vatsim.updateTimestamp.value = dataStore.versions.value!.vatsim.data;
        }

        dataStore.vatsim.versions.value = dataStore.versions.value!.vatsim;
        dataStore.vatsim.updateTimestamp.value = dataStore.versions.value!.vatsim.data;

        new View({
            center: [37.617633, 55.755820],
            zoom: 2,
            multiWorld: false,
        });

        await Promise.all([
            (async function() {
                let vatspy = await clientDB.get('data', 'vatspy') as VatSpyAPIData | undefined;
                if (!vatspy || vatspy.version !== dataStore.versions.value!.vatspy) {
                    vatspy = await $fetch<VatSpyAPIData>('/api/data/vatspy');
                    await clientDB.put('data', vatspy, 'vatspy');
                }

                dataStore.vatspy.value = vatspy;
            }()),
            (async function() {
                let airlines = await clientDB.get('data', 'airlines') as IDBAirlinesData['value'] | undefined;
                if (!airlines || !airlines.expireDate || Date.now() > airlines.expireDate) {
                    const data = await $fetch<RadarDataAirlinesAllList>('/api/data/airlines?v=1');
                    airlines = {
                        expireDate: Date.now() + (1000 * 60 * 60 * 24 * 7),
                        airlines: data,
                    };
                    await clientDB.put('data', airlines, 'airlines');
                }

                dataStore.airlines.value = airlines.airlines;
            }()),
            (async function() {
                let simaware = await clientDB.get('data', 'simaware') as SimAwareAPIData | undefined;
                if (!simaware || simaware.version !== dataStore.versions.value!.simaware) {
                    simaware = await $fetch<SimAwareAPIData>('/api/data/simaware');
                    await clientDB.put('data', simaware, 'simaware');
                }

                dataStore.simaware.value = simaware;
            }()),
            (async function() {
                let vatglasses = await clientDB.get('data', 'vatglasses') as VatglassesAPIData | undefined;
                if (!vatglasses || vatglasses.version !== dataStore.versions.value!.vatglasses) {
                    vatglasses = await $fetch<VatglassesAPIData>('/api/data/vatglasses');
                    await clientDB.put('data', vatglasses, 'vatglasses');
                }

                dataStore.vatglasses.value = vatglasses;
            }()),
            (async function() {
                await store.getVATSIMData();
            }()),
        ]);

        onSuccessCallback?.();
    });

    onBeforeUnmount(() => {
        document.removeEventListener('visibilitychange', setVisibilityState);
        isMounted.value = false;
        ws?.();
        if (interval) {
            clearInterval(interval);
        }
    });

    await useAsyncData(async () => {
        try {
            if (import.meta.server) {
                const {
                    isDataReady,
                } = await import('~/utils/backend/storage');
                if (!isDataReady()) return true;

                mapStore.dataReady = true;
            }

            return true;
        }
        catch (e) {
            console.error(e);
        }
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
        total: Math.floor(stats.atc ?? 0),
    };
}

export async function getVATSIMMemberStats(aircraft: VatsimShortenedAircraft | number, type: 'pilot'): Promise<number>;
export async function getVATSIMMemberStats(controller: VatsimShortenedController, type: 'atc'): Promise<ControllerStats>;
export async function getVATSIMMemberStats(data: VatsimShortenedAircraft | VatsimShortenedController | number, type: 'pilot' | 'atc'): Promise<number | ControllerStats> {
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
    return Math.floor(stats.pilot ?? 0);
}
