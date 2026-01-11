import type Feature from 'ol/Feature';
import type Polygon from 'ol/geom/Polygon';
import type { Feature as TurfFeature, Polygon as TurfPolygon, Position } from 'geojson';

import { polygon } from '@turf/helpers';
import { GeoJSON } from 'ol/format';
import type {
    RadarStorage,
    VatglassesAirspace,
    VatglassesAPIData,
    VatglassesData,
    VatglassesSector,
} from '~/utils/backend/storage.js';
import { combineSectors, splitSectors } from '~/utils/data/vatglasses-helper';
import type { WorkerDataStore } from '../backend/worker/vatglasses-worker';
import type { VatsimShortenedController } from '~/types/data/vatsim';
import { computed } from 'vue';
import { clientDB } from '~/utils/client-db';
import { initIDBData } from '~/composables/idb-init';

let dataStore: UseDataStore;
let workerDataStore: WorkerDataStore;
let radarStorage: RadarStorage;
let store: ReturnType<typeof useStore>;
let mapStore: ReturnType<typeof useMapStore>;
let mode: 'local' | 'server';
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
/*
If we want to get the initial load of the combined sectors, we need sectorsCombined, airspaceKeys and the vatglasses Data version of the server on which base the sectors were combined, to make sure we have the same data version on the client side.
*/
const VGdebugMode = false;

export interface VatglassesActiveData {
    vatglassesActiveRunways: VatglassesActiveRunways;
    vatglassesActivePositions: VatglassesActivePositions;
    version: string;
}

export interface VatglassesActivePosition {
    atc: VatsimShortenedController[];
    sectors: TurfFeature<TurfPolygon>[] | null;
    sectorsCombined: TurfFeature<TurfPolygon>[] | null;
    airspaceKeys: string | null;
    lastUpdated: Ref<string | null> | null;
}
export interface VatglassesActivePositions {
    [countryGroupId: string]: {
        [vatglassesPositionId: string]: VatglassesActivePosition;
    };
}

export interface VatglassesAirportRunways {
    active: string; potential: string[];
}

export interface VatglassesActiveRunways {
    [icao: string]: VatglassesAirportRunways;
}

export interface VatglassesActiveAirspaces {
    [countryGroupId: string]: { [vatglassesPositionId: string]: { [index: string]: VatglassesAirspace } };
}

export interface VatglassesSectorProperties {
    min: number;
    max: number;
    countryGroupId: string;
    vatglassesPositionId: string;
    atc: VatsimShortenedController[];
    colour: string;
    type: 'vatglasses';
}

let vatglassesActiveAirspaces: VatglassesActiveAirspaces = {};
let updatedVatglassesPositions: { [countryGroupId: string]: { [vatglassesPositionId: string]: null } } = {};

const ignoredPositions = ['ASIAW', 'ASEAN', 'ASEAS', ['56', 'NY']];

function checkIgnoredPosition(id: string, callsign: string) {
    return ignoredPositions.some(x => typeof x === 'string' ? id === x : x[0] === id && callsign.startsWith(x[1]));
}

