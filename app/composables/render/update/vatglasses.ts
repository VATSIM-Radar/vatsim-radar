import {
    isVatGlassesActive,
} from '~/utils/data/vatglasses';
import type { VatglassesSectorProperties, VatglassesActiveAirspaces, VatglassesActivePosition, VatglassesActivePositions } from '~/utils/data/vatglasses';
import type { VatsimShortenedController } from '~/types/data/vatsim';
import type {
    VatglassesAirport,
    VatglassesAirspace,
    VatglassesData, VatglassesPosition,
    VatglassesSector,
} from '~/utils/server/storage';
import { debugControllers, updateAirportAtisConfig } from '~/composables/render/update/utils';
import type { DataUpdateContext } from '~/composables/render/update/index';
import type { Feature as TurfFeature, Polygon as TurfPolygon, Position } from 'geojson';
import { polygon } from '@turf/helpers';
import { stringToArray } from '~/utils/shared';

let worker: Worker | null = null;

export const vatglassesStats = { positions: 0, recombined: 0 };

let facilities: {
    ATIS: number;
    OBS: number;
    FSS: number;
    DEL: number;
    GND: number;
    TWR: number;
    APP: number;
    CTR: number;
};

const ignoredPositions = ['ASIAW', 'ASEAN', 'ASEAS', 'RUSC', 'RUCEN', 'RUWSC', 'RUESC', 'RUWRC', 'RUERC', ['56', 'NY']];

function checkIgnoredPosition(id: string, callsign: string) {
    return ignoredPositions.some(x => typeof x === 'string' ? id === x : x[0] === id && callsign.startsWith(x[1]));
}

function hasNestedEntries<T>(positions: Record<string, Record<string, T>>) {
    return Object.values(positions).some(countryPositions => Object.keys(countryPositions).length);
}

function addFoundControllersToSet(foundControllers: Record<string, Record<string, VatsimShortenedController[]>>, target: Set<string>) {
    for (const countryPositions of Object.values(foundControllers)) {
        for (const controllers of Object.values(countryPositions)) {
            controllers.forEach(controller => target.add(controller.callsign));
        }
    }
}

function preservePreviousSectorsIfCurrentTickIsEmpty(position: VatglassesActivePosition, previousPosition: VatglassesActivePosition | undefined) {
    if (position.atc.length && !position.sectors?.length && previousPosition?.sectors?.length) {
        position.sectors = previousPosition.sectors;
        position.sectorsCombined = previousPosition.sectorsCombined;
        position.sectorsCombinedBands = previousPosition.sectorsCombinedBands;
        position.lastUpdated = previousPosition.lastUpdated;
    }
}

// This function is used for the combined mode. It splits the sectors into smaller parts, each area exists only once in the result. Each split has an altrange which contains the vertical limits of the sector.
function splitSectorsWithWorker(sectors: any): Promise<any> {
    return new Promise((resolve, reject) => {
        if (!worker) return;
        worker.postMessage(['splitSectors', sectors]);

        worker.onmessage = function(event: { data: any }) {
            resolve(event.data);
        };

        worker.onerror = function(error: any) {
            reject(error);
        };
    });
}


function combineSectorsWithWorker(sectors: any): Promise<any> {
    return new Promise((resolve, reject) => {
        if (!worker) return;
        worker.postMessage(['combineSectors', sectors]);

        worker.onmessage = function(event: { data: any }) {
            resolve(event.data);
        };

        worker.onerror = function(error: any) {
            reject(error);
        };
    });
}

function combineSectorsByBandsWithWorker(sectors: any): Promise<any> {
    return new Promise((resolve, reject) => {
        if (!worker) return;
        worker.postMessage(['combineSectorsByBands', sectors]);

        worker.onmessage = function(event: { data: any }) {
            resolve(event.data);
        };

        worker.onerror = function(error: any) {
            reject(error);
        };
    });
}

let lastCombineBandsMode: boolean | null = null;

