import type { VatDataVersions } from '~/types/data';
import type { VatSpyAPIData } from '~/types/data/vatspy';
import type {
    VatsimLiveData, VatsimLiveDataShort, VatsimMandatoryConvertedData, VatsimMandatoryData,
    VatsimMemberStats,
    VatsimShortenedAircraft,
    VatsimShortenedController,
} from '~/types/data/vatsim';
import type { Ref, WatchStopHandle } from 'vue';
import type { SimAwareAPIData } from '~/utils/backend/storage';
import { View } from 'ol';
import { fromLonLat } from 'ol/proj';
import { clientDB } from '~/utils/client-db';
import { useMapStore } from '~/store/map';
import { checkForWSData } from '~/composables/ws';
import { useStore } from '~/store';
import type { AirportsList } from '~/components/map/airports/MapAirportsList.vue';

const versions = ref<null | VatDataVersions>(null);
const vatspy = shallowRef<VatSpyAPIData>();
const simaware = shallowRef<SimAwareAPIData>();
const time = ref(Date.now());
const stats = shallowRef<{
    cid: number;
    stats: VatsimMemberStats;
}[]>([]);

type Data = {
    [K in keyof VatsimLiveData]: Ref<VatsimLiveData[K] extends Array<any> ? VatsimLiveData[K] : (VatsimLiveData[K] | null)>
};

const data: Data = {
    // eslint-disable-next-line vue/require-typed-ref
    general: ref(null),
    pilots: shallowRef([]),
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

export function useDataStore() {
    return {
        versions,
        vatspy,
        vatsim,
        simaware,
        stats,
        time,
    };
}

export function setVatsimDataStore(vatsimData: VatsimLiveDataShort) {
    for (const key in vatsimData) {
        // @ts-expect-error Dynamic assignment
        data[key].value = vatsimData[key];
    }
}

export function setVatsimMandatoryData(data: VatsimMandatoryData) {
    time.value = data.serverTime;
    vatsim.updateTime.value = data.timestampNum;
    vatsim.localUpdateTime.value = Date.now();
    vatsim.mandatoryData.value = {
        pilots: data.pilots.map(([cid, lon, lat, icon, heading]) => {
            const coords = fromLonLat([lon, lat]);
            return {
                cid,
                longitude: coords[0],
                latitude: coords[1],
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

export async function setupDataFetch({ onFetch, onSuccessCallback }: {
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

        const view = new View({
            center: fromLonLat([37.617633, 55.755820]),
            zoom: 2,
            multiWorld: false,
        });

        await Promise.all([
            (async function() {
                let vatspy = await clientDB.get('data', 'vatspy') as VatSpyAPIData | undefined;
                if (!vatspy || vatspy.version !== dataStore.versions.value!.vatspy) {
                    vatspy = await $fetch<VatSpyAPIData>('/api/data/vatspy');
                    vatspy.data.firs = vatspy.data.firs.map(x => ({
                        ...x,
                        feature: {
                            ...x.feature,
                            geometry: {
                                ...x.feature.geometry,
                                coordinates: x.feature.geometry.coordinates.map(x => x.map(x => x.map(x => fromLonLat(x, view.getProjection())))),
                            },
                        },
                    }));
                    await clientDB.put('data', vatspy, 'vatspy');
                }

                dataStore.vatspy.value = vatspy;
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