async function updateVatglassesPositionsAndAirspaces() {
    const newVatglassesActivePositions: VatglassesActivePositions = {};
    updatedVatglassesPositions = {};

    const vatglassesData = dataStore ? await getVGData() : radarStorage?.vatglasses?.data.data;
    const vatglassesActiveRunways = dataStore?.vatglassesActiveRunways.value ?? workerDataStore.vatglassesActiveRunways;
    const vatglassesActivePositions = dataStore?.vatglassesActivePositions.value ?? workerDataStore.vatglassesActivePositions;
    const vatglassesDynamicData = dataStore?.vatglassesDynamicData?.value ?? radarStorage.vatglasses.dynamicData;
    const vatsimData = dataStore?.vatsim ?? radarStorage.vatsim;
    if (!vatglassesData || !vatsimData) return newVatglassesActivePositions;

    if (!facilities) {
        const facilitiesData = dataStore?.vatsim?.data?.facilities?.value ?? radarStorage?.vatsim?.data?.facilities;
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

    const vatglassesActiveControllers: { [countryGroupId: string]: { [vatglassesPositionId: string]: VatsimShortenedController[] } } = {}; // countryGroupId is the name of the json files which are split into areas
    const fallbackPositions: VatsimShortenedController[] = [];
    // Fill the vatglassesActiveStations object with the active stations
    if (vatglassesData) {
        const arrivalController = [];
        const locals = dataStore?.vatsim?.data?.locals.value ?? radarStorage?.vatsim?.locals;
        for (const atc of locals) {
            if (!atc.isATIS && [facilities.APP, facilities.TWR, facilities.GND].includes(atc.atc.facility)) {
                arrivalController.push(atc);
            }
        }

        // TODO: sort firs by the same as EuroScope sorts the positions before assigning logged in stations to a position
        let first = 0; // used for debug
        const firs = dataStore?.vatsim?.data?.firs.value ?? radarStorage?.vatsim?.firs;
        for (const fir of [...firs, ...arrivalController]) { // this has an entry for each center controller connected. const fir is basically a center controller
            // In data.firs it is called controller, in data.locals it is called controllers, so we have to get the correct one
            let atc = null;
            if ('controller' in fir) {
                atc = fir.controller;
            }
            else if ('atc' in fir) {
                atc = fir.atc;
            }
            if (!atc) continue;

            // // used for debug
            if (VGdebugMode) {
                if (first === 0) {
                    atc.frequency = '121.550';
                    atc.callsign = 'ENOR_S_CTR';
                    atc.cid = 1025793;
                    first++;
                }
                else if (first === 1) {
                    break;
                    atc.frequency = '127.755';
                    atc.callsign = 'ESMM_2_CTR';
                    atc.cid = 1025794;
                    // first++;
                }
                else {
                    break;
                }
            }

            let foundMatchingVatglassesController = false;
            // We sort the keys with the first two chars of the callsign, so we can check first the most likely countryGroupIds
            const keys = Object.keys(vatglassesData);
            const searchString = atc.callsign.substring(0, 2);
            const matchingKeys = keys.filter(key => key.includes(searchString));
            const nonMatchingKeys = keys.filter(key => !key.includes(searchString));
            const sortedKeys = [...matchingKeys, ...nonMatchingKeys];

            for (const countryGroupId of sortedKeys) {
                const countryGroup = vatglassesData[countryGroupId];
                for (const vatglassesPositionId in countryGroup.positions) {
                    if (checkIgnoredPosition(vatglassesPositionId, atc.callsign)) continue;
                    const vatglassesPosition = countryGroup.positions[vatglassesPositionId];
                    if (vatglassesPosition.frequency && vatglassesPosition.frequency !== atc.frequency) continue;
                    if (!atc.callsign.endsWith(vatglassesPosition.type)) continue;
                    if (!vatglassesPosition.pre.some((prefix: string) => atc.callsign.startsWith(prefix))) continue;

                    if (!vatglassesActiveControllers[countryGroupId]) {
                        vatglassesActiveControllers[countryGroupId] = {};
                    }

                    vatglassesActiveControllers[countryGroupId][vatglassesPositionId] ??= [];

                    vatglassesActiveControllers[countryGroupId][vatglassesPositionId].push(atc);
                    foundMatchingVatglassesController = true;
                    break;
                }
            }

            if (!foundMatchingVatglassesController) {
                fallbackPositions.push(atc);
            }
        }
    }

    // TODO: We could compare the entries of `vatglassesActiveStations` with `dataStore.vatglassesActivePositions.value[countryGroupId][positionId]`, and if they are equal, no position has changed and we have nothing to do. However, we need to consider if a runway was updated or changed in the frontend and therefore this update cycle was called. Maybe use a parameter in this function like `runwayChanged`, and when we call updateVatglassesState() in the `activeRunwayChanged` function, we pass this parameter.

    // Fill the vatglassesActiveAirspaces object with the active airspaces
    vatglassesActiveAirspaces = {};
    for (const countryGroupId in vatglassesData) {
        const countryGroup = vatglassesData[countryGroupId];

        let activeGroupVatglassesPosition: string[] = [];
        if (vatglassesActiveControllers[countryGroupId]) activeGroupVatglassesPosition = Object.keys(vatglassesActiveControllers[countryGroupId]);
        for (const airspaceIndex in countryGroup.airspace) {
            const airspace = countryGroup.airspace[airspaceIndex];
            let airspaceOwner: string [] = [];
            if (vatglassesDynamicData?.data?.[countryGroupId]?.airspace?.[airspaceIndex]) {
                airspaceOwner = vatglassesDynamicData?.data?.[countryGroupId]?.airspace?.[airspaceIndex];
            }
            else if (airspace?.owner) {
                airspaceOwner = airspace.owner;
            }

            const vatglassesPositionId = airspaceOwner.find((element: string) => {
                if (element.includes('/')) { // Covers this cases: Positions from other data files can be referenced in the format country/position, where position is defined in country.json
                    const elementSplit = element.split('/');
                    const otherCountryCode = elementSplit[0];
                    const otherGroupVatglassesPosition = elementSplit[1];
                    if (vatglassesActiveControllers[otherCountryCode]) {
                        const otherGroupVatglassesActivePositions = Object.keys(vatglassesActiveControllers[otherCountryCode]);
                        return otherGroupVatglassesActivePositions.includes(otherGroupVatglassesPosition);
                    }
                }
                else {
                    return activeGroupVatglassesPosition.includes(element);
                }
            });

            if (!vatglassesPositionId) continue;

            if (vatglassesPositionId.includes('/')) { // Covers this cases: Positions from other data files can be referenced in the format country/position, where position is defined in country.json
                const [otherCountryCode, otherGroupVatglassesPosition] = vatglassesPositionId.split('/');
                if (!vatglassesActiveAirspaces[otherCountryCode]) vatglassesActiveAirspaces[otherCountryCode] = {};
                if (!vatglassesActiveAirspaces[otherCountryCode][otherGroupVatglassesPosition]) vatglassesActiveAirspaces[otherCountryCode][otherGroupVatglassesPosition] = {};

                vatglassesActiveAirspaces[otherCountryCode][otherGroupVatglassesPosition][countryGroupId + '/' + airspaceIndex] = airspace;
            }
            else {
                if (!vatglassesActiveAirspaces[countryGroupId]) vatglassesActiveAirspaces[countryGroupId] = {};
                if (!vatglassesActiveAirspaces[countryGroupId][vatglassesPositionId]) vatglassesActiveAirspaces[countryGroupId][vatglassesPositionId] = {};

                // Add airspace to the object, we use the airspaceKey as identifier because we know for sure it is unique, i don't think the airspace.id is unique for sure
                vatglassesActiveAirspaces[countryGroupId][vatglassesPositionId][airspaceIndex] = airspace;
            }
        }
    }

    // It is possible that a position is defined in VatGlasses data but no airspaces are defined for it. In this case, it is not added to the fallbackPositions above, because the position exists, but no airspace is defined for it. We have to add it to the fallbackPositions here.
    for (const countryGroupId in vatglassesActiveControllers) {
        for (const positionId in vatglassesActiveControllers[countryGroupId]) {
            if (!vatglassesActiveAirspaces[countryGroupId] || !vatglassesActiveAirspaces[countryGroupId][positionId] || Object.keys(vatglassesActiveAirspaces[countryGroupId][positionId]).length === 0) {
                const controllers = vatglassesActiveControllers[countryGroupId][positionId];
                const fallback = controllers.filter(x => fallbackPositions.some(fallback => fallback.callsign === x.callsign));
                if (!fallback.length) {
                    fallbackPositions.push(...controllers);
                }
            }
        }
    }

    // set required runways (required are runways which are used to show sectors with an active position) and default active runway
    const vatglassesRunwaysUpdated: VatglassesActiveRunways = {};
    for (const countryGroupId in vatglassesActiveAirspaces) {
        for (const positionId in vatglassesActiveAirspaces[countryGroupId]) {
            const airspaces = vatglassesActiveAirspaces[countryGroupId][positionId];
            for (const airspaceId in airspaces) {
                const airspace = airspaces[airspaceId];
                for (const sector of airspace.sectors) {
                    if (!sector.runways) continue;
                    for (const runway of sector.runways) {
                        const runways = vatglassesData[countryGroupId]?.airports?.[runway.icao]?.runways;
                        if (runways) {
                            vatglassesRunwaysUpdated[runway.icao] = { active: '', potential: [] };
                            vatglassesRunwaysUpdated[runway.icao].potential = runways; // we set as default the first of the defined runways
                            if (vatglassesActiveRunways[runway.icao]?.active) {
                                vatglassesRunwaysUpdated[runway.icao].active = vatglassesActiveRunways[runway.icao]?.active;
                            }
                            else {
                                vatglassesRunwaysUpdated[runway.icao].active = runways[0]; // we set as default the first of the defined runways
                            }
                        }
                    }
                }
            }
        }
    }
    if (dataStore?.vatglassesActiveRunways.value) {
        dataStore.vatglassesActiveRunways.value = vatglassesRunwaysUpdated;
    }
    else workerDataStore.vatglassesActiveRunways = vatglassesRunwaysUpdated;

    // Get the active sectors of a position based on the active airspaces
    for (const countryGroupId in vatglassesActiveAirspaces) {
        for (const positionId in vatglassesActiveAirspaces[countryGroupId]) {
            if (!newVatglassesActivePositions[countryGroupId]) newVatglassesActivePositions[countryGroupId] = {};

            if (vatglassesActivePositions[countryGroupId]?.[positionId]) {
                newVatglassesActivePositions[countryGroupId][positionId] = {
                    ...vatglassesActivePositions[countryGroupId][positionId],
                    atc: vatglassesActiveControllers[countryGroupId][positionId],
                };
            }
            else {
                if (mode === 'server') {
                    newVatglassesActivePositions[countryGroupId][positionId] = { atc: vatglassesActiveControllers[countryGroupId][positionId], sectors: null, sectorsCombined: null, airspaceKeys: null, lastUpdated: null }; // we set null instead of [], because null is the signal for later that we have to recalculate it
                }
                else {
                    newVatglassesActivePositions[countryGroupId][positionId] = { atc: vatglassesActiveControllers[countryGroupId][positionId], sectors: null, sectorsCombined: null, airspaceKeys: null, lastUpdated: ref<string | null>(null) }; // we set null instead of [], because null is the signal for later that we have to recalculate it
                }
            }

            // Check if the airspaces of a position have changed and reset the sectors if they have changed so they will be recalculated
            const airspacesIndexesJoined = newVatglassesActivePositions[countryGroupId][positionId].airspaceKeys;
            if (airspacesIndexesJoined !== Object.keys(vatglassesActiveAirspaces[countryGroupId][positionId]).join(',')) {
                resetVatglassesActivePositions(newVatglassesActivePositions[countryGroupId][positionId]); // this will set the sectors to null so they will be recalculated
                newVatglassesActivePositions[countryGroupId][positionId].airspaceKeys = Object.keys(vatglassesActiveAirspaces[countryGroupId][positionId]).join(',');
            }

            const atcChanged = vatglassesActivePositions[countryGroupId]?.[positionId]?.atc?.length !== newVatglassesActivePositions[countryGroupId][positionId].atc.length ||
                !vatglassesActivePositions[countryGroupId]?.[positionId]?.atc.every((atc, index) => atc.callsign === newVatglassesActivePositions[countryGroupId][positionId].atc[index].callsign &&
                    atc.cid === newVatglassesActivePositions[countryGroupId][positionId].atc[index].cid);

            if (newVatglassesActivePositions[countryGroupId][positionId]['sectors'] === null) { // if it is null, it is the signal for us this needs to be (re)calculated
                // set all active sectors of the position
                addToUpdatedVatglassesPositions(countryGroupId, positionId);
                const sectors = [];
                for (const airspaceId in vatglassesActiveAirspaces[countryGroupId][positionId]) {
                    const airspace = vatglassesActiveAirspaces[countryGroupId][positionId][airspaceId];
                    for (const sector of getActiveSectorsOfAirspace(airspace)) {
                        sectors.push(sector);
                    }
                }
                newVatglassesActivePositions[countryGroupId][positionId]['sectors'] = sectors.map(sector => convertSectorToGeoJson(vatglassesData, sector, countryGroupId, positionId, newVatglassesActivePositions[countryGroupId][positionId].atc, newVatglassesActivePositions)).filter(sector => sector !== false) || [];
            }
            else if (atcChanged) {
                newVatglassesActivePositions[countryGroupId][positionId]['sectors']?.forEach(x => x.properties!.atc = newVatglassesActivePositions[countryGroupId][positionId].atc);
                addToUpdatedVatglassesPositions(countryGroupId, positionId);
            }
        }
    }

    newVatglassesActivePositions['fallback'] = {};
    for (const atc of fallbackPositions) {
        if (mode === 'server') {
            newVatglassesActivePositions['fallback'][atc.callsign] = { atc: [atc], sectors: null, sectorsCombined: null, airspaceKeys: null, lastUpdated: null };
        }
        else {
            newVatglassesActivePositions['fallback'][atc.callsign] = { atc: [atc], sectors: null, sectorsCombined: null, airspaceKeys: null, lastUpdated: ref<string | null>(null) };
        }
    }

    return newVatglassesActivePositions;
}

// reset the entry of a PositionId
function resetVatglassesActivePositions(sector: VatglassesActivePosition) {
    sector['sectors'] = null;
    sector['sectorsCombined'] = null;
}

function addToUpdatedVatglassesPositions(countryGroupId: string, vatglassesPositionId: string) {
    if (!updatedVatglassesPositions[countryGroupId]) {
        updatedVatglassesPositions[countryGroupId] = {};
    }
    updatedVatglassesPositions[countryGroupId][vatglassesPositionId] = null;
}

function triggerUpdatedVatglassesPositions(newVatglassesActivePositions: VatglassesActivePositions) {
    if (mode === 'local') {
        for (const countryGroupId in updatedVatglassesPositions) {
            for (const positionId in updatedVatglassesPositions[countryGroupId]) {
                if (newVatglassesActivePositions[countryGroupId][positionId]['lastUpdated']) {
                    newVatglassesActivePositions[countryGroupId][positionId]['lastUpdated'].value = new Date().toISOString();
                }
            }
        }
    }
}

// return the active sectors of an airspace based on the runways
function getActiveSectorsOfAirspace(airspace: VatglassesAirspace) {
    const vatglassesActiveRunways = dataStore?.vatglassesActiveRunways?.value ?? workerDataStore.vatglassesActiveRunways;
    const result: VatglassesSector[] = [];
    for (const sector of airspace.sectors) {
        if (sector.runways) {
            let configActive = true;
            for (const sectorRunway of sector.runways) {
                if (!vatglassesActiveRunways) {
                    configActive = false;
                    break;
                }
                if (Array.isArray(sectorRunway.runway)) {
                    if (!sectorRunway.runway.includes(vatglassesActiveRunways[sectorRunway.icao].active)) {
                        configActive = false;
                        break;
                    }
                }
                else {
                    if (sectorRunway.runway !== vatglassesActiveRunways[sectorRunway.icao]?.active) {
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

function stringToArray<T>(item: T | T[] | undefined): T[] {
    if (!item) return [];
    if (!Array.isArray(item)) return [item];
    return item;
}

export const getVGData = initIDBData<VatglassesData | undefined>(async () => (await clientDB.data.get('vatglasses') as VatglassesAPIData | undefined)?.data);

// Converts from vatglasses sector format to geojson format
function convertSectorToGeoJson(vatglassesData: VatglassesData, sector: VatglassesSector, countryGroupId: string, positionId: string, atc: VatsimShortenedController[], positions: VatglassesActivePositions) {
    try {
        // Create a polygon turf object
        const firstCoord = sector.points[0];
        const lastCoord = sector.points[sector.points.length - 1];

        if (firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1]) {
            sector.points.push(firstCoord);
        }

        const convertedPoints: Position[] = sector.points.map(point => point.map(Number)); // convert from string to Position type

        let colour: string | undefined = '';
        const colours = vatglassesData?.[countryGroupId]?.positions?.[positionId]?.colours?.filter(x => x.hex) ?? [];
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
            if (mode === 'local') {
                const [r, g, b] = getCurrentThemeRgbColor('success500');
                colour = rgbToHex(r, g, b);
            }
            else {
                colour = '#008856';
            }
        }

        const geoJsonPolygon: TurfFeature<TurfPolygon> = polygon([convertedPoints], {
            // id: airspace.id,
            min: sector.min ?? 0,
            max: sector.max ?? 999,
            countryGroupId: countryGroupId,
            vatglassesPositionId: positionId,
            atc: atc,
            colour: colour,
            type: 'vatglasses',
        } as VatglassesSectorProperties);
        return geoJsonPolygon;
    }
    catch (e) {
        console.error(e);
        console.error('Convert failed', countryGroupId, positionId);
    }

    return false;
}


/*
// used for debug
function transformCoord(coord: number[]) {
    const R = 6378137;
    const x = coord[0];
    const y = coord[1];
    const lon = (x / R) * (180 / Math.PI);
    const lat = (Math.atan(Math.sinh(y / R))) * (180 / Math.PI);
    return [lon, lat];
}
// used for debug
function transformFeatureCollection(featureCollection: TurfFeatureCollection) {
    return {
        ...featureCollection,
        features: featureCollection.features.map(feature => {
            const { geometry } = feature;
            if (geometry.type === 'Polygon') {
                return {
                    ...feature,
                    geometry: {
                        ...geometry,
                        coordinates: geometry.coordinates.map(ring => ring.map(coord => transformCoord(coord))),
                    },
                };
            }
            else if (geometry.type === 'MultiPolygon') {
                return {
                    ...feature,
                    geometry: {
                        ...geometry,
                        coordinates: geometry.coordinates.map(polygon => polygon.map(ring => ring.map(coord => transformCoord(coord)))),
                    },
                };
            }
            else {
                return feature; // Return the feature unchanged if it's not a Polygon or MultiPolygon
            }
        }),
    };
}
*/

let worker: Worker | null = null;

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

// This function is used for the combined mode. It combines the sectors which are splitted before. It combines the sectors which are splitted before. We combine all splited sectors with the same vertical limits into one polygon.
async function combineAllVatglassesActiveSectors(newVatglassesActiveSectors: VatglassesActivePositions) {
    for (const countryGroupId in newVatglassesActiveSectors) {
        for (const positionId in newVatglassesActiveSectors[countryGroupId]) {
            if (!newVatglassesActiveSectors[countryGroupId][positionId]) continue;
            if (newVatglassesActiveSectors[countryGroupId][positionId]['sectorsCombined'] === null) { // if it is null, it is the signal for us this needs to be (re)calculated
                addToUpdatedVatglassesPositions(countryGroupId, positionId);
                const sectors = newVatglassesActiveSectors[countryGroupId][positionId]['sectors'];
                if (sectors) {
                    let splittedSectors;
                    if (mode === 'server') {
                        splittedSectors = splitSectors(sectors);
                    }
                    else {
                        splittedSectors = await splitSectorsWithWorker(sectors);
                    }

                    if (splittedSectors) {
                        if (mode === 'server') {
                            newVatglassesActiveSectors[countryGroupId][positionId]['sectorsCombined'] = combineSectors(splittedSectors);
                        }
                        else {
                            newVatglassesActiveSectors[countryGroupId][positionId]['sectorsCombined'] = await combineSectorsWithWorker(splittedSectors);
                        }
                    }
                }
            }
        }
    }
}

const format = new GeoJSON({
    featureProjection: 'EPSG:4326',
    dataProjection: 'EPSG:4326',
});

// Function to convert GeoJSON back to OpenLayers features
export function convertToOpenLayersFeatures(geoJSONPolygons: TurfFeature<TurfPolygon>[]): Feature<Polygon>[] {
    return geoJSONPolygons.map(polygon => format.readFeature(polygon) as Feature<Polygon>);
}


async function waitForRunningVatglassesUpdate() {
    while (vatglassesUpdateInProgress) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}


// Call this function when a runway was changed at the frontend
// TODO: Idea, we could watch the active value of dataStore.vatglassesActiveRunways, then we would not have to call this function somewhere else when a runway was changed
export async function activeRunwayChanged(icao: string | string[], isCombineInit = true) {
    if (isCombineInit) await waitForRunningVatglassesUpdate();
    if (typeof icao === 'string') icao = [icao];

    for (const countryGroupId in vatglassesActiveAirspaces) {
        for (const positionId in vatglassesActiveAirspaces[countryGroupId]) {
            let resetSectors = false;
            const airspaces = vatglassesActiveAirspaces[countryGroupId][positionId];
            for (const airspaceId in airspaces) {
                const airspace = airspaces[airspaceId];
                for (const sector of airspace.sectors) {
                    if (sector.runways) {
                        for (const sectorRunway of sector.runways) {
                            if (icao.includes(sectorRunway.icao)) {
                                resetSectors = true;
                                break;
                            }
                        }
                    }
                    if (resetSectors) break;
                }
                if (resetSectors) break;
            }
            if (resetSectors) resetVatglassesActivePositions(dataStore.vatglassesActivePositions.value[countryGroupId][positionId]);
        }
    }

    if (isCombineInit) updateVatglassesStateLocal();
}

const _isVatGlassesActive = () => computed(() => {
    if (typeof window === 'undefined') return false;

    const store = useNuxtApp().$pinia.state.value.index;
    if (store.bookingOverride) return false;
    dataStore ??= useDataStore();
    mapStore ??= useMapStore();

    const isAuto = store.mapSettings.vatglasses?.autoEnable !== false;

    if (store.mapSettings.vatglasses?.active) return true;

    if (isAuto) {
        if (store.user) {
            return dataStore.vatsim.data.pilots.value.some(x => x.cid === +store.user!.cid || x.cid === mapStore.selectedCid);
        }
    }

    return false;
});

export const isVatGlassesActive = _isVatGlassesActive();

let vatglassesUpdateInProgress = false;
export async function updateVatglassesStateLocal(forceNoCombine = false) {
    if (vatglassesUpdateInProgress) return;
    if (!isVatGlassesActive.value) return;

    // console.time('updateVatglassesStateLocal');

    vatglassesUpdateInProgress = true;
    const newVatglassesActivePositions = await updateVatglassesPositionsAndAirspaces();
    if (store.mapSettings.vatglasses?.active && store.mapSettings.vatglasses?.combined && !forceNoCombine) {
        dataStore.vatglassesCombiningInProgress.value = true;

        await combineAllVatglassesActiveSectors(newVatglassesActivePositions);
        dataStore.vatglassesCombiningInProgress.value = false;
    }
    dataStore.vatglassesActivePositions.value = newVatglassesActivePositions;
    triggerUpdatedVatglassesPositions(newVatglassesActivePositions);
    vatglassesUpdateInProgress = false;


    // console.timeEnd('updateVatglassesStateLocal');
}

export async function updateVatglassesStateServer() {
    if (vatglassesUpdateInProgress) return;

    // console.time('updateVatglassesStateServer');

    vatglassesUpdateInProgress = true;
    const newVatglassesActivePositions = await updateVatglassesPositionsAndAirspaces();
    await combineAllVatglassesActiveSectors(newVatglassesActivePositions);
    triggerUpdatedVatglassesPositions(newVatglassesActivePositions);
    workerDataStore.vatglassesActivePositions = newVatglassesActivePositions;
    workerDataStore.vatglassesActiveAirspaces = vatglassesActiveAirspaces;
    vatglassesUpdateInProgress = false;


    // console.timeEnd('updateVatglassesStateServer');
}

// This function is called at the first time combined data is needed. It fetches the combined data from the server and updates the local data. It is meant as an initial load of the combined data. Future updates and calculations are handled locally.
let combineDataInitialized = false;
async function initVatglassesCombined() {
    await waitForRunningVatglassesUpdate();
    vatglassesUpdateInProgress = true;
    combineDataInitialized = true;
    dataStore.vatglassesCombiningInProgress.value = true;
    try {
        const data: VatglassesActiveData = JSON.parse(await $fetch<string>(`/api/data/vatsim/data/vatglasses/active`));
        const vatglassesDataVersion = dataStore?.versions.value?.vatglasses;
        if (vatglassesDataVersion === data.version) {
            for (const countryGroupId in data.vatglassesActivePositions) {
                for (const positionId in data.vatglassesActivePositions[countryGroupId]) {
                    const serverPosition = data.vatglassesActivePositions[countryGroupId][positionId];
                    const localPosition = dataStore.vatglassesActivePositions.value[countryGroupId]?.[positionId];

                    if (localPosition) {
                        if (serverPosition.sectorsCombined) {
                            // overwrite the property controllers of the combined sectors with the controllers from the local server data. I don't know if it would be a problem if we use the controllers data from the server, but to make it consistent that the controllers property is always a reference to the local data, we overwrite it here
                            for (const sector of serverPosition.sectorsCombined) {
                                if (sector.properties) {
                                    sector.properties.atc = localPosition.atc;
                                }
                            }
                        }
                        if (serverPosition.airspaceKeys === localPosition.airspaceKeys) {
                            localPosition.sectorsCombined = serverPosition.sectorsCombined;
                            if (localPosition.lastUpdated) {
                                localPosition.lastUpdated.value = new Date().toISOString();
                            }
                        }
                    }
                }
            }
        }

        // Check existing runways with the runways from the server data and reset all changed icao codes
        const serverRunways = data.vatglassesActiveRunways;
        const localRunways = dataStore.vatglassesActiveRunways.value;

        for (const icao in localRunways) {
            if (localRunways[icao].active !== serverRunways?.[icao]?.active) {
                await activeRunwayChanged(icao, false);
            }
        }
        vatglassesUpdateInProgress = false;
        // Now call the update function to recalculate all sectors which were not updated by the server data or which had a different runway
        updateVatglassesStateLocal();
    }
    catch {
        console.error('Error fetching or processing vatglasses-active data');
        // Optionally, you can handle the error further, such as displaying a user-friendly message

        vatglassesUpdateInProgress = false;
        dataStore.vatglassesCombiningInProgress.value = false;
        // Now call the update function to recalculate all sectors which were not updated by the server data or which had a different runway
        updateVatglassesStateLocal();
    }
}

export async function initVatglasses(inputMode: string = 'local', serverDataStore: WorkerDataStore | null = null, _radarStorage: RadarStorage | null = null) {
    if (inputMode === 'server') {
        mode = 'server';
        if (serverDataStore && _radarStorage) {
            workerDataStore = serverDataStore;
            radarStorage = _radarStorage;
        }
    }
    else {
        mode = 'local';
        dataStore = useDataStore();
        store = useStore();
        const { default: combinedWorker } = await import('~/composables/combination-worker.ts?worker');
        worker = new combinedWorker();

        await updateVatglassesStateLocal(true);

        const vatglassesCombined = computed(() => store.mapSettings.vatglasses?.combined && isVatGlassesActive.value);

        if (toValue(vatglassesCombined)) {
            await initVatglassesCombined();
        }

        watch([dataStore.vatsim.data.firs, dataStore.vatsim.data.locals, dataStore.vatglassesDynamicData, vatglassesCombined], async ([firs, locals, dynamic, combined], oldValue) => {
            const [oldFirs, oldLocals, oldDynamic, oldCombined] = oldValue ?? [];

            let firsChanged = false;

            if (firs && oldFirs) {
                const oldCallsigns = new Set(oldFirs.map(x => x.controller.callsign));
                const callsigns = new Set(firs.map(x => x.controller.callsign));

                firsChanged = ![...callsigns].every(x => oldCallsigns.has(x)) || ![...oldCallsigns].every(x => callsigns.has(x));
            }

            let localsChanged = firsChanged;

            if (!localsChanged && oldLocals) {
                const oldCallsigns = new Set(oldLocals.map(x => x.atc.callsign));
                const callsigns = new Set(locals.map(x => x.atc.callsign));

                localsChanged = ![...callsigns].every(x => oldCallsigns.has(x)) || ![...oldCallsigns].every(x => callsigns.has(x));
            }

            let combinedChanged = localsChanged;

            if (!combinedChanged) {
                combinedChanged = oldCombined !== undefined && combined !== oldCombined;
            }

            let dynamicChanged = combinedChanged;

            if (!dynamicChanged && dynamic && oldDynamic) {
                dynamicChanged = JSON.stringify(dynamic.data) !== JSON.stringify(oldDynamic.data);
            }

            if (!dynamicChanged) {
                return;
            }

            if (!combineDataInitialized && vatglassesCombined.value) {
                await updateVatglassesStateLocal(true);
                await initVatglassesCombined();
            }
            else {
                updateVatglassesStateLocal();
            }
        });

        watch(dataStore.vatglasses, val => {
            // the base vatglasses data has changed, we have to recalculate all
            (async () => {
                await waitForRunningVatglassesUpdate();
                // we make it this way to not trigger the shallowRef watchers, to avoid that all sectors are removed during recalculation
                for (const countryGroupId in dataStore.vatglassesActivePositions.value) {
                    for (const positionId in dataStore.vatglassesActivePositions.value[countryGroupId]) {
                        const vatglassesPosition = dataStore.vatglassesActivePositions.value[countryGroupId][positionId];
                        vatglassesPosition.sectors = null;
                        vatglassesPosition.sectorsCombined = null;
                        vatglassesPosition.airspaceKeys = null;
                    }
                }
                updateVatglassesStateLocal();
            })();
        });
    }
}

