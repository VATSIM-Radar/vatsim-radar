import { useMapStore } from '~/store/map';
import type { VatDataVersions } from '~/types/data';
import type { VRInitStatus, VRInitStatusResult } from '~/store';
import { useStore } from '~/store';
import type { IDBAirlinesData } from '~/utils/client-db';
import { clientDB } from '~/utils/client-db';
import type { VatSpyAPIData } from '~/types/data/vatspy';
import type { NavigraphNavDataShort } from '~/utils/backend/navigraph/navdata/types';
import type {
    RadarDataAirlinesAllList,
    SimAwareAPIData,
    VatglassesAPIData,
    VatglassesDynamicAPIData,
} from '~/utils/backend/storage';
import type { UseDataStore } from '~/composables/data';

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
                        const { ready } = await $fetch('/api/data/status');
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
        let vatspy = await clientDB.get('data', 'vatspy') as VatSpyAPIData | undefined;
        if (!vatspy || vatspy.version !== dataStore.versions.value!.vatspy) {
            vatspy = await $fetch<VatSpyAPIData>('/api/data/vatspy');

            await clientDB.put('data', vatspy, 'vatspy');
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

    const closestDates = dataStore.vatsim.tracks.value.slice(0).sort((a, b) => a.valid_to.getTime() - b.valid_to.getTime());
    const closestTime = closestDates[0]?.valid_to.getTime();
    if (!closestTime) return true;

    return dataStore.time.value > closestTime ? closestTime : false;
});

export function checkForTracks() {
    return initCheck('tracks', async ({ dataStore }) => {
        if (!tracksExpired.value) return false;

        dataStore.vatsim.tracks.value = (await $fetch<VatsimNattrak[]>(`/api/data/tracks?d=${ !dataStore.vatsim.tracks.value.length ? '0' : tracksExpired.value }`)).map(x => ({
            ...x,
            valid_from: new Date(x.valid_from),
            valid_to: new Date(x.valid_to),
        }));
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
        if (!isVatGlassesActive.value) return 'notRequired';
        let vatglasses = await clientDB.get('data', 'vatglasses') as VatglassesAPIData | undefined;

        if (!vatglasses || vatglasses.version !== dataStore.versions.value!.vatglasses) {
            vatglasses = await $fetch<VatglassesAPIData>('/api/data/vatglasses');
            await clientDB.put('data', vatglasses, 'vatglasses');
        }

        dataStore.vatglasses.value = vatglasses.version;

        if (isVatGlassesActive.value) {
            await getVatglassesDynamic(dataStore);
        }
        else return 'notRequired';
    });
}

export function checkForNavigraph() {
    return initCheck('navigraph', async ({ store, dataStore }) => {
        try {
            const navigraph = await dataStore.navigraph.data('version');

            const type = store.user?.hasFms ? 'current' : 'outdated';
            let notRequired = true;

            const keys: Array<keyof NavigraphNavDataShort> = ['airways', 'holdings', 'waypoints', 'vhf', 'ndb'];

            if (navigraph && navigraph === dataStore.versions.value?.navigraph?.[type] && !keys.length) {
                dataStore.navigraph.version.value = navigraph;
                return 'notRequired';
            }

            if (!navigraph || navigraph !== dataStore.versions.value?.navigraph?.[type]) {
                const fetchedData = await $fetch<NavigraphNavDataShort>(`/api/data/navigraph/data${ store.user?.hasFms ? '' : '/outdated' }?keys=${ keys.join(',') }&airac=${ dataStore.versions.value?.navigraph?.[type] }&version=${ store.version }`);

                await clientDB.clear('navigraphData');
                await clientDB.clear('navigraphAirports');

                if (keys.includes('airways')) {
                    fetchedData.parsedAirways = {};

                    for (const [airway, data] of Object.entries(fetchedData.airways)) {
                        const identifier = data[0];
                        if (!fetchedData.parsedAirways[identifier]) fetchedData.parsedAirways[identifier] = {};
                        fetchedData.parsedAirways[identifier][airway] = data;
                    }
                }

                if (keys.includes('waypoints')) {
                    fetchedData.parsedWaypoints = {};

                    for (const [waypoint, data] of Object.entries(fetchedData.waypoints)) {
                        const identifier = data[0];
                        if (!fetchedData.parsedWaypoints[identifier]) fetchedData.parsedWaypoints[identifier] = {};
                        fetchedData.parsedWaypoints[identifier][waypoint] = data;
                    }
                }

                if (keys.includes('vhf')) {
                    fetchedData.parsedVHF = {};

                    for (const [vhf, data] of Object.entries(fetchedData.vhf)) {
                        const identifier = data[1];
                        if (!fetchedData.parsedVHF[identifier]) fetchedData.parsedVHF[identifier] = {};
                        fetchedData.parsedVHF[identifier][vhf] = data;
                    }
                }

                if (keys.includes('waypoints')) {
                    fetchedData.parsedNDB = {};

                    for (const [ndb, data] of Object.entries(fetchedData.ndb)) {
                        const identifier = data[1];
                        if (!fetchedData.parsedNDB[identifier]) fetchedData.parsedNDB[identifier] = {};
                        fetchedData.parsedNDB[identifier][ndb] = data;
                    }
                }

                for (const key in fetchedData) {
                    await clientDB.put('navigraphData', fetchedData[key as keyof typeof fetchedData] as any, key as any);
                }

                await clientDB.put('navigraphData', dataStore.versions.value?.navigraph?.[type] ?? '' as any, 'version');

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
