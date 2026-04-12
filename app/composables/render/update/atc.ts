import type { DataUpdateContext } from '~/composables/render/update/index';
import type { VatsimShortenedController } from '~/types/data/vatsim';
import type { VatSpyAirport, VatSpyData, VatSpyDataProperties } from '~/types/data/vatspy';
import type { Feature, MultiPolygon } from 'geojson';
import { getTraconPrefixes, getTraconSuffix } from '~/utils/shared/vatsim';
import type { SimAwareDataFeature } from '~/utils/server/storage';
import type { DataAirport } from '~/composables/render/storage';

const callsignSplitRegex = /_+/;
const vatspySplitRegex = /[-_]/;

let uirsMap: Record<string, VatSpyData['uirs'][0]> | undefined;

const firsMap: Record<string, VatSpyData['firs'][0]> = {};
const firsMapByIcao: Record<string, string[]> = {};
const firsMapByCallsign: Record<string, string[]> = {};

export interface FirFindResult {
    fir: VatSpyData['firs'][0];
    feature: Feature<MultiPolygon, VatSpyDataProperties>;
}

async function filterFirsForList(list: string[], callsign: string) {
    const dataStore = useDataStore();

    const result: {
        fir: VatSpyData['firs'][0];
        feature: Feature<MultiPolygon, VatSpyDataProperties>;
    }[] = [];

    for (const item of list) {
        const fir = firsMap[item];
        if (!fir || (fir.callsign && !callsign.startsWith(fir.callsign)) || !callsign.startsWith(fir.icao)) continue;

        const features = await dataStore.vatspy.value?.feature(fir.boundary) ?? [];
        if (!features.length) continue;
        result.push({
            fir,
            feature: features.length === 1
                ? features[0]
                : features.find(x => x.properties.oceanic === callsign.endsWith('_FSS')) ?? features[0],
        });
    }

    return result;
}

async function findFirsForCallsign(callsign: string, prefix?: string) {
    const fir = await filterFirsForList(firsMapByCallsign[prefix || callsign], callsign);
    if (fir.length) return fir;

    return filterFirsForList(firsMapByIcao[prefix || callsign], callsign);
}

function addSector(context: DataUpdateContext, sector: FirFindResult, controller: VatsimShortenedController) {
    const sectorKey = sector.fir.callsign ? `${ sector.fir.callsign }-${ sector.fir.icao }` : sector.fir.icao;
    const existingSector = context.sectors[sectorKey];
    if (existingSector) existingSector.atc.push(controller);
    else {
        context.sectors[sectorKey] = {
            fir: sector.fir,
            feature: sector.feature,
            atc: [controller],
        };
    }
}

export async function updateControllers(context: DataUpdateContext) {
    const dataStore = useDataStore();
    const store = useStore();
    const facilities = useFacilitiesIds();

    if (!uirsMap) {
        if (dataStore.vatspy.value) {
            uirsMap = {};

            for (const uir of dataStore.vatspy.value?.data.uirs ?? []) {
                uirsMap[uir.icao.split(vatspySplitRegex)[0]] = uir;
            }

            for (const fir of dataStore.vatspy.value?.data.firs ?? []) {
                const icao = fir.icao.split(vatspySplitRegex)[0];
                const callsign = fir.callsign && fir.callsign.split(vatspySplitRegex)[0];
                // const boundary = fir.boundary && fir.boundary.split(vatspySplitRegex)[0];

                const key = fir.callsign ? `${ fir.icao }-${ fir.callsign }` : fir.icao;

                firsMap[key] = fir;

                firsMapByIcao[icao] ??= [];
                firsMapByIcao[icao].push(key);

                // firsMapByBoundary[boundary] ??= [];
                // firsMapByBoundary[boundary].push(key);

                if (callsign) {
                    firsMapByCallsign[callsign] ??= [];
                    firsMapByCallsign[callsign].push(key);
                }
            }

            // Cleanup
            dataStore.vatspy.value.data.firs.length = 0;
            dataStore.vatspy.value.data.uirs.length = 0;
        }
    }

    const bookings = (((store.mapSettings.visibility?.bookings ?? true) && !store.config.hideBookings) || store.bookingOverride) ? store.bookings : [];

    const controllers = [
        ...(store.bookingOverride ? [] : dataStore.vatsim.data.controllers.value),
        ...(store.bookingOverride ? [] : dataStore.vatsim.data.atis.value),
        ...bookings.map(({ atc, ...rest }) => ({
            ...atc,
            booking: rest,
            isBooking: true,
        } satisfies VatsimShortenedController)),
    ];

    for (const controller of controllers) {
        // Already in VATGlasses, skipping
        if (context.atcAdded?.has(controller.callsign)) continue;

        const callsign = controller.callsign.replaceAll(callsignSplitRegex, '_');
        const split = controller.callsign.split('_');
        const isATIS = callsign.endsWith('ATIS');
        const prefix = split[0];
        const middleName = split.length === 3 ? split.slice(0, 2) : prefix;

        if (!isATIS && controller.facility === facilities.CTR || controller.facility === facilities.FSS) {
            if (!uirsMap) continue;

            const uir = uirsMap[prefix];
            if (uir) {
                let foundFir = false;

                for (const fir of uir.firs) {
                    const firs = await findFirsForCallsign(fir);
                    foundFir ||= !!firs.length;

                    firs.forEach(x => addSector(context, x, controller));
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
            const traconFeatures = (!isATIS && (isApp || controller.facility === facilities.TWR)) ? await dataStore.simaware(prefix) : [];

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

            if (!airport && feature) {
                const key = feature?.properties.id + feature?.properties.prefix.join(',');
                context.airportsAdded.add(key);
                context.airports[key] ??= {
                    icao: validPrefix ?? feature.properties.id,
                    aircraft: {},
                    atc: [],
                    atis: {},
                };

                dataAirport = context.airports[key];
            }
            else if (airport) {
                context.airportsAdded.add(airport.icao!);
                context.airports[airport.icao!] ??= {
                    icao: airport.icao!,
                    iata: airport.iata,
                    aircraft: {},
                    atc: [],
                    atis: {},
                };

                dataAirport = context.airports[airport.icao!];
            }

            if (!dataAirport) continue;

            dataAirport.atc.push({ ...controller, isATIS });

            if (feature) {
                dataAirport.features ??= [];
                const existingFeature = dataAirport.features.find(x => x.id === feature?.properties.id);
                if (existingFeature) existingFeature.controllers.push(controller);
                else {
                    dataAirport.features.push({
                        id: feature.properties.id,
                        controllers: [controller],
                        traconFeature: feature,
                    });
                }
            }
        }
    }
}
