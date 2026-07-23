import type { DataUpdateContext } from '~/composables/render/update/index';
import type { VatsimShortenedController } from '~/types/data/vatsim';
import type { VatSpyAirport, VatSpyData, VatSpyDataProperties } from '~/types/data/vatspy';
import type { Feature, MultiPolygon } from 'geojson';
import { getFacilityByCallsign, getTraconPrefixes, getTraconSuffix } from '~/utils/shared/vatsim';
import type { SimAwareDataFeature } from '~/utils/server/storage';
import type { DataAirport, DataSector } from '~/composables/render/storage';
import { checkForVATSpy } from '~/composables/init';
import { debugBookings, debugControllers } from '~/composables/render/update/utils';
import { duplicatingSettings } from '~/utils/server/vatsim/atc-duplicating';
import { getSimAwareFeatures } from '~/composables/render/airports';
import { selectMapBookings } from '~/utils/shared/bookings';

export const callsignSplitRegex = /_+/gm;

let uirsMap: Record<string, VatSpyData['uirs'][0]> | undefined;
const uirsMapByCallsign: Record<string, string[]> = {};

const firsMap: Record<string, VatSpyData['firs'][0]> = {};
const firsMapByIcao: Record<string, string[]> = {};
const firsMapByCallsign: Record<string, string[]> = {};

export interface FirFindResult {
    fir?: VatSpyData['firs'][0];
    feature: Feature<MultiPolygon, VatSpyDataProperties>;
}

async function filterFirsForList(list: string[] | undefined, callsign: string) {
    if (!list?.length) return [];

    const dataStore = useDataStore();

    const result: {
        fir: VatSpyData['firs'][0];
        feature: Feature<MultiPolygon, VatSpyDataProperties>;
        symbols: number;
        exact: boolean;
    }[] = [];

    let callsignSplit = callsign.split(callsignSplitRegex);
    callsignSplit = callsignSplit.slice(0, callsignSplit.length - 1);

    const callsignMiddle = callsignSplit.join('_');

    let maxStart = 0;
    const foundExact = false;

    for (const item of list) {
        const fir = firsMap[item];
        const exact = false;

        if (!fir || ((!fir.callsign || !callsign.startsWith(fir.callsign)) && !callsign.startsWith(fir.icao))) {
            continue;
        }

        let word = '';

        for (let i = 0; i < (fir.callsign ?? fir.icao).length - 1; i++) {
            word += (fir.callsign ?? fir.icao).slice(0, i + 1);

            if ((!fir.callsign || !callsign.startsWith(fir.callsign)) && !callsign.startsWith(fir.icao)) break;
        }

        let length = word.length;

        if (fir.callsign === callsignMiddle || fir.icao === callsignMiddle) length = 100;

        if (length < maxStart) {
            continue;
        }
        maxStart = length;

        const features = await dataStore.vatspyBoundary(fir.boundary);

        if (!features.length) {
            continue;
        }

        result.push({
            fir,
            feature: features.length === 1
                ? features[0]
                : features.find(x => x.properties.oceanic === callsign.endsWith('_FSS')) ?? features[0],
            symbols: length,
            exact,
        });
    }

    return result.filter(x => (!foundExact || x.exact) && x.symbols === maxStart);
}

function findFirsForCallsign(callsign: string, prefix?: string) {
    return filterFirsForList([
        ...firsMapByCallsign[prefix || callsign] ?? [],
        ...firsMapByIcao[prefix || callsign] ?? [],
    ], callsign);
}

function findUirForCallsign(callsign: string, prefix: string) {
    const list = uirsMapByCallsign[prefix] ?? [];
    if (!list?.length) return undefined;

    const result: {
        uir: VatSpyData['uirs'][0];
        symbols: number;
        exact: boolean;
    }[] = [];

    let callsignSplit = callsign.split(callsignSplitRegex);
    callsignSplit = callsignSplit.slice(0, callsignSplit.length - 1);

    const callsignMiddle = callsignSplit.join('_');

    let maxStart = 0;
    const foundExact = false;

    for (const item of list) {
        const uir = uirsMap?.[item];
        const exact = false;

        if (!uir || !callsign.startsWith(uir.icao)) {
            continue;
        }

        const word = '';

        for (let i = 0; i < uir.icao.length; i++) {
            if (!callsign.startsWith(uir.icao)) break;
        }

        let length = word.length;

        if (uir.icao === callsignMiddle) length = 100;

        if (length < maxStart) {
            continue;
        }
        maxStart = length;

        result.push({
            uir,
            symbols: length,
            exact,
        });
    }

    return result.find(x => (!foundExact || x.exact) && x.symbols === maxStart);
}

