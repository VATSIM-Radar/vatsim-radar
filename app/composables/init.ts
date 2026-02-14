import { useMapStore } from '~/store/map';
import type { VatDataVersions } from '~/types/data';
import type { VRInitStatus, VRInitStatusResult } from '~/store';
import { useStore } from '~/store';
import type { IDBAirlinesData } from '~/composables/render/idb';
import { clientDB } from '~/composables/render/idb';
import type { VatSpyAPIData } from '~/types/data/vatspy';
import type { NavigraphNavDataShort } from '~/utils/server/navigraph/navdata/types';
import type {
    RadarDataAirline,
    RadarDataAirlinesAllList,
    SimAwareAPIData, SimAwareDataFeature,
    VatglassesAPIData,
    VatglassesDynamicAPIData,
} from '~/utils/server/storage';
import type { UseDataStore } from '~/composables/render/storage';

import { isVatGlassesActive } from '~/utils/data/vatglasses';
import type { VatsimNattrak } from '~/types/data/vatsim';

async function initCheck(key: keyof VRInitStatus, handler: (args: {
    store: ReturnType<typeof useStore>;
    dataStore: ReturnType<typeof useDataStore>;
    mapStore: ReturnType<typeof useMapStore>;
}) => PromiseLike<VRInitStatusResult | void>) {
    const store = useStore();
    const dataStore = useDataStore();
    const mapStore = useMapStore();

    try {
        store.initStatus[key] = 'loading';
        store.initStatus[key] = await handler({
            store,
            dataStore,
            mapStore,
        }) ?? true;
    }
    catch (e) {
        useRadarError(e);
        store.initStatus[key] = 'failed';
    }
}

export function checkForUpdates() {
    return initCheck('updatesCheck', async ({ mapStore, dataStore }) => {
        // Data is not yet ready
        if (!mapStore.dataReady) {
            await new Promise<void>(resolve => {
                let previousInProgress = false;
                const interval = setInterval(async () => {
                    if (previousInProgress) return;
                    try {
                        previousInProgress = true;
                        const { ready } = await $fetch<{ ready: boolean }>('/api/data/status');
                        if (ready) {
                            resolve();
                            clearInterval(interval);
                        }
                    }
                    catch (e) {
                        console.error(e);
                    }
                    finally {
                        previousInProgress = false;
                    }
                }, 1000);
            });
        }

        if (!dataStore.versions.value) {
            dataStore.versions.value = await $fetch<VatDataVersions>('/api/data/versions');
            dataStore.vatsim.updateTimestamp.value = dataStore.versions.value!.vatsim.data;
        }
    });
}

export function checkForData() {
    return initCheck('dataGet', async ({ store }) => {
        await store.getVATSIMData(true);
    });
}

export function checkForVATSpy() {
    return initCheck('vatspy', async ({ dataStore }) => {
        let notRequired = true;
        let vatspy = await clientDB.data.get('vatspy') as VatSpyAPIData | undefined;
        if (!vatspy || vatspy.version !== dataStore.versions.value!.vatspy) {
            vatspy = await $fetch<VatSpyAPIData>('/api/data/vatspy');

            await clientDB.data.put(vatspy, 'vatspy');
            notRequired = false;
        }

        for (const airport of vatspy.data.airports) {
            vatspy.data.keyAirports.icao[airport.icao] = airport;

            if (airport.iata) {
                vatspy.data.keyAirports.iata[airport.iata] = airport;
            }

            if (!airport.isPseudo) {
                vatspy.data.keyAirports.realIcao[airport.icao] = airport;

                if (airport.iata) {
                    vatspy.data.keyAirports.realIata[airport.iata] = airport;
                }
            }
        }

        dataStore.vatspy.value = vatspy;
        if (notRequired) return 'notRequired';
    });
}

export const tracksExpired = computed(() => {
    const dataStore = useDataStore();

    const closestDates = dataStore.vatsim.tracks.value.filter(x => x.active && x.valid_to && x.valid_from).slice(0).sort((a, b) => a.valid_to!.getTime() - b.valid_to!.getTime());
    const closestTime = closestDates[0]?.valid_to!.getTime();
    if (!closestTime) return true;

    return dataStore.time.value > closestTime ? closestTime : false;
});

export async function checkForTracks() {
    const dataStore = useDataStore();
    if (!tracksExpired.value) return false;

    dataStore.vatsim.tracks.value = (await $fetch<VatsimNattrak[]>(`/api/data/tracks?d=${ !dataStore.vatsim.tracks.value.length ? '0' : tracksExpired.value }`)).map(x => ({
        ...x,
        valid_from: x.valid_from ? new Date(x.valid_from) : null,
        valid_to: x.valid_to ? new Date(x.valid_to) : null,
    }));
}

export function checkForSimAware() {
    return initCheck('simaware', async ({ dataStore }) => {
        const simaware = await clientDB.keyVal.get('simawareVersion') as string | undefined;
        let notRequired = true;
        if (!simaware || simaware !== dataStore.versions.value!.simaware) {
            const data = await $fetch<SimAwareAPIData>('/api/data/simaware');

            const groups: Record<string, SimAwareDataFeature[]> = {};
            for (const feature of data.data.features) {
                for (let prefix of feature.properties.prefix) {
                    const index = prefix.indexOf('_');
                    if (index !== -1) prefix = prefix.slice(0, index);

                    groups[prefix] ??= [];
                    groups[prefix].push(feature);
                }
            }

            await clientDB.keyVal.bulkAdd(Object.values(groups), Object.keys(groups).map(x => `simaware-${ x }`));
            await clientDB.keyVal.put(data.version, 'simawareVersion');
            notRequired = false;
        }

        if (notRequired) return 'notRequired';
    });
}