async function combineAllVatglassesActiveSectors(finalPositions: VatglassesActivePositions) {
    const combineBands = !!getKeyedValueFromSettings('map.vatglasses.combineBands');
    const modeChanged = lastCombineBandsMode !== null && lastCombineBandsMode !== combineBands;
    lastCombineBandsMode = combineBands;

    let positions = 0;
    let recombined = 0;

    for (const countryGroupId in finalPositions) {
        for (const positionId in finalPositions[countryGroupId]) {
            const position = finalPositions[countryGroupId][positionId];
            if (!position) continue;
            positions++;
            // sectorsCombined === null is the signal that the geometry needs to be (re)calculated;
            // a strategy switch forces every position to recompute as well.
            if (position.sectorsCombined === null || modeChanged) {
                recombined++;
                position.lastUpdated = new Date().toISOString();
                const sectors = position.sectors;
                if (sectors) {
                    if (combineBands) {
                        position.sectorsCombinedBands = await combineSectorsByBandsWithWorker(sectors);
                        position.sectorsCombined = [];
                    }
                    else {
                        const splittedSectors = await splitSectorsWithWorker(sectors);

                        if (splittedSectors) {
                            position.sectorsCombined = await combineSectorsWithWorker(splittedSectors);
                        }
                        position.sectorsCombinedBands = null;
                    }
                }
            }
        }
    }

    vatglassesStats.positions = positions;
    vatglassesStats.recombined = recombined;
}

function getActiveSectorsOfAirspace(airspace: VatglassesAirspace, context: DataUpdateContext) {
    const { airports } = context;
    const result: VatglassesSector[] = [];
    for (const sector of airspace.sectors) {
        if (sector.runways) {
            let configActive = true;
            for (const sectorRunway of sector.runways) {
                if (Array.isArray(sectorRunway.runway)) {
                    if (!sectorRunway.runway.includes(airports[sectorRunway.icao]?.activeRunway ?? '')) {
                        configActive = false;
                        break;
                    }
                }
                else {
                    if (sectorRunway.runway !== airports[sectorRunway.icao]?.activeRunway) {
                        configActive = false;
                        break;
                    }
                }
            }
            if (configActive) result.push(sector);
        }
        else {
            result.push(sector);
        }
    }
    return result;
}

function convertSectorToGeoJson(country: VatglassesData[string], sector: VatglassesSector, countryGroupId: string, positionId: string, atc: VatsimShortenedController[], positions: VatglassesActivePositions) {
    try {
        // Create a polygon turf object
        const firstCoord = sector.points[0];
        const lastCoord = sector.points[sector.points.length - 1];

        if (firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1]) {
            sector.points.push(firstCoord);
        }

        const convertedPoints: Position[] = sector.points.map(point => point.map(Number)); // convert from string to Position type

        let colour: string | undefined = '';
        const colours = country?.positions?.[positionId]?.colours?.filter(x => x.hex) ?? [];
        if (colours?.length) {
            colour = colours?.find(x => {
                const online = stringToArray(x.online);
                return online?.length && online.every(x => positions[countryGroupId]?.[x]?.atc);
            })?.hex ??
                colours.find(x => {
                    const online = stringToArray(x.online);
                    return !online?.length;
                })?.hex ??
                colours[0].hex;
        }

        if (!colour) {
            const [r, g, b] = getCurrentThemeRgbColor('green500');
            colour = rgbToHex(r, g, b);
        }

        const geoJsonPolygon: TurfFeature<TurfPolygon, VatglassesSectorProperties> = polygon([convertedPoints], {
            // id: airspace.id,
            min: sector.min ?? 0,
            max: sector.max ?? 999,
            countryGroupId: countryGroupId,
            vatglassesPositionId: positionId,
            atc: atc,
            colour: colour,
            type: 'vatglasses',
        });
        return geoJsonPolygon;
    }
    catch (e) {
        console.error(e);
        console.error('Convert failed', countryGroupId, positionId);
    }

    return false;
}

export const runwaysState = useStorageLocal<Record<string, string>>('vg-runways', {});
let firstRun = true;

export const vgPositionsCache: Record<string, VatglassesPosition[]> = {};
export const vgCountriesCache: VatglassesData = {};

