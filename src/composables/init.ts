import { useMapStore } from '~/store/map';
import type { VatDataVersions } from '~/types/data';
import type { VRInitStatus, VRInitStatusResult } from '~/store';
import { useStore } from '~/store';
import type { ClientNavigraphData, IDBAirlinesData, IDBNavigraphData } from '~/utils/client-db';
import { clientDB } from '~/utils/client-db';
import type { VatSpyAPIData } from '~/types/data/vatspy';
import type { NavigraphNavDataShort } from '~/utils/backend/navigraph/navdata/types';
import type {
    RadarDataAirlinesAllList,
    SimAwareAPIData,
    VatglassesAPIData,
    VatglassesDynamicAPIData,
} from '~/utils/backend/storage';
import { isVatGlassesActive } from '~/utils/data/vatglasses';
import type { UseDataStore } from '~/composables/data';

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
        let vatspy = await clientDB.get('data', 'vatspy') as VatSpyAPIData | undefined;
        if (!vatspy || vatspy.version !== dataStore.versions.value!.vatspy) {
            vatspy = await $fetch<VatSpyAPIData>('/api/data/vatspy');
            await clientDB.put('data', vatspy, 'vatspy');
            notRequired = false;
        }

        dataStore.vatspy.value = vatspy;
        if (notRequired) return 'notRequired';
    });
}

export function checkForSimAware() {
    return initCheck('simaware', async ({ dataStore }) => {
        let simaware = await clientDB.get('data', 'simaware') as SimAwareAPIData | undefined;
        let notRequired = true;
        if (!simaware || simaware.version !== dataStore.versions.value!.simaware) {
            simaware = await $fetch<SimAwareAPIData>('/api/data/simaware');
            await clientDB.put('data', simaware, 'simaware');
            notRequired = false;
        }

        dataStore.simaware.value = simaware;
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
        let vatglasses = await clientDB.get('data', 'vatglasses') as VatglassesAPIData | undefined;

        if (!vatglasses || vatglasses.version !== dataStore.versions.value!.vatglasses) {
            vatglasses = await $fetch<VatglassesAPIData>('/api/data/vatglasses');
            await clientDB.put('data', vatglasses, 'vatglasses');
        }

        if (isVatGlassesActive.value) {
            dataStore.vatglasses.value = vatglasses;
            await getVatglassesDynamic(dataStore);
        }
        else return 'notRequired';
    });
}

export function checkForNavigraph() {
    return initCheck('navigraph', async ({ store, dataStore }) => {
        let navigraph = await clientDB.get('data', 'navigraph') as IDBNavigraphData['value'] | undefined;

        const type = store.user?.hasFms ? 'current' : 'outdated';
        let notRequired = true;

        let keys: Array<keyof NavigraphNavDataShort> = ['airways', 'holdings', 'waypoints'];

        if (store.mapSettings.navigraphData?.vordme) {
            keys.push('vhf');
        }

        if (store.mapSettings.navigraphData?.ndb) {
            keys.push('ndb');
        }

        if (navigraph && navigraph.version === dataStore.versions.value?.navigraph?.[type]) {
            keys = keys.filter(x => !navigraph?.data[x]);
        }

        if (navigraph && navigraph.version === dataStore.versions.value?.navigraph?.[type] && !keys.length) {
            dataStore.navigraph.version.value = navigraph.version;
            dataStore.navigraph.data.value = navigraph.data;
            return 'notRequired';
        }

        // TODO: delete STARSID data
        if (!navigraph || navigraph.version !== dataStore.versions.value?.navigraph?.[type] || !keys.every(x => navigraph?.data[x])) {
            const fetchedData = await $fetch<NavigraphNavDataShort>(`/api/data/navigraph/data${ store.user?.hasFms ? '' : '/outdated' }?keys=${ keys.join(',') }&version=${ store.version }`);

            if (keys.includes('airways')) {
                fetchedData.parsedAirways = {};

                for (const [airway, data] of Object.entries(fetchedData.airways)) {
                    const identifier = data[0];
                    if (!fetchedData.parsedAirways[identifier]) fetchedData.parsedAirways[identifier] = {};
                    fetchedData.parsedAirways[identifier][airway] = data;
                }
            }

            navigraph = {
                version: dataStore.versions.value?.navigraph?.[type] ?? '',
                data: Object.assign(navigraph?.data ?? {}, fetchedData) as ClientNavigraphData,
            };
            await clientDB.put('data', navigraph, 'navigraph');
            notRequired = false;
        }

        dataStore.navigraph.version.value = navigraph.version;
        dataStore.navigraph.data.value = navigraph.data;
        if (notRequired) return 'notRequired';
    });
}

export function checkForAirlines() {
    return initCheck('airlines', async ({ dataStore }) => {
        let airlines = await clientDB.get('data', 'airlines') as IDBAirlinesData['value'] | undefined;
        let notRequired = true;
        if (!airlines || !airlines.expireDate || Date.now() > airlines.expireDate) {
            const data = await $fetch<RadarDataAirlinesAllList>('/api/data/airlines?v=1');
            airlines = {
                expireDate: Date.now() + (1000 * 60 * 60 * 24 * 7),
                airlines: data,
            };
            await clientDB.put('data', airlines, 'airlines');
            notRequired = false;
        }

        dataStore.airlines.value = airlines.airlines;
        if (notRequired) return 'notRequired';
    });
}
