import { useMapStore } from '~/store/map';
import type { VatDataVersions } from '~/types/data';
import type { VRInitStatus, VRInitStatusResult } from '~/store';
import { useStore } from '~/store';
import { clientDB } from '~/composables/render/idb';
import type { VatSpyAPIData } from '~/types/data/vatspy';
import type { NavigraphNavDataShort } from '~/utils/server/navigraph/navdata/types';
import type {
    RadarDataAirlinesAllList,
    SimAwareAPIData, SimAwareDataFeature,
    VatglassesAPIData, VatglassesData,
    VatglassesDynamicAPIData, VatglassesPosition,
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

let previousInProgress = false;
export const initFirstCheck = ref(false);

async function checkStatus() {
    if (previousInProgress) return;
    try {
        previousInProgress = true;
        const { ready } = await $fetch<{ ready: boolean }>('/api/data/status', { timeout: 2000 });
        if (ready) {
            return true;
        }
    }
    catch (e) {
        console.error(e);
    }
    finally {
        previousInProgress = false;
        initFirstCheck.value = true;
    }
}

export function checkForUpdates() {
    return initCheck('updatesCheck', async ({ mapStore, dataStore }) => {
        const ready = await checkStatus();

        if (!ready) {
            await new Promise<void>(resolve => {
                const interval = setInterval(async () => {
                    const status = await checkStatus();
                    if (status) {
                        resolve();
                        clearInterval(interval);
                    }
                }, 3000);
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

            await clientDB.data.put(vatspy, 'vatspy').catch(() => {
                clientDB.delete();
                location.reload();
            });

            try {
                await clientDB.vatspy.clear();
                await clientDB.vatspy.bulkPut(Object.values(vatspy.data.features), Object.keys(vatspy.data.features));
                await clientDB.vatspy.put(vatspy.version, 'version');
            }
            catch {
                clientDB.delete();
                location.reload();
            }

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

        // @ts-expect-error intended
        delete vatspy.data.airports;

        // @ts-expect-error intended
        delete vatspy.data.features;

        dataStore.vatspy.value = {
            version: vatspy.version,
            data: vatspy.data,
            feature: async key => {
                const result = await clientDB.vatspy.get(key);

                return typeof result === 'object' ? result : null;
            },
        };
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
        const simaware = await clientDB.simaware.get('version') as string | undefined;
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

            try {
                await clientDB.simaware.bulkPut(Object.values(groups), Object.keys(groups));
                await clientDB.simaware.put(data.version, 'version');
            }
            catch {
                clientDB.delete();
                location.reload();
            }
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
        const vatglassesVersion = await clientDB.vatglasses.get('version') as string | undefined;

        if (!vatglasses || !vatglassesVersion || vatglasses.version !== dataStore.versions.value!.vatglasses || vatglassesVersion !== dataStore.versions.value!.vatglasses) {
            vatglasses = await $fetch<VatglassesAPIData>('/api/data/vatglasses');
            await clientDB.data.put(vatglasses, 'vatglasses').catch(() => {
                clientDB.delete();
                location.reload();
            });

            const data = vatglasses.data;
            if (!data) throw new Error('VATGlasses data is unavailable');

            await clientDB.vatglasses.clear();

            const vgPositions: Record<string, VatglassesPosition[] | VatglassesData[string]> = {};

            for (const country in data) {
                vgPositions[`country-${ country }`] = data[country];

                for (const position in data[country].positions) {
                    let prefixes = data[country].positions[position].pre;
                    if (typeof prefixes === 'string') prefixes = [prefixes];

                    if (!prefixes) continue;
                    for (const prefix of prefixes) {
                        const key = `position-${ prefix.split('_')[0] }`;

                        vgPositions[key] ??= [];
                        (vgPositions[key] as VatglassesPosition[]).push({
                            ...data[country].positions[position],
                            id: position,
                            countryId: country,
                        });
                    }
                }
            }

            await clientDB.vatglasses.bulkPut(Object.values(vgPositions), Object.keys(vgPositions));
            await clientDB.vatglasses.put(dataStore.versions.value!.vatglasses, 'version');
        }

        dataStore.vatglasses.value = vatglasses.version;

        if (isVatGlassesActive.value) {
            await getVatglassesDynamic(dataStore);
        }
        else return 'notRequired';
    });
}

async function upsertBagsByIdentifier<D extends any[], T extends Record<string, D>>(
    prefix: 'airways' | 'waypoints' | 'vhf' | 'ndb' | 'holdings',
    entries: T,
) {
    const mapStore = useMapStore();
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

    try {
        let inserted = 0;
        const total = groupsKeys.length;
        const chunkSize = 1000;
        const initialProgress = mapStore.navigraphUpdateProgress;

        for (let i = 0; i < total; i += chunkSize) {
            const valuesChunk = groupsValues.slice(i, i + chunkSize);
            const keysChunk = groupsKeys.slice(i, i + chunkSize);
            await clientDB.navigraphDB.bulkPut(valuesChunk, keysChunk);
            inserted += valuesChunk.length;

            mapStore.navigraphUpdateProgress = initialProgress + ((inserted / total) * 18);

            await new Promise(resolve => requestAnimationFrame(resolve));
        }
    }
    catch (e) {
        await clientDB.delete();
        throw e;
    }

    groupsKeys.length = 0;
    groupsValues.length = 0;
    (groups as any) = null;
}

async function updateNavigraph() {
    try {
        const store = useStore();
        const mapStore = useMapStore();
        const dataStore = useDataStore();

        mapStore.isNavigraphUpdating = true;

        const type = store.user?.hasFms ? 'current' : 'outdated';
        const fetchedData = await $fetch<NavigraphNavDataShort>(`/api/data/navigraph/data${ store.user?.hasFms ? '' : '/outdated' }?airac=${ dataStore.versions.value?.navigraph?.[type] }&version=${ store.version }`);
        mapStore.navigraphUpdateProgress = 10;

        await clientDB.navigraphData.clear();
        await clientDB.navigraphAirports.clear();
        await clientDB.navigraphDB.clear();
        dataStore.navigraph.version.value = null;

        await upsertBagsByIdentifier('airways', fetchedData.airways);
        await upsertBagsByIdentifier('waypoints', fetchedData.waypoints);
        await upsertBagsByIdentifier('vhf', fetchedData.vhf);
        await upsertBagsByIdentifier('ndb', fetchedData.ndb);
        await upsertBagsByIdentifier('holdings', fetchedData.holdings);

        for (const key in fetchedData) {
            await clientDB.navigraphData.put(fetchedData[key as keyof typeof fetchedData] as any, key as any);
        }

        await clientDB.navigraphData.put('1', 'inserted');
        dataStore.navigraph.version.value = dataStore.versions.value?.navigraph?.[type] ?? '';
        mapStore.isNavigraphUpdating = false;
    }
    catch {
        location.reload();
    }
}

export function checkForNavigraph() {
    return initCheck('navigraph', async ({ store, dataStore }) => {
        try {
            const navigraph = await dataStore.navigraph.data('version');

            const type = store.user?.hasFms ? 'current' : 'outdated';

            const emptyDB = await clientDB.navigraphData.get('inserted') !== '1';

            if (navigraph && navigraph === dataStore.versions.value?.navigraph?.[type] && !emptyDB) {
                dataStore.navigraph.version.value = navigraph;
                return 'notRequired';
            }

            updateNavigraph();
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
        const airlines = await clientDB.airlines.get('version') as string | undefined;
        let notRequired = true;
        if (!airlines || Date.now() > new Date(airlines).getTime()) {
            const data = await $fetch<RadarDataAirlinesAllList>('/api/data/airlines?v=1');

            try {
                await clientDB.airlines.clear();
                await clientDB.airlines.bulkPut(Object.values(data.all), Object.keys(data.all).map(x => x));
                await clientDB.airlines.bulkPut(Object.values(data.virtual), Object.keys(data.virtual).map(x => `${ x }-virtual`));
                await clientDB.airlines.put(new Date(Date.now() + (1000 * 60 * 60 * 24 * 7)).toISOString(), 'version');
            }
            catch {
                clientDB.delete();
                location.reload();
            }

            notRequired = false;
        }

        if (notRequired) return 'notRequired';
    });
}