export async function updateVATGlasses(context: DataUpdateContext) {
    if (!isVatGlassesActive.value) return;

    const dataStore = useDataStore();
    const positionsPrefixes = new Set<string>();

    const { airports } = context;
    const { default: combinedWorker } = await import('~/composables/render/combination-worker.ts?worker');
    worker ??= new combinedWorker();

    // Update positions and airspaces

    if (!facilities) {
        const facilitiesData = dataStore?.vatsim?.data?.facilities?.value;
        facilities = {
            ATIS: -1,
            OBS: facilitiesData.find(x => x.short === 'OBS')?.id ?? -1,
            FSS: facilitiesData.find(x => x.short === 'FSS')?.id ?? -1,
            DEL: facilitiesData.find(x => x.short === 'DEL')?.id ?? -1,
            GND: facilitiesData.find(x => x.short === 'GND')?.id ?? -1,
            TWR: facilitiesData.find(x => x.short === 'TWR')?.id ?? -1,
            APP: facilitiesData.find(x => x.short === 'APP')?.id ?? -1,
            CTR: facilitiesData.find(x => x.short === 'CTR')?.id ?? -1,
        };
    }

    const dataControllers = dataStore.vatsim.data.controllers.value.slice(0);

    if (debugControllers.value?.length) {
        dataControllers.push(...debugControllers.value);
    }

    const foundControllers: Record<string, Record<string, VatsimShortenedController[]>> = {};
    const foundAirspaces: VatglassesActiveAirspaces = {};
    const finalPositions: VatglassesActivePositions = {};
    const vatglassesActivePositions = dataStore.vatglassesActivePositions.value;
    const dynamic = dataStore.vatglassesDynamicData.value?.data;
    const atcAdded = new Set<string>();

    const atisMap: Record<string, VatsimShortenedController> = {};

    for (const atis of dataStore.vatsim.data.atis.value) {
        atisMap[atis.callsign] = atis;
    }

    const countries: VatglassesData = {};

    for (const controller of dataControllers) {
        const freq = parseFloat(controller.frequency || '0');
        if (freq > 137 || freq < 117) continue;

        const prefix = controller.callsign.split('_')[0];

        const positions = vgPositionsCache[prefix] ?? await dataStore.vgData.position(prefix);
        positionsPrefixes.add(prefix);
        vgPositionsCache[prefix] ??= positions ?? [];

        if (!positions?.length) continue;

        for (const position of positions) {
            if (!position.id || !position.countryId || checkIgnoredPosition(position.id, controller.callsign)) continue;
            if (position.frequency && position.frequency !== controller.frequency) continue;
            if (position.type && !controller.callsign.endsWith(position.type)) continue;

            foundControllers[position.countryId] ??= {};
            foundControllers[position.countryId][position.id] ??= [];
            foundControllers[position.countryId][position.id].push(controller);
        }
    }

    for (const i in vgPositionsCache) {
        if (!positionsPrefixes.has(i)) delete vgPositionsCache[i];
    }

    const vgAirports: Record<string, VatglassesAirport> = {};
    const vgPositionAirports: Record<string, VatglassesAirport[]> = {};

    for (const country in foundControllers) {
        const countryData = vgCountriesCache[country] ?? await dataStore.vgData.country(country);
        if (!countryData) continue;

        vgCountriesCache[country] ??= countryData;

        countries[country] = countryData;

        const positions = Object.keys(foundControllers[country]);

        for (const airport in countryData.airports) {
            vgAirports[airport] = countryData.airports[airport];

            // This side effect is safe
            countryData.airports[airport].icao = airport;

            for (let owner of countryData.airports[airport].topdown ?? []) {
                if (typeof owner !== 'string') continue;
                owner = owner.split('/')[1] ?? owner;
                vgPositionAirports[country + owner] ??= [];
                vgPositionAirports[country + owner].push(countryData.airports[airport]);
            }
        }

        for (const index in countryData.airspace) {
            const airspace = countryData.airspace[index];
            const airspaceOwner = dynamic?.[country]?.airspace?.[index] ?? airspace.owner ?? [];

            const positionId = airspaceOwner.find(element => {
                // Another country
                if (element.includes('/')) {
                    const [countryCode, position] = element.split('/');

                    if (foundControllers[countryCode]) {
                        const positions = Object.keys(foundControllers[countryCode]);
                        return positions.includes(position);
                    }
                }
                else return positions.includes(element);
            });

            if (!positionId) continue;

            let positionCountryCode: string;
            let positionPositionCode: string;

            if (positionId.includes('/')) { // Covers this cases: Positions from other data files can be referenced in the format country/position, where position is defined in country.json
                const [otherCountryCode, otherGroupVatglassesPosition] = positionId.split('/');

                if (!countries[otherCountryCode]) {
                    const data = await dataStore.vgData.country(otherCountryCode);
                    if (!data) continue;
                    countries[otherCountryCode] = data;
                }

                if (!foundAirspaces[otherCountryCode]) foundAirspaces[otherCountryCode] = {};
                if (!foundAirspaces[otherCountryCode][otherGroupVatglassesPosition]) foundAirspaces[otherCountryCode][otherGroupVatglassesPosition] = {};

                foundAirspaces[otherCountryCode][otherGroupVatglassesPosition][country + '/' + index] = airspace;

                positionCountryCode = otherCountryCode;
                positionPositionCode = otherGroupVatglassesPosition;
            }
            else {
                if (!foundAirspaces[country]) foundAirspaces[country] = {};
                if (!foundAirspaces[country][positionId]) foundAirspaces[country][positionId] = {};

                // Add airspace to the object, we use the airspaceKey as identifier because we know for sure it is unique, i don't think the airspace.id is unique for sure
                foundAirspaces[country][positionId][index] = airspace;

                positionCountryCode = country;
                positionPositionCode = positionId;
            }

            const controllersForPosition = foundControllers[positionCountryCode][positionPositionCode];

            if (controllersForPosition?.length) {
                for (const airport of vgPositionAirports[positionCountryCode + positionPositionCode] ?? []) {
                    if (!airport.icao || !airports[airport.icao]) continue;

                    controllersForPosition.forEach(x => !airports[airport.icao!].atc.some(y => y.cid === x.cid) && airports[airport.icao!].atc.push(x));
                }
            }

            const activePosition = vatglassesActivePositions[positionCountryCode]?.[positionPositionCode];

            for (const sector of airspace.sectors) {
                for (const runway of sector.runways ?? []) {
                    if (!runway.icao) continue;

                    const airport = airports[runway.icao];
                    if (!airport) continue;

                    const vgRunways = countries[positionCountryCode]?.airports[runway.icao]?.runways;
                    if (!vgRunways) continue;

                    airport.vgRunways ??= vgRunways;

                    if (runwaysState.value[runway.icao] && vgRunways.includes(runwaysState.value[runway.icao])) {
                        airport.activeRunway = runwaysState.value[runway.icao];
                    }
                    else {
                        const airportForUpdate = {
                            ...airport,
                            atc: [
                                atisMap[`${ runway.icao }_ATIS`],
                                atisMap[`${ runway.icao }_D_ATIS`],
                                atisMap[`${ runway.icao }_A_ATIS`],
                            ].filter(x => x),
                        };

                        // Update runways config
                        updateAirportAtisConfig(airportForUpdate);
                        airport.atis = airportForUpdate.atis;

                        if (airport.atis?.runways?.departure?.length || airport.atis?.runways?.arrival?.length) {
                            const airportConfig = [
                                ...airport.atis?.runways?.departure ?? [],
                                ...airport.atis?.runways?.arrival ?? [],
                            ];

                            let runway = vgRunways.find(x => x.split('/').some(x => airportConfig.includes(x)));
                            if (!runway) runway = vgRunways.find(x => x.split('/').some(x => airportConfig.some(y => y.slice(0, 2) === x)));

                            if (runway) airport.activeRunway = runway;
                            else airport.activeRunway = vgRunways[0];
                        }
                        else airport.activeRunway = vgRunways[0];
                    }

                    if (airport.activeRunway && activePosition && airport.activeRunway !== activePosition.activeRunway[airport.icao]) {
                        activePosition.activeRunway[airport.icao] = airport.activeRunway;
                        activePosition.sectors = null;
                        activePosition.sectorsCombined = null;
                    }
                }
            }
        }
    }

    for (const country in vgCountriesCache) {
        if (!countries[country]) delete vgCountriesCache[country];
    }

    for (const countryGroupId in foundAirspaces) {
        for (const positionId in foundAirspaces[countryGroupId]) {
            finalPositions[countryGroupId] ??= {};

            if (vatglassesActivePositions[countryGroupId]?.[positionId]) {
                finalPositions[countryGroupId][positionId] = {
                    ...vatglassesActivePositions[countryGroupId][positionId],
                    atc: foundControllers[countryGroupId]?.[positionId] ?? [],
                };
            }
            else {
                finalPositions[countryGroupId][positionId] = {
                    atc: foundControllers[countryGroupId]?.[positionId] ?? [],
                    sectors: null,
                    sectorsCombined: null,
                    activeRunway: {},
                    airspaceKeys: null,
                    lastUpdated: null,
                };
            }

            for (const foundController of foundControllers[countryGroupId][positionId]) {
                atcAdded.add(foundController.callsign);
            }

            // Check if the airspaces of a position have changed and reset the sectors if they have changed so they will be recalculated
            const airspacesIndexesJoined = finalPositions[countryGroupId][positionId].airspaceKeys;
            const airspaceKeys = Object.keys(foundAirspaces[countryGroupId][positionId]).join(',');
            if (airspacesIndexesJoined !== airspaceKeys) {
                finalPositions[countryGroupId][positionId].sectors = null;
                finalPositions[countryGroupId][positionId].sectorsCombined = null;
                finalPositions[countryGroupId][positionId].airspaceKeys = airspaceKeys;
            }

            const atcKeys = vatglassesActivePositions[countryGroupId]?.[positionId]?.atc?.map(x => x.cid + x.callsign)?.join(',');
            const newAtcKeys = finalPositions[countryGroupId]?.[positionId]?.atc?.map(x => x.cid + x.callsign)?.join(',');

            const atcChanged = atcKeys !== newAtcKeys;

            // Recalculation is needed
            if (finalPositions[countryGroupId][positionId].sectors === null) {
                finalPositions[countryGroupId][positionId].lastUpdated = new Date().toISOString();

                const sectors = [];
                for (const airspaceId in foundAirspaces[countryGroupId][positionId]) {
                    const airspace = foundAirspaces[countryGroupId][positionId][airspaceId];
                    for (const sector of getActiveSectorsOfAirspace(airspace, context)) {
                        sectors.push(sector);
                    }
                }
                finalPositions[countryGroupId][positionId].sectors = sectors.map(sector => convertSectorToGeoJson(countries[countryGroupId], sector, countryGroupId, positionId, finalPositions[countryGroupId][positionId].atc, finalPositions)).filter(sector => sector !== false) || [];
                // Runway-dependent sectors can briefly recalculate to an empty list while ATIS/runway state changes.
                // Keep the previous geometry for an online VG position instead of making the rendered layer blink to zero.
                preservePreviousSectorsIfCurrentTickIsEmpty(finalPositions[countryGroupId][positionId], vatglassesActivePositions[countryGroupId]?.[positionId]);
            }
            else if (atcChanged) {
                finalPositions[countryGroupId][positionId].sectors?.forEach(x => x.properties!.atc = finalPositions[countryGroupId][positionId].atc);
                finalPositions[countryGroupId][positionId].lastUpdated = new Date().toISOString();
            }
        }
    }

    // If VG positions matched live controllers but no airspace matched this tick, keep the previous geometry.
    // This prevents a transient bad dynamic ownership snapshot from replacing rendered sectors with an empty map.
    if (hasNestedEntries(vatglassesActivePositions) && hasNestedEntries(foundControllers) && !hasNestedEntries(finalPositions)) {
        addFoundControllersToSet(foundControllers, atcAdded);
        context.atcAdded = atcAdded;
        firstRun = false;
        return false;
    }

    dataStore.vatglassesActivePositions.value = finalPositions;

    if (!firstRun && getKeyedValueFromSettings('map.vatglasses.active') && getKeyedValueFromSettings('map.vatglasses.combined') && !dataStore.vatglassesCombiningInProgress.value) {
        dataStore.vatglassesCombiningInProgress.value = true;
        await combineAllVatglassesActiveSectors(finalPositions).catch(e => console.error(e));
        dataStore.vatglassesCombiningInProgress.value = false;
    }

    firstRun = !atcAdded.size;
    context.atcAdded = atcAdded;

    return firstRun;
}
