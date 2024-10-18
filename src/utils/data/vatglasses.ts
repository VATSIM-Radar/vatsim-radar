import type Feature from 'ol/Feature';
import type Polygon from 'ol/geom/Polygon';
import type { Feature as TurfFeature, Polygon as TurfPolygon, Position } from 'geojson';

import { useStore } from '~/store';
import { polygon } from '@turf/helpers';
import { GeoJSON } from 'ol/format';
import type { VatglassesAirspace, VatglassesSector } from '~/utils/backend/storage.js';
import combinedWorker from '~/composables/combination-worker.ts?worker';


const dataStore = useDataStore();
const facilities = useFacilitiesIds();

/*
If we want to get the initial load of the combined sectors, we need sectorsCombined, airspaceKeys and the vatglasses Data version of the server on which base the sectors were combined, to make sure we have the same data version on the client side.
*/


export interface ActiveVatglassesPosition {
    cid: number | null;
    callsign: string | null;
    sectors: TurfFeature<TurfPolygon>[] | null;
    sectorsCombined: TurfFeature<TurfPolygon>[] | null;
    airspaceKeys: string | null;
    lastUpdated: Ref<string | null>;
}
export interface ActiveVatglassesPositions {
    [countryGroupId: string]: {
        [vatglassesPositionId: string]: ActiveVatglassesPosition;
    };
}

export interface ActiveVatglassesRunways {
    [icao: string]: { active: string; potential: string[] };
}

let activeVatglassesAirspaces: { [countryGroupId: string]: { [vatglassesPositionId: string]: { [index: string]: VatglassesAirspace } } } = {};
let updatedVatglassesPositions: { [countryGroupId: string]: { [vatglassesPositionId: string]: null } } = {};