export async function getVatglassesDynamic(dataStore: UseDataStore) {
    try {
        const vatglassesDynamicDataVersion = await $fetch<string>(`/api/data/vatsim/data/vatglasses/dynamic-version`, {
            timeout: 1000 * 60,
        });

        if (vatglassesDynamicDataVersion !== dataStore.vatglassesDynamicData.value?.version) {
            dataStore.vatglassesDynamicData.value = await $fetch<VatglassesDynamicAPIData>(`/api/data/vatsim/data/vatglasses/dynamic`, {
                timeout: 1000 * 60,
            });
        }
    }
    catch (e) {
        console.error(e);
    }
}

export function checkForVG() {
    return initCheck('vatglasses', async ({ dataStore }) => {
        if (!isVatGlassesActive.value) return 'notRequired';
        let vatglasses = await clientDB.data.get('vatglasses') as VatglassesAPIData | undefined;

        if (!vatglasses || vatglasses.version !== dataStore.versions.value!.vatglasses) {
            vatglasses = await $fetch<VatglassesAPIData>('/api/data/vatglasses');
            await clientDB.data.put(vatglasses, 'vatglasses');
        }

        dataStore.vatglasses.value = vatglasses.version;

        if (isVatGlassesActive.value) {
            await getVatglassesDynamic(dataStore);
        }
        else return 'notRequired';
    });
}

async function upsertBagsByIdentifier<D extends any[], T extends Record<string, D>>(
    prefix: 'airways' | 'waypoints' | 'vhf' | 'ndb',
    entries: T,
) {
    let groups: Record<string, Record<string, any>> = {};
    for (const [key, data] of Object.entries(entries)) {
        const identifier = prefix + '-' + (data as D)[0] as string;
        let groupItem = groups[identifier];
        if (!groupItem) {
            groupItem = {};
            groups[identifier] = groupItem;
        }
        groupItem[key] = data;
    }

    const groupsKeys = Object.keys(groups);
    const groupsValues = Object.values(groups);

    await clientDB.navigraphDB.bulkPut(groupsValues, groupsKeys);

    groupsKeys.length = 0;
    groupsValues.length = 0;
    (groups as any) = null;
}

export function checkForNavigraph() {
    return initCheck('navigraph', async ({ store, dataStore }) => {
        try {
            const navigraph = await dataStore.navigraph.data('version');

            const type = store.user?.hasFms ? 'current' : 'outdated';
            let notRequired = true;

            const emptyDB = await clientDB.navigraphData.get('inserted') !== '1';

            if (navigraph && navigraph === dataStore.versions.value?.navigraph?.[type] && !emptyDB) {
                dataStore.navigraph.version.value = navigraph;
                return 'notRequired';
            }

            if (!navigraph || navigraph !== dataStore.versions.value?.navigraph?.[type] || emptyDB) {
                const fetchedData = await $fetch<NavigraphNavDataShort>(`/api/data/navigraph/data${ store.user?.hasFms ? '' : '/outdated' }?airac=${ dataStore.versions.value?.navigraph?.[type] }&version=${ store.version }`);

                await clientDB.navigraphData.clear();
                await clientDB.navigraphAirports.clear();
                await clientDB.navigraphDB.clear();

                await upsertBagsByIdentifier('airways', fetchedData.airways);
                await upsertBagsByIdentifier('waypoints', fetchedData.waypoints);
                await upsertBagsByIdentifier('vhf', fetchedData.vhf);
                await upsertBagsByIdentifier('ndb', fetchedData.ndb);

                for (const key in fetchedData) {
                    await clientDB.navigraphData.put(fetchedData[key as keyof typeof fetchedData] as any, key as any);
                }

                await clientDB.navigraphData.put('1', 'inserted');

                notRequired = false;
            }

            dataStore.navigraph.version.value = dataStore.versions.value?.navigraph?.[type] ?? '';
            if (notRequired) return 'notRequired';
        }
        catch (e) {
            if (useIsDebug()) {
                console.error('navigraph', e);
                return 'notRequired';
            }
            else throw e;
        }
    });
}

export function checkForAirlines() {
    return initCheck('airlines', async ({ dataStore }) => {
        const airlines = await clientDB.keyVal.get('airlinesVersion') as string | undefined;
        let notRequired = true;
        if (!airlines || Date.now() > new Date(airlines).getTime()) {
            const data = await $fetch<RadarDataAirlinesAllList>('/api/data/airlines?v=1');

            await clientDB.keyVal.bulkAdd(Object.values(data.all), Object.keys(data.all).map(x => `airline-${ x }`));
            await clientDB.keyVal.bulkAdd(Object.values(data.virtual), Object.keys(data.virtual).map(x => `airline-${ x }-virtual`));
            await clientDB.keyVal.put(new Date(Date.now() + (1000 * 60 * 60 * 24 * 7)).toISOString(), 'airlinesVersion');
            notRequired = false;
        }

        if (notRequired) return 'notRequired';
    });
}