function addSector(context: DataUpdateContext, sector: FirFindResult, controller: VatsimShortenedController | null, uir?: DataSector['uir']) {
    const sectorKey = !sector.fir
        ? sector.feature.properties.id + sector.feature.properties.oceanic
        : sector.fir.boundary + sector.feature.properties.oceanic;

    const existingSector = context.sectors[sectorKey];

    if (existingSector?.uir && controller && !uir) {
        existingSector.uirWithFir = true;
    }

    if (existingSector && controller) {
        // Don't add booking controllers to same sectors
        if (controller.isBooking && existingSector.atc.length) {
            const similar = existingSector.atc.find(x => !x.isBooking && x.callsign === controller.callsign);

            if (similar) similar.booking = controller.booking;

            return;
        }

        if (!existingSector.atc.some(x => x.callsign === controller.callsign)) {
            existingSector.atc.push(controller);
        }
    }
    else if (!existingSector) {
        context.sectors[sectorKey] = {
            fir: sector.fir,
            uir,
            feature: sector.feature,
            atc: controller ? [controller] : [],
        };
    }
}

const testedCallsigns = new Set<string>();

let testedResetInterval: NodeJS.Timeout;

export async function updateControllers(context: DataUpdateContext) {
    const dataStore = useDataStore();
    const store = useStore();
    const facilities = useFacilitiesIds();

    if (!testedResetInterval) {
        testedResetInterval = setInterval(() => {
            // Memory leak prevention
            testedCallsigns.clear();
        }, 1000 * 60 * 60);
    }

    if (!uirsMap) {
        if (dataStore.vatspy.value && !dataStore.vatspy.value.data.uirs?.length) {
            dataStore.versions.value!.vatspy = '';
            await checkForVATSpy();
        }

        if (dataStore.vatspy.value && dataStore.vatspy.value?.data.uirs?.length && dataStore.vatspy.value?.data.firs?.length) {
            uirsMap = {};

            for (const uir of dataStore.vatspy.value?.data.uirs ?? []) {
                const icao = uir.icao.split(callsignSplitRegex)[0];

                uirsMap[uir.icao] = uir;

                uirsMapByCallsign[icao] ??= [];
                uirsMapByCallsign[icao].push(uir.icao);
            }

            for (const fir of dataStore.vatspy.value?.data.firs ?? []) {
                const icao = fir.icao.split(callsignSplitRegex)[0];
                const callsign = fir.callsign && fir.callsign.split(callsignSplitRegex)[0];
                // const boundary = fir.boundary && fir.boundary.split(callsignSplitRegex)[0];

                const key = fir.callsign ? `${ fir.icao }-${ fir.callsign }` : fir.icao;

                firsMap[key] = fir;

                firsMapByIcao[icao] ??= [];
                firsMapByIcao[icao].push(key);

                // firsMapByBoundary[boundary] ??= [];
                // firsMapByBoundary[boundary].push(key);

                firsMapByCallsign[callsign ?? icao] ??= [];
                firsMapByCallsign[callsign ?? icao].push(key);
            }
        }
    }

    let bookings = ((getKeyedValueFromSettings('map.bookings.enabled') && !store.config.hideBookings && !store.activeFilter) || store.bookingOverride) ? store.bookings : [];

    if (!store.bookingOverride) {
        const now = Date.now();
        const visibleUntil = now + (getKeyedValueFromSettings('map.bookings.hours') * 60 * 60 * 1000);

        bookings = selectMapBookings(bookings, now, visibleUntil);
    }

    const realCallsigns = new Set(dataStore.vatsim.data.controllers.value.map(x => x.callsign));
    const duplicatedPositions: Record<string, VatsimShortenedController> = {};

    const controllers = [
        ...(store.bookingOverride ? [] : dataStore.vatsim.data.controllers.value),
        ...(store.bookingOverride ? [] : dataStore.vatsim.data.atis.value),
        ...bookings.map(({ atc, ...rest }) => ({
            ...atc,
            facility: getFacilityByCallsign(atc.callsign),
            booking: rest,
            isBooking: true,
        } satisfies VatsimShortenedController)),
    ];

    if (debugControllers.value?.length) {
        controllers.unshift(...debugControllers.value.filter(x => x.visual_range !== -1000));
    }

    if (debugBookings.value.length) {
        controllers.push(...debugBookings.value.map(({ atc, ...rest }) => ({
            ...atc,
            booking: rest,
            isBooking: true,
        })));
    }

    const shouldDuplicateArtccApp = getKeyedValueFromSettings('map.visibility.artccTracons');

    for (const controller of controllers) {
        const freq = parseFloat(controller.frequency || '0');
        if (freq > 137 || freq < 117) continue;

        if (!controller.duplicated && !testedCallsigns.has(controller.callsign) && !context.atcAdded?.has(controller.callsign)) {
            let match = false;

            for (const setting of duplicatingSettings) {
                if (controller.text_atis?.length && (
                    setting.matchRegex?.test(controller.callsign) || ((setting.prefixes?.length || setting.suffixes?.length) &&
                        (!setting.prefixes?.length || setting.prefixes?.some(x => controller.callsign.startsWith(x))) &&
                        (!setting.suffixes?.length || setting.suffixes?.some(x => controller.callsign.endsWith(x)))
                    ))) {
                    match = true;
                    const atisText = controller.text_atis.join(' ');

                    for (let [areaText, targetCallsign] of Object.entries(setting.mapping)) {
                        if (typeof RegExp.escape === 'function') areaText = RegExp.escape(areaText);
                        else areaText = areaText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                        const areaTextRegExp = new RegExp(`\\b${ areaText }\\b`, 'i');

                        if (areaTextRegExp.test(atisText) && controller.callsign !== targetCallsign) {
                            if (!realCallsigns.has(targetCallsign)) {
                                const duplicated = {
                                    ...controller,
                                    facility: getFacilityByCallsign(targetCallsign),
                                    callsign: targetCallsign,
                                    duplicatedBy: controller.callsign,
                                    duplicated: true,
                                };

                                if (!shouldDuplicateArtccApp && controller.facility !== duplicated.facility) continue;

                                // Priority to app
                                if (duplicatedPositions[duplicated.callsign]) {
                                    if (duplicatedPositions[duplicated.callsign].facility > controller.facility) {
                                        Object.assign(duplicatedPositions[duplicated.callsign], duplicated);
                                    }
                                }
                                else {
                                    duplicatedPositions[duplicated.callsign] = duplicated;
                                    controllers.push(duplicated);
                                }
                            }
                        }
                    }
                }
            }

            if (controller.text_atis?.length && !match) testedCallsigns.add(controller.callsign);
        }

        const callsign = controller.callsign.replaceAll(callsignSplitRegex, '_');
        const split = controller.callsign.split('_');
        const isATIS = callsign.endsWith('ATIS');
        const prefix = split[0];
        const middleName = split.length === 3 ? split.slice(0, 2) : prefix;

        if (!isATIS && (controller.facility === facilities.CTR || controller.facility === facilities.FSS)) {
            if (!uirsMap) continue;

            const uir = findUirForCallsign(callsign, prefix);

            if (uir) {
                let foundFir = false;

                for (const fir of uir.uir.firs.split(',')) {
                    const firs = await findFirsForCallsign(fir);
                    foundFir ||= !!firs.length;

                    firs.forEach(x => addSector(context, x, controller, uir.uir));
                }

                if (foundFir) continue;
            }

            // TODO: restore aeronav logic
            const firs = await findFirsForCallsign(callsign, prefix);

            firs.forEach(x => addSector(context, x, controller));
        }
        else {
            const isApp = controller.facility === facilities.APP;

            // TWR is also supported in SimAware TRACON
            const traconFeatures = (!isATIS && (isApp || controller.facility === facilities.TWR)) ? await getSimAwareFeatures(dataStore, prefix) : [];

            let feature: SimAwareDataFeature | undefined;
            let backupFeature: SimAwareDataFeature | undefined;
            let validPrefix = '';
            let backupPrefix = '';

            for (const sector of traconFeatures) {
                const suffix = getTraconSuffix(sector);
                if (!isApp && !suffix) continue;
                if (suffix && !callsign.endsWith(suffix)) continue;

                const prefixes = getTraconPrefixes(sector);

                const middlePrefix = prefixes.find(x => x === middleName);
                const secondPrefix = (split.length === 3 && prefixes.find(x => x.split('_').length === 2 && callsign.startsWith(x)));

                if (middlePrefix || secondPrefix) {
                    feature ??= sector;
                    validPrefix = middlePrefix || secondPrefix || '';
                    break;
                }

                const regularPrefix = prefixes.find(x => callsign.startsWith(x));

                if (regularPrefix) {
                    backupFeature ??= sector;
                    backupPrefix = regularPrefix;
                    break;
                }
            }

            feature ??= backupFeature;
            validPrefix ??= backupPrefix;

            if (validPrefix) {
                validPrefix = validPrefix.split('_')[0];
            }

            const iataAirport =
                dataStore.vatspy.value?.data.keyAirports.realIata[prefix] ||
                dataStore.vatspy.value?.data.keyAirports.iata[prefix] ||
                dataStore.vatspy.value?.data.keyAirports.realIata[validPrefix] ||
                dataStore.vatspy.value?.data.keyAirports.iata[validPrefix];

            const icaoAirport = dataStore.vatspy.value?.data.keyAirports.realIcao[prefix] ||
                dataStore.vatspy.value?.data.keyAirports.icao[prefix] ||
                dataStore.vatspy.value?.data.keyAirports.realIcao[validPrefix] ||
                dataStore.vatspy.value?.data.keyAirports.icao[validPrefix];

            let airport: Partial<VatSpyAirport> | null = null;

            if (iataAirport && icaoAirport && icaoAirport.iata && icaoAirport.iata !== iataAirport.iata) {
                airport = {};
                Object.assign(airport, {
                    ...iataAirport,
                    iata: icaoAirport.iata,
                    tracon: feature?.id,
                });
            }
            else if (iataAirport || icaoAirport) {
                airport = {};
                Object.assign(airport, iataAirport ?? icaoAirport);
            }

            let dataAirport: DataAirport | undefined;

            if (isApp && !feature && airport?.isPseudo) continue;

            if (!airport && feature) {
                const key = validPrefix ?? feature.properties.id;
                context.airportsAdded.add(key);
                context.airports[key] ??= {
                    icao: validPrefix ?? feature.properties.id,
                    aircraft: {},
                    atc: [],
                    atis: {},
                    aircraftCount: 0,
                };

                dataAirport = context.airports[key];
            }
            else if (airport) {
                context.airportsAdded.add(airport.icao!);
                context.airports[airport.icao!] ??= {
                    icao: airport.icao!,
                    iata: airport.iata,
                    airport: airport as VatSpyAirport,
                    aircraft: {},
                    atc: [],
                    atis: {},
                    aircraftCount: 0,
                };

                if (!context.airports[airport.icao!].airport) context.airports[airport.icao!].airport = airport as VatSpyAirport;

                dataAirport = context.airports[airport.icao!];
                if (context.airports[airport.icao!].airport?.isPseudo && (!airport.isPseudo || context.airports[airport.icao!].aircraftCount)) context.airports[airport.icao!].airport!.isPseudo = false;
            }

            if (!dataAirport) continue;

            // Booking ATC are added last, so that makes sense
            if (controller.isBooking && dataAirport.atc.some(x => x.facility === controller.facility)) {
                const similar = dataAirport.atc.find(x => x.callsign === controller.callsign && !x.isBooking);

                if (similar) similar.booking = controller.booking;

                continue;
            }

            dataAirport.atc.push({ ...controller, isATIS });
        }
    }

    for (const sector of Object.values(context.sectors)) {
        sector.atc = sector.atc.filter(x => !context.atcAdded?.has(x.callsign));
    }

    for (const airport of Object.values(context.airports)) {
        airport.atc = airport.atc.filter(x => !context.atcAdded?.has(x.callsign) || x.facility <= facilities.TWR);
    }
}
