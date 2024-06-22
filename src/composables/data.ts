import type { VatDataVersions } from '~/types/data';
import type { VatSpyAPIData } from '~/types/data/vatspy';
import type {
    VatsimLiveData,
    VatsimMemberStats,
    VatsimShortenedAircraft,
    VatsimShortenedController,
} from '~/types/data/vatsim';
import type { Ref } from 'vue';
import type { SimAwareAPIData } from '~/utils/backend/storage';
import { View } from 'ol';
import { fromLonLat } from 'ol/proj';
import { clientDB } from '~/utils/client-db';
import { useMapStore } from '~/store/map';

const versions = ref<null | VatDataVersions>(null);
const vatspy = shallowRef<VatSpyAPIData>();
const simaware = shallowRef<SimAwareAPIData>();
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
    versions: ref<VatDataVersions['vatsim'] | null>(null),
    updateTimestamp: ref(''),
};

export function useDataStore() {
    return {
        versions,
        vatspy,
        vatsim,
        simaware,
        stats,
    };
}

export function setVatsimDataStore(vatsimData: VatsimLiveData) {
    for (const key in vatsimData) {
        // @ts-expect-error Dynamic assignment
        data[key].value = vatsimData[key];
    }
}

export async function setupDataFetch({ onInitialFetch, onSuccessCallback }: {
    onInitialFetch?: () => any;
    onSuccessCallback?: () => any;
} = {}) {
    if (!getCurrentInstance()) throw new Error('setupDataFetch has been called outside setup');
    const mapStore = useMapStore();
    const dataStore = useDataStore();
    let interval: NodeJS.Timeout | null = null;

    onMounted(async () => {
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
                const [vatsimData] = await Promise.all([
                    $fetch<VatsimLiveData>('/api/data/vatsim/data'),
                ]);
                setVatsimDataStore(vatsimData);
            }()),
        ]);

        let inProgress = false;

        interval = setInterval(async () => {
            if (inProgress) return;

            try {
                inProgress = true;
                const versions = await $fetch<VatDataVersions['vatsim']>('/api/data/vatsim/versions', {
                    timeout: 1000 * 30,
                });

                if (versions && versions.data !== dataStore.vatsim.updateTimestamp.value) {
                    dataStore.vatsim.versions.value = versions;

                    if (!dataStore.vatsim.data) dataStore.vatsim.data = {} as any;

                    const data = await $fetch<VatsimLiveData>(`/api/data/vatsim/data?short=${ dataStore.vatsim.data ? 1 : 0 }`, {
                        timeout: 1000 * 60,
                    });
                    setVatsimDataStore(data);
                    await onInitialFetch?.();

                    dataStore.vatsim.data.general.value!.update_timestamp = data.general.update_timestamp;
                    dataStore.vatsim.updateTimestamp.value = data.general.update_timestamp;
                }
            }
            catch (e) {
                console.error(e);
            }
            finally {
                inProgress = false;
            }
        }, 3000);

        onSuccessCallback?.();
    });

    onBeforeUnmount(() => {
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
                if (!isDataReady()) return;

                mapStore.dataReady = true;
                return true;
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