let calls = 0; // used for debug
function updateVatglassesPositionsAndAirspaces() {
    let first = 0; // used for debug
    calls++; // used for debug
    console.log('Calls', calls); // used for debug

    const newActiveVatglassesPositions: ActiveVatglassesPositions = {};
    updatedVatglassesPositions = {};

    const activeVatglassesController: { [countryGroupId: string]: { [vatglassesPositionId: string]: { cid: number; callsign: string } } } = {}; // countryGroupId is the name of the json files which are split into areas
    // Fill the activeVatglassesStations object with the active stations
    if (dataStore.vatglasses.value?.data) {
        const arrivalController = [];
        for (const atc of dataStore.vatsim.data.locals.value) {
            if (!atc.isATIS && atc.atc.facility === facilities.APP) {
                arrivalController.push(atc);
            }
        }

        for (const fir of [...dataStore.vatsim.data.firs.value, ...arrivalController]) { // this has an entry for each center controller connected. const fir is basically a center controller
            // In data.firs it is called controller, in data.locals it is called atc, so we have to get the correct one
            let atc = null;
            if ('controller' in fir) {
                atc = fir.controller;
            }
            else if ('atc' in fir) {
                atc = fir.atc;
            }
            if (!atc) continue;


            // used for debug
            // if (first === 0) {
            //     atc.frequency = '134.150';
            //     atc.callsign = 'EDMM_ZUG_CTR';
            //     atc.cid = 1025793;
            //     first++;
            // }
            // else if (first === 1) {
            //     // break;
            //     if (calls > 3) break;
            //     console.log('ALB');
            //     atc.frequency = '129.100';
            //     atc.callsign = 'EDMM_ALB_CTR';
            //     atc.cid = 1025794;
            //     first++;
            // }
            // else {
            //     break;
            // }


            let foundMatchingVatglassesController = false;
            // We sort the keys with the first two chars of the callsign, so we can check first the most likely countryGroupIds
            const keys = Object.keys(dataStore.vatglasses.value?.data);
            const searchString = atc.callsign.substring(0, 2);
            const matchingKeys = keys.filter(key => key.includes(searchString));
            const nonMatchingKeys = keys.filter(key => !key.includes(searchString));
            const sortedKeys = [...matchingKeys, ...nonMatchingKeys];

            for (const countryGroupId of sortedKeys) {
                if (foundMatchingVatglassesController) break;
                const countryGroup = dataStore.vatglasses.value?.data[countryGroupId];
                for (const vatglassesPositionId in countryGroup.positions) {
                    const vatglassesPosition = countryGroup.positions[vatglassesPositionId];
                    if (vatglassesPosition.frequency !== atc.frequency) continue;
                    if (!atc.callsign.endsWith(vatglassesPosition.type)) continue;
                    if (!vatglassesPosition.pre.some(prefix => atc.callsign.startsWith(prefix))) continue;
                    if (activeVatglassesController?.[countryGroupId]?.[vatglassesPositionId] != null) continue; // There is already a controller assigned to this vatglasses position


                    if (!activeVatglassesController[countryGroupId]) {
                        activeVatglassesController[countryGroupId] = {};
                    }
                    activeVatglassesController[countryGroupId][vatglassesPositionId] = { cid: atc.cid, callsign: atc.callsign };
                    foundMatchingVatglassesController = true;
                    break;
                }
            }
        }
    }

    // TODO: We could compare the entries of `activeVatglassesStations` with `dataStore.vatglassesActivePositions.value[countryGroupId][positionId]`, and if they are equal, no position has changed and we have nothing to do. However, we need to consider if a runway was updated or changed in the frontend and therefore this update cycle was called. Maybe use a parameter in this function like `runwayChanged`, and when we call updateVatglassesState() in the `activeRunwayChanged` function, we pass this parameter.


    // Fill the activeVatglassesAirspaces object with the active airspaces
    activeVatglassesAirspaces = {};
    for (const countryGroupId in dataStore.vatglasses.value?.data) {
        if (!activeVatglassesController[countryGroupId]) continue;// countryGroup has no active positions
        const countryGroup = dataStore.vatglasses.value?.data[countryGroupId];

        const activeGroupVatglassesPosition = Object.keys(activeVatglassesController[countryGroupId]);
        for (const [airspaceIndex, airspace] of countryGroup.airspace.entries()) {
            const vatglassesPositionId = airspace.owner.find(element => {
                if (element.includes('/')) { // Cover this cases: Positions from other data files can be referenced in the format country/position, where position is defined in country.json
                    const elementSplit = element.split('/');
                    const otherCountryCode = elementSplit[0];
                    const otherGroupVatglassesPosition = elementSplit[1];
                    if (activeVatglassesController[otherCountryCode]) {
                        const otherGroupActiveVatglassesPositions = Object.keys(activeVatglassesController[otherCountryCode]);
                        return otherGroupActiveVatglassesPositions.includes(otherGroupVatglassesPosition);
                    }
                }
                else {
                    return activeGroupVatglassesPosition.includes(element);
                }
            });


            if (!vatglassesPositionId) continue;
            if (!activeVatglassesAirspaces[countryGroupId]) activeVatglassesAirspaces[countryGroupId] = {};
            if (!activeVatglassesAirspaces[countryGroupId][vatglassesPositionId]) activeVatglassesAirspaces[countryGroupId][vatglassesPositionId] = {};

            // Add airspace to the object, we use the airspaceKey as identifier because we know for sure it is unique, i don't think the airspace.id is unique for sure
            activeVatglassesAirspaces[countryGroupId][vatglassesPositionId][airspaceIndex] = airspace;
        }
    }


    // set required runways (required are runways which are used to show sectors with an active position) and default active runway
    const vatglassesRunwaysUpdated: ActiveVatglassesRunways = {};
    for (const countryGroupId in activeVatglassesAirspaces) {
        for (const positionId in activeVatglassesAirspaces[countryGroupId]) {
            const airspaces = activeVatglassesAirspaces[countryGroupId][positionId];
            for (const airspaceId in airspaces) {
                const airspace = airspaces[airspaceId];
                for (const sector of airspace.sectors) {
                    if (!sector.runways) continue;
                    for (const runway of sector.runways) {
                        const runways = dataStore.vatglasses.value?.data[countryGroupId]?.airports?.[runway.icao]?.runways;
                        if (runways) {
                            vatglassesRunwaysUpdated[runway.icao] = { active: '', potential: [] };
                            vatglassesRunwaysUpdated[runway.icao].potential = runways; // we set as default the first of the defined runways
                            if (dataStore.vatglassesActiveRunways.value[runway.icao]?.active) {
                                vatglassesRunwaysUpdated[runway.icao].active = dataStore.vatglassesActiveRunways.value[runway.icao].active;
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
    dataStore.vatglassesActiveRunways.value = vatglassesRunwaysUpdated;

    // Get the active sectors of a position based on the active airspaces
    for (const countryGroupId in activeVatglassesAirspaces) {
        for (const positionId in activeVatglassesAirspaces[countryGroupId]) {
            if (!newActiveVatglassesPositions[countryGroupId]) newActiveVatglassesPositions[countryGroupId] = {};

            if (dataStore.vatglassesActivePositions.value?.[countryGroupId]?.[positionId]) {
                newActiveVatglassesPositions[countryGroupId][positionId] = dataStore.vatglassesActivePositions.value[countryGroupId][positionId];
            }
            else {
                newActiveVatglassesPositions[countryGroupId][positionId] = { cid: null, callsign: null, sectors: null, sectorsCombined: null, airspaceKeys: null, lastUpdated: ref<string | null>(null) }; // we set null instead of [], because null is the signal for later that we have to recalculate it
            }

            newActiveVatglassesPositions[countryGroupId][positionId].cid = activeVatglassesController[countryGroupId][positionId].cid;
            newActiveVatglassesPositions[countryGroupId][positionId].callsign = activeVatglassesController[countryGroupId][positionId].callsign;


            // Check if the airspaces of a position have changed and reset the sectors if they have changed so they will be recalculated
            const airspacesIndexesJoined = newActiveVatglassesPositions[countryGroupId][positionId].airspaceKeys;
            if (airspacesIndexesJoined !== Object.keys(activeVatglassesAirspaces[countryGroupId][positionId]).join(',')) {
                resetActiveVatglassesPositions(newActiveVatglassesPositions[countryGroupId][positionId]); // this will set the sectors to null so they will be recalculated
                newActiveVatglassesPositions[countryGroupId][positionId].airspaceKeys = Object.keys(activeVatglassesAirspaces[countryGroupId][positionId]).join(',');
            }

            if (newActiveVatglassesPositions[countryGroupId][positionId]['sectors'] === null) { // if it is null, it is the signal for us this needs to be (re)calculated
                // set all active sectors of the position
                addToUpdatedVatglassesPositions(countryGroupId, positionId);
                const sectors = [];
                for (const airspaceId in activeVatglassesAirspaces[countryGroupId][positionId]) {
                    const airspace = activeVatglassesAirspaces[countryGroupId][positionId][airspaceId];
                    for (const sector of getActiveSectorsOfAirspace(airspace)) {
                        sectors.push(sector);
                    }
                }

                newActiveVatglassesPositions[countryGroupId][positionId]['sectors'] = sectors.map(sector => convertSectorToGeoJson(sector, countryGroupId, positionId)).filter(sector => sector !== false) || [];
            }
        }
    }

    return newActiveVatglassesPositions;
}

// reset the entry of a PositionId
function resetActiveVatglassesPositions(sector: ActiveVatglassesPosition) {
    sector['sectors'] = null;
    sector['sectorsCombined'] = null;
}

function addToUpdatedVatglassesPositions(countryGroupId: string, vatglassesPositionId: string) {
    if (!updatedVatglassesPositions[countryGroupId]) {
        updatedVatglassesPositions[countryGroupId] = {};
    }
    updatedVatglassesPositions[countryGroupId][vatglassesPositionId] = null;
}

function triggerUpdatedVatglassesPositions(newActiveVatglassesPositions: ActiveVatglassesPositions) {
    for (const countryGroupId in updatedVatglassesPositions) {
        for (const positionId in updatedVatglassesPositions[countryGroupId]) {
            newActiveVatglassesPositions[countryGroupId][positionId]['lastUpdated'].value = new Date().toISOString();
        }
    }
}

// return the active sectors of an airspace based on the runways
function getActiveSectorsOfAirspace(airspace: VatglassesAirspace) {
    const result: VatglassesSector[] = [];
    for (const sector of airspace.sectors) {
        result.push(sector);
        if (sector.runways) {
            let configActive = true;
            for (const sectorRunway of sector.runways) {
                if (!dataStore.vatglassesActiveRunways.value[sectorRunway.icao]) {
                    configActive = false;
                    break;
                }
                if (Array.isArray(sectorRunway.runway)) {
                    if (!sectorRunway.runway.includes(dataStore.vatglassesActiveRunways.value[sectorRunway.icao].active)) {
                        configActive = false;
                        break;
                    }
                }
                else {
                    if (sectorRunway.runway !== dataStore.vatglassesActiveRunways.value[sectorRunway.icao].active) {
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


// Converts from vatglasses sector format to geojson format
function convertSectorToGeoJson(sector: VatglassesSector, countryGroupId: string, positionId: string) {
    try {
        // Create a polygon turf object
        const firstCoord = sector.points[0];
        const lastCoord = sector.points[sector.points.length - 1];

        if (firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1]) {
            sector.points.push(firstCoord);
        }

        const convertedPoints: Position[] = sector.points.map(point => point.map(Number)); // convert from string to Position type

        const geoJsonPolygon: TurfFeature<TurfPolygon> = polygon([convertedPoints], {
            // id: airspace.id,
            min: sector.min ?? 0,
            max: sector.max ?? 999,
            countryGroupId: countryGroupId,
            vatglassesPositionId: positionId,
            colour: dataStore.vatglasses.value?.data?.[countryGroupId]?.positions?.[positionId]?.colours?.[0]?.hex ?? getCurrentThemeRgbColor('success500').join(','),
            type: 'vatglasses',
        });
        return geoJsonPolygon;
    }
    catch (e) {
        console.log(e);
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

const worker = new combinedWorker();

// This function is used for the combined mode. It splits the sectors into smaller parts, each area exists only once in the result. Each split has an altrange which contains the vertical limits of the sector.
function splitSectorsWithWorker(sectors: any): Promise<any> {
    return new Promise((resolve, reject) => {
        worker.postMessage(['splitSectors', sectors]);

        worker.onmessage = function(event) {
            resolve(event.data);
        };

        worker.onerror = function(error) {
            reject(error);
        };
    });
}


function combineSectorsWithWorker(sectors: any): Promise<any> {
    return new Promise((resolve, reject) => {
        worker.postMessage(['combineSectors', sectors]);

        worker.onmessage = function(event) {
            resolve(event.data);
        };

        worker.onerror = function(error) {
            reject(error);
        };
    });
}

// This function is used for the combined mode. It combines the sectors which are splitted before. It combines the sectors which are splitted before. We combine all splited sectors with the same vertical limits into one polygon.
async function combineAllActiveVatglassesSectors(newActiveVatglassesSectors: { [countryGroupId: string]: { [vatglassesPositionId: string]: ActiveVatglassesPosition } }) {
    for (const countryGroupId in newActiveVatglassesSectors) {
        for (const positionId in newActiveVatglassesSectors[countryGroupId]) {
            if (!newActiveVatglassesSectors[countryGroupId][positionId]) continue;
            if (newActiveVatglassesSectors[countryGroupId][positionId]['sectorsCombined'] === null) { // if it is null, it is the signal for us this needs to be (re)calculated
                addToUpdatedVatglassesPositions(countryGroupId, positionId);
                const sectors = newActiveVatglassesSectors[countryGroupId][positionId]['sectors'];
                if (sectors) {
                    const splittedSectors = await splitSectorsWithWorker(sectors);

                    if (splittedSectors) newActiveVatglassesSectors[countryGroupId][positionId]['sectorsCombined'] = await combineSectorsWithWorker(splittedSectors);
                }
            }
        }
    }
}


// Function to convert GeoJSON back to OpenLayers features
export function convertToOpenLayersFeatures(geoJSONPolygons: TurfFeature<TurfPolygon>[]): Feature<Polygon>[] {
    const format = new GeoJSON();
    return geoJSONPolygons.map(polygon => format.readFeature(polygon) as Feature<Polygon>);
}


async function waitForRunningVatglassesUpdate() {
    while (vatglassesUpdateInProgress) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

// Call this function when a runway was changed at the frontend
export async function activeRunwayChanged(icao: string | string[]) {
    await waitForRunningVatglassesUpdate();
    if (typeof icao === 'string') icao = [icao];

    for (const countryGroupId in activeVatglassesAirspaces) {
        for (const positionId in activeVatglassesAirspaces[countryGroupId]) {
            let resetSectors = false;
            const airspaces = activeVatglassesAirspaces[countryGroupId][positionId];
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
            if (resetSectors) resetActiveVatglassesPositions(dataStore.vatglassesActivePositions.value[countryGroupId][positionId]);
        }
    }

    updateVatglassesState();
}

let vatglassesUpdateInProgress = false;
export async function updateVatglassesState() {
    const store = useStore();
    if (vatglassesUpdateInProgress) return;

    console.time('updateVatglasses');

    vatglassesUpdateInProgress = true;
    const newActiveVatglassesPositions = updateVatglassesPositionsAndAirspaces();
    if (store.localSettings.traffic?.vatglassesLevel === true) {
        await combineAllActiveVatglassesSectors(newActiveVatglassesPositions);
    }
    triggerUpdatedVatglassesPositions(newActiveVatglassesPositions);
    dataStore.vatglassesActivePositions.value = newActiveVatglassesPositions;
    vatglassesUpdateInProgress = false;


    console.timeEnd('updateVatglasses');
    // console.log('activeVatglassesSectors', newActiveVatglassesPositions);
    // console.log('vatglassesRunways', vatglassesRunways);
    // console.log('activeSectors', activeVatglassesAirspaces);
    // console.log('assignedVatglassesPositions', activeVatglassesPositions);
}


watch([dataStore.vatsim.data.firs, dataStore.vatsim.data.locals], () => {
    updateVatglassesState();
});

watch(dataStore.vatglasses, val => {
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
        updateVatglassesState();
    })();
});
