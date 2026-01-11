import type {
    NavDataProcedure,
    NavigraphNavDataApproach,
    NavigraphNavDataApproachShort,
    NavigraphNavDataEnrouteWaypointPartial, NavigraphNavDataShort,
    NavigraphNavDataShortProcedures,
    NavigraphNavDataStar,
    NavigraphNavDataStarShort, ShortAirway,
} from '~/utils/backend/navigraph/navdata/types';
import { clientDB } from '~/utils/client-db';
import type { IDBNavigraphProcedures } from '~/utils/client-db';
import { useStore } from '~/store';
import { isFetchError } from '~/utils/shared';
import type { Coordinate } from 'ol/coordinate';
import { StorageSerializers } from '@vueuse/core';
import distance from '@turf/distance';
import type { DataStoreNavigraphProcedure, DataStoreNavigraphProceduresAirport } from '~/composables/render/storage';
import type { VatsimNattrak, VatsimNattrakClient } from '~/types/data/vatsim';

export type NavigraphDataAirportKeys = 'sids' | 'stars' | 'approaches';

export async function getNavigraphAirportProcedures(airport: string): Promise<IDBNavigraphProcedures> {
    const idbAirport = await clientDB.navigraphAirports.get(airport);
    if (idbAirport?.approaches && idbAirport?.stars && idbAirport?.sids) return idbAirport;

    const store = useStore();

    const data = await $fetch<NavigraphNavDataShortProcedures>(`/api/data/navigraph/procedure/${ store.user?.hasFms ? 'current' : 'outdated' }/${ airport }?airac=${ navigraphAirac.value }&version=${ store.version }`).catch(() => {
    });

    if (data) {
        if (idbAirport) {
            Object.assign(data, idbAirport);
        }

        await clientDB.navigraphAirports.put(data, airport);
        return data;
    }

    return {
        stars: [],
        sids: [],
        approaches: [],
    };
}

export const navigraphAirac = computed(() => {
    return useDataStore().versions.value?.navigraph?.[useStore().user?.hasFms ? 'current' : 'outdated'];
});

export async function getNavigraphAirportShortProceduresForKey<T extends NavigraphDataAirportKeys>(get: T, airport: string): Promise<T extends 'approaches' ? NavigraphNavDataApproachShort[] : NavigraphNavDataStarShort[]> {
    const idbAirport = await clientDB.navigraphAirports.get(airport);
    const idbData = idbAirport?.[get];
    if (idbData) return idbData as any;

    const store = useStore();

    const data = await $fetch<any[]>(`/api/data/navigraph/procedure/${ store.user?.hasFms ? 'current' : 'outdated' }/${ airport }/${ get }?airac=${ navigraphAirac.value }&version=${ store.version }`).catch(e => e);

    if (Array.isArray(data)) {
        // @ts-expect-error dynamic data
        await clientDB.navigraphAirports.put({
            ...idbAirport,
            [get]: data,
        }, airport);
        return data;
    }

    if (isFetchError(data) && data.statusCode === 404) {
        // @ts-expect-error dynamic data
        await clientDB.navigraphAirports.put({
            ...idbAirport,
            [get]: [],
        }, airport);
    }
    else {
        console.error(data);
    }

    return [];
}

export async function getNavigraphAirportProceduresForKey<T extends NavigraphDataAirportKeys>(get: T, airport: string): Promise<T extends 'approaches' ? NavDataProcedure<NavigraphNavDataApproach>[] : NavDataProcedure<NavigraphNavDataStar>[]> {
    const idbAirport = await clientDB.navigraphAirports.get(airport);
    const idbData = idbAirport?.[get];
    if (idbData?.every(x => x.procedure)) return idbData.map(x => x.procedure) as any;

    const store = useStore();

    const data = await $fetch<any>(`/api/data/navigraph/procedure/${ store.user?.hasFms ? 'current' : 'outdated' }/${ airport }/${ get }/all?airac=${ navigraphAirac.value }&version=${ store.version }`).catch(e => e);

    if (Array.isArray(data)) {
        if (idbData) {
            await clientDB.navigraphAirports.put({
                ...idbAirport,
                [get]: idbData.map((x, index) => ({
                    ...x,
                    procedure: data[index],
                })),
            }, airport);
        }
        return data;
    }

    if (isFetchError(data) && data.statusCode === 404) {
        // @ts-expect-error dynamic data
        await clientDB.navigraphAirports.put({
            ...idbAirport,
            [get]: [],
        }, airport);
    }
    else {
        console.error(data);
    }

    return [];
}

export async function getNavigraphAirportProcedure<T extends NavigraphDataAirportKeys>(get: T, airport: string, index: number): Promise<T extends 'approaches' ? NavDataProcedure<NavigraphNavDataApproach> | null : NavDataProcedure<NavigraphNavDataStar> | null> {
    const idbAirport = await clientDB.navigraphAirports.get(airport);
    const idbData = idbAirport?.[get];
    const idbProcedure = idbData?.[index];
    if (idbProcedure?.procedure) return idbProcedure.procedure as any;

    const store = useStore();

    const data = await $fetch<NavDataProcedure<NavigraphNavDataStar> | NavDataProcedure<NavigraphNavDataApproach>>(`/api/data/navigraph/procedure/${ store.user?.hasFms ? 'current' : 'outdated' }/${ airport }/${ get }/${ index }?airac=${ navigraphAirac.value }&version=${ store.version }`).catch(() => {
    });

    if (data) {
        if (idbProcedure) {
            idbProcedure.procedure = data;
            // @ts-expect-error dynamic data
            await clientDB.navigraphAirports.put({
                ...idbAirport,
                [get]: idbData,
            }, airport);
        }

        return data as any;
    }

    return null;
}

const replacementRegex = /[^a-zA-Z0-9\/]+/;
const latRegex = /^(\d{2,4})([NS])/;
const lonRegex = /^(\d{3,5})([EW])/;
const sidstarRegex = /((?<start>[A-Z]{3,5})(?<end>[0-9]([A-Z])?))/;

function getSidStarResult(route: string) {
    const result = sidstarRegex.exec(route);
    if (!result) return null;

    const start = result.groups?.start;
    const end = result.groups?.end;

    if (!start || !end) return null;

    if (start.length === 5 && end.length === 2) {
        return `${ start.slice(0, 4) }${ end }`;
    }

    return `${ start }${ end }`;
}

export interface EnroutePath {
    icao?: string;
    runways: string[];
    sids: Record<string, Omit<DataStoreNavigraphProcedure, 'procedure'>>;
    stars: Record<string, Omit<DataStoreNavigraphProcedure, 'procedure'>>;
    approaches: Record<string, Omit<DataStoreNavigraphProcedure<NavigraphNavDataApproach>, 'procedure'>>;
    setBy: DataStoreNavigraphProceduresAirport['setBy'];
}

export const enroutePath = useStorageLocal<Record<string, EnroutePath> | null>('enroute-path', null, undefined, { serializer: StorageSerializers.object });

// @ts-expect-error Checking for an invalid local storage
if (typeof window !== 'undefined' && enroutePath.value === '[object Object]') enroutePath.value = null;

export const enrouteAircraftPath = useStorageLocal<Record<string, {
    departure: EnroutePath;
    arrival: EnroutePath;
}> | null>('enroute-aircraft-path', {}, undefined, { serializer: StorageSerializers.object });

export function getPreciseCoord(input: string): [Coordinate, string] | null {
    const latMatch = input.match(latRegex);
    if (latMatch) {
        const latDigits = latMatch[1];
        const latDir = latMatch[2];
        const remainder = input.slice(latMatch[0].length);
        const lonMatch = remainder.match(lonRegex);

        if (!lonMatch) return null;

        const lonDigits = lonMatch[1];
        const lonDir = lonMatch[2];

        function toDecimal(degMin: string) {
            if (degMin.length <= 3) {
                return parseInt(degMin, 10);
            }

            const len = degMin.length;
            const deg = parseInt(degMin.slice(0, len - 2), 10);
            const min = parseInt(degMin.slice(len - 2), 10);
            return deg + (min / 60);
        }

        const lat = (latDir === 'N' ? 1 : -1) * toDecimal(latDigits);
        const lon = (lonDir === 'E' ? 1 : -1) * toDecimal(lonDigits);

        return [[lon, lat], `${ latDir }${ latDigits }${ lonDir }${ lonDigits }`];
    }

    const parts = input.split('/');
    if (parts.length === 2) {
        const latPart = parts[0];
        const lonPart = parts[1];

        if (!lonPart) return null;

        let lonDeg: number;
        if (lonPart.length === 4) {
            // ddmm → 15°20′ = 15 + 20 / 60
            const deg = parseInt(lonPart.slice(0, 2), 10);
            const min = parseInt(lonPart.slice(2, 4), 10);
            lonDeg = deg + (min / 60);
        }
        else {
            lonDeg = parseFloat(lonPart);
        }

        if (isNaN(lonDeg)) return null;

        let lat: number;

        if (latPart.length === 4) {
            // ddmm → 49°30′ = 49 + 30 / 60
            const deg = parseInt(latPart.slice(0, 2), 10);
            const min = parseInt(latPart.slice(2, 4), 10);
            lat = deg + (min / 60);
        }
        else if (latPart.length <= 2) {
            lat = parseFloat(latPart);
        }
        else {
            return null;
        }

        if (isNaN(lat)) return null;

        return [[-lonDeg, lat], `N${ latPart }W${ lonPart }`];
    }

    return null;
}

export interface FlightPlanInputWaypoint {
    flightPlan: string;
    departure: string;
    arrival: string;
    cid: number;
    disableSidParsing?: boolean;
    disableStarParsing?: boolean;
    disableHoldings?: boolean;
    disableLabels?: boolean;
}

export function waypointDiff(compare: Coordinate, coordinate: Coordinate): number {
    return distance(compare, coordinate, { units: 'nauticalmiles' });
}

const routeRegex = /(?<waypoint>([A-Z0-9]+))\/([A-Z0-9]+?)(?<level>([FS])([0-9]{2,4}))/;
const NATRegex = /^NAT(?<letter>[A-Z])$/;

const dataCache: {
    [K in 'vhf' | 'ndb' | 'waypoints' | 'airways']: NavigraphNavDataShort[K]
} = {
    vhf: {},
    ndb: {},
    waypoints: {},
    airways: {},
};

let latestUpdate = 0;

export async function getNavigraphParsedData<T extends 'vhf' | 'ndb' | 'waypoints' | 'airways'>(type: T, key: string): Promise<NavigraphNavDataShort[T] | null>;
export async function getNavigraphParsedData(type: 'vhf' | 'ndb' | 'waypoints' | 'airways', key: string): Promise<any | null> {
    latestUpdate = Date.now();

    if (key in dataCache[type]) return dataCache[type][key];
    const data = await clientDB.navigraphDB.get(`${ type }-${ key }`) ?? null;
    dataCache[type][key] = data as any;
    return data;
}

// Cleanup when cache not used
if (typeof window !== 'undefined') {
    setInterval(() => {
        if (latestUpdate && Date.now() - latestUpdate > 1000 * 15) {
            dataCache.vhf = {};
            dataCache.ndb = {};
            dataCache.waypoints = {};
            dataCache.airways = {};
        }
    }, 1000);
}

export async function getFlightPlanWaypoints({
    flightPlan,
    departure,
    arrival,
    cid,
    disableStarParsing,
    disableSidParsing,
}: FlightPlanInputWaypoint): Promise<NavigraphNavDataEnrouteWaypointPartial[]> {
    const waypoints: NavigraphNavDataEnrouteWaypointPartial[] = [];
    const dataStore = useDataStore();
    const entries = flightPlan.split(' ').map(x => x.replace(replacementRegex, '')).filter(x => x && x !== 'DCT');

    function deleteDoubleWaypoint(identifier: string) {
        const previousWaypoint = waypoints[waypoints.length - 1];
        let previousIdentifier = previousWaypoint.identifier;
        if (previousWaypoint.airway) {
            previousIdentifier = previousWaypoint.airway.value[2][previousWaypoint.airway.value[2].length - 1][0];

            if (identifier === previousIdentifier) previousWaypoint.airway.value[2].splice(previousWaypoint.airway.value[2].length - 1, 1);
        }
        else if (identifier === previousIdentifier) waypoints.splice(waypoints.length - 1, 1);
    }

    let sidInit = false;
    let starInit = false;

    let selectedDeparture = dataStore.navigraphAircraftProcedures.value[cid.toString()]?.departure;
    let selectedArrival = dataStore.navigraphAircraftProcedures.value[cid.toString()]?.arrival;

    if ((selectedDeparture?.icao && selectedDeparture.icao !== departure) || (selectedArrival?.icao && selectedArrival.icao !== arrival)) {
        delete dataStore.navigraphAircraftProcedures.value[cid.toString()];
        selectedDeparture = undefined;
        selectedArrival = undefined;
    }

    let depRunway = selectedDeparture?.runways[0];
    let arrRunway = selectedArrival?.runways[0];

    if (!arrRunway && selectedArrival?.approaches) {
        const approaches = Object.values(selectedArrival?.approaches);
        arrRunway = approaches[0]?.procedure?.procedure?.runway;
    }

    const depSid = Object.values(selectedDeparture?.sids ?? {})[0];
    const arrStar = Object.values(selectedArrival?.stars ?? {})[0];
    const arrApproach = Object.values(selectedArrival?.approaches ?? {})[0];

    let letter = '';

    try {
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            let split = entry.split('/');
            if (split.length > 2) split = split.slice(split.length - 2, split.length);
            if (split[1] && latRegex.test(split[1])) split.reverse();
            const search = split[0];

            if (split[1] && entry.startsWith(departure)) depRunway = split[1];

            if (routeRegex.test(entry)) split = split.slice(0, 1);

            const nat = NATRegex.exec(entry);

            if (letter && entries[i - 1] === letter && entries[i + 1] === letter) continue;

            if (nat?.groups?.letter) {
                const natRoute = dataStore.vatsim.tracks.value.find(x => x.identifier === nat?.groups?.letter);
                if (natRoute) {
                    if (letter) continue;
                    letter = entry;
                    waypoints.push(...await buildNATWaypoints(natRoute));
                }

                continue;
            }

            const sidTest = disableSidParsing ? false : sidstarRegex.test(search);

            // SIDs
            if ((sidTest || depSid) && !sidInit) {
                if (sidTest) {
                    depRunway ??= split[1];
                }

                let sid = -1;

                if (!depSid) {
                    const tested = getSidStarResult(search);
                    const sids = await getNavigraphAirportShortProceduresForKey('sids', departure);
                    sid = sids.findIndex(x => x.identifier === tested);
                }

                if (depSid || (sid !== -1)) {
                    const procedure = depSid?.procedure ?? await getNavigraphAirportProcedure('sids', departure, sid);

                    if (depRunway) {
                        const runwayTransition = procedure?.transitions.runway.find(x => x.name === depRunway);
                        if (runwayTransition) {
                            waypoints.push(...runwayTransition.waypoints.map(x => ({
                                identifier: x.identifier,
                                title: procedure?.procedure.identifier,
                                coordinate: x.coordinate,
                                description: x.description,
                                kind: 'sids',

                                altitude: x.altitude,
                                altitude1: x.altitude1,
                                altitude2: x.altitude2,
                                speed: x.speed,
                                speedLimit: x.speedLimit,
                            } satisfies NavigraphNavDataEnrouteWaypointPartial)));
                        }
                    }

                    waypoints.push(...procedure?.waypoints.map(x => ({
                        title: procedure?.procedure.identifier,
                        identifier: x.identifier,
                        coordinate: x.coordinate,
                        description: x.description,
                        kind: 'sids',

                        altitude: x.altitude,
                        altitude1: x.altitude1,
                        altitude2: x.altitude2,
                        speed: x.speed,
                        speedLimit: x.speedLimit,
                    } satisfies NavigraphNavDataEnrouteWaypointPartial)) ?? []);

                    const enrouteTransition = procedure?.transitions.enroute.find(x => x.name === entries[1] || x.name === entries[2]);
                    if (enrouteTransition) {
                        waypoints.push(...enrouteTransition.waypoints.map(x => ({
                            title: procedure?.procedure.identifier,
                            identifier: x.identifier,
                            coordinate: x.coordinate,
                            description: x.description,
                            kind: 'sids',

                            altitude: x.altitude,
                            altitude1: x.altitude1,
                            altitude2: x.altitude2,
                            speed: x.speed,
                            speedLimit: x.speedLimit,
                        } satisfies NavigraphNavDataEnrouteWaypointPartial)));
                    }

                    sidInit = true;

                    continue;
                }
            }

            const starTest = disableStarParsing ? false : sidstarRegex.test(entry);

            // STARs/Approaches
            if (!starInit && ((!arrStar && !arrApproach) ? starTest : i === entries.length - 1)) {
                let star = -1;

                if (!arrRunway) {
                    const [, splitRunway] = split;
                    arrRunway = entries[entries.length - 1].split('/')[1] || splitRunway;
                }

                if (!arrStar) {
                    const stars = await getNavigraphAirportShortProceduresForKey('stars', arrival);
                    const tested = getSidStarResult(search);
                    star = stars.findIndex(x => x.identifier === tested);

                    const nextEntry = entries[i + 1];
                    const nextEntryTest = nextEntry && getSidStarResult(nextEntry);

                    if (nextEntryTest && stars.some(x => x.identifier === nextEntryTest)) continue;
                }

                if (arrStar || arrApproach || star !== -1) {
                    starInit = true;

                    const procedure = arrStar?.procedure ?? await getNavigraphAirportProcedure('stars', arrival, star);
                    let arrivalProcedures = (arrRunway && await getNavigraphAirportShortProceduresForKey('approaches', arrival));

                    if (!arrivalProcedures && Array.isArray(procedure?.procedure.runways) && procedure?.procedure.runways.length === 1 && procedure?.procedure.runways[0]) {
                        arrRunway = procedure?.procedure.runways[0];
                        arrivalProcedures = await getNavigraphAirportShortProceduresForKey('approaches', arrival);
                    }

                    const enrouteTransition = procedure?.transitions.enroute.find(x => arrStar?.transitions.includes(x.name) || x.name === entries[entries.length - 2] || x.name === entries[entries.length - 3] || x.name === entries[entries.length - 4]);
                    if (enrouteTransition) {
                        deleteDoubleWaypoint(enrouteTransition.waypoints[0].identifier);

                        waypoints.push(...enrouteTransition.waypoints.map(x => ({
                            title: procedure?.procedure.identifier,
                            identifier: x.identifier,
                            coordinate: x.coordinate,
                            description: x.description,
                            kind: 'stars',

                            altitude: x.altitude,
                            altitude1: x.altitude1,
                            altitude2: x.altitude2,
                            speed: x.speed,
                            speedLimit: x.speedLimit,
                        } satisfies NavigraphNavDataEnrouteWaypointPartial)));
                    }

                    deleteDoubleWaypoint(procedure?.waypoints[0]?.identifier ?? '');

                    waypoints.push(...procedure?.waypoints.map(x => ({
                        title: procedure?.procedure.identifier,
                        identifier: x.identifier,
                        coordinate: x.coordinate,
                        description: x.description,
                        kind: 'stars',

                        altitude: x.altitude,
                        altitude1: x.altitude1,
                        altitude2: x.altitude2,
                        speed: x.speed,
                        speedLimit: x.speedLimit,
                    } satisfies NavigraphNavDataEnrouteWaypointPartial)) ?? []);

                    if (arrivalProcedures) {
                        const forRunway = arrivalProcedures.filter(x => x.runway === arrRunway);
                        const procedure = arrApproach ? arrApproach.procedure : forRunway.find(x => x.name.startsWith('ILS')) ?? forRunway[0];
                        const fetchedProcedure = arrApproach
                            ? arrApproach.procedure
                            : procedure
                                ? await getNavigraphAirportProcedure('approaches', arrival, arrivalProcedures.findIndex(x => x.runway === (procedure as NavigraphNavDataApproachShort).runway && x.name === (procedure as NavigraphNavDataApproachShort).name))
                                : null;

                        if (fetchedProcedure) {
                            const transition = fetchedProcedure?.transitions.find(x => arrApproach?.transitions.includes(x.name) || x.name === entries[entries.length - 2]);
                            if (transition) {
                                deleteDoubleWaypoint(transition?.waypoints[0]?.identifier ?? '');

                                waypoints.push(...transition.waypoints.map(x => ({
                                    identifier: x.identifier,
                                    coordinate: x.coordinate,
                                    kind: 'approaches',
                                    description: x.description,

                                    altitude: x.altitude,
                                    altitude1: x.altitude1,
                                    altitude2: x.altitude2,
                                    speed: x.speed,
                                    speedLimit: x.speedLimit,
                                } satisfies NavigraphNavDataEnrouteWaypointPartial)));
                            }

                            deleteDoubleWaypoint(fetchedProcedure?.waypoints[0]?.identifier ?? '');
                            waypoints.push(...fetchedProcedure.waypoints.map(x => ({
                                identifier: x.identifier,
                                coordinate: x.coordinate,
                                kind: 'approaches',
                                description: x.description,

                                altitude: x.altitude,
                                altitude1: x.altitude1,
                                altitude2: x.altitude2,
                                speed: x.speed,
                                speedLimit: x.speedLimit,
                            } satisfies NavigraphNavDataEnrouteWaypointPartial)));

                            if (fetchedProcedure.procedure.missedApproach) {
                                waypoints.push(...fetchedProcedure.procedure.missedApproach.map(x => ({
                                    identifier: x.identifier,
                                    coordinate: x.coordinate,
                                    kind: 'missedApproach',
                                    description: x.description,

                                    altitude: x.altitude,
                                    altitude1: x.altitude1,
                                    altitude2: x.altitude2,
                                    speed: x.speed,
                                    speedLimit: x.speedLimit,
                                } satisfies NavigraphNavDataEnrouteWaypointPartial)));
                            }
                        }
                    }

                    continue;
                }
            }

            const precise = getPreciseCoord(entry);

            if (precise) {
                waypoints.push({
                    identifier: split[1] || precise[1] || entry,
                    coordinate: precise[0],
                    kind: 'enroute',
                });
                continue;
            }

            function previousWaypointCoordinate(waypoint: NavigraphNavDataEnrouteWaypointPartial): Coordinate | null {
                if (!waypoint) {
                    if (!dataStore.vatspy.value?.data.keyAirports.realIcao[departure]) return null;

                    return [dataStore.vatspy.value?.data.keyAirports.realIcao[departure].lon, dataStore.vatspy.value?.data.keyAirports.realIcao[departure].lat];
                }

                return waypoint?.coordinate || [waypoint?.airway?.value[2][waypoint?.airway?.value[2].length - 1]?.[3], waypoint?.airway?.value[2][waypoint?.airway?.value[2].length - 1]?.[4]] as Coordinate;
            }

            const previousWaypoint = previousWaypointCoordinate(waypoints[waypoints.length - 1]);

            const prevEntry = entries[i - 1]?.split('/')[0];
            if (prevEntry && waypoints[waypoints.length - 1]?.airway && await getNavigraphParsedData('airways', prevEntry)) {
                continue;
            }

            const nextEntry = entries[i + 1]?.split('/')[0];
            if (nextEntry && await getNavigraphParsedData('airways', nextEntry)) {
                continue;
            }

            const airways = await getNavigraphParsedData('airways', search);

            if (airways) {
                let list = Object.entries(airways);
                let neededAirway = list.find(x => x[1][2].some(x => x[0] === entries[i - 1]?.split('/')[0]) && x[1][2].some(x => !entries[i + 1] || x[0] === entries[i + 1]?.split('/')[0]));

                if (!neededAirway) {
                    list = JSON.parse(JSON.stringify(list));
                    const neededAirways = list.filter(x => x[1][2].some(x => x[0] === entries[i - 1]?.split('/')[0]) || x[1][2].some(x => !entries[i + 1] || x[0] === entries[i + 1]?.split('/')[0]));

                    if (neededAirways.length === 2) {
                        neededAirway = JSON.parse(JSON.stringify(neededAirways[0])) as typeof neededAirways[0];

                        const startingAirway = neededAirways.find(x => x[1][2].some(x => x[0] === entries[i - 1]?.split('/')[0]));
                        const endAirway = neededAirways.find(x => x[1][2].some(x => !entries[i + 1] || x[0] === entries[i + 1]?.split('/')[0]));
                        let startAirwayEndingWaypoint = -1;
                        let endAirwayStartingWaypoint = -1;
                        const endIndex = endAirway?.[1][2].findIndex(x => !entries[i + 1] || x[0] === entries[i + 1]?.split('/')[0]);
                        const startingIndex = startingAirway?.[1][2].findIndex(x => x[0] === entries[i - 1]?.split('/')[0]);

                        // Looking for airway start
                        for (let i = startingIndex ?? 0; i < (startingAirway?.[1][2].length ?? 0); i++) {
                            endAirwayStartingWaypoint = endAirway?.[1][2].findIndex(x => x[0] === startingAirway?.[1][2][i]?.[0]) ?? -1;
                            if (endAirwayStartingWaypoint !== -1) {
                                startAirwayEndingWaypoint = i;
                                break;
                            }
                        }

                        if (endIndex !== -1 && endAirwayStartingWaypoint !== -1) {
                            const startingIndex = startingAirway?.[1][2].findIndex(x => x[0] === entries[i - 1]?.split('/')[0]);
                            neededAirway[1][2] = startingAirway![1][2].slice(startingIndex, startAirwayEndingWaypoint);
                            console.log(search, endAirwayStartingWaypoint, endIndex);
                            neededAirway[1][2].push(...endAirway![1][2].slice(endAirwayStartingWaypoint, endIndex! + 1));
                        }

                        if (endIndex === -1 || endAirwayStartingWaypoint === -1 || !startingAirway || !endAirway) neededAirway = undefined;
                    }
                }

                if (neededAirway && entries[i + 1] && entries[i - 1]) {
                    let startIndex = neededAirway[1][2].findIndex(x => x[0] === entries[i - 1]?.split('/')[0]);
                    let endIndex = neededAirway[1][2].findIndex(x => x[0] === entries[i + 1]?.split('/')[0]);

                    if (search === 'Q140') console.log(startIndex, endIndex);

                    neededAirway = JSON.parse(JSON.stringify(neededAirway)) as [string, ShortAirway];

                    if (startIndex > endIndex) {
                        neededAirway[1][2].reverse();
                        startIndex = neededAirway[1][2].findIndex(x => x[0] === entries[i - 1]?.split('/')[0]);
                        endIndex = neededAirway[1][2].findIndex(x => x[0] === entries[i + 1]?.split('/')[0]);
                    }

                    neededAirway[1][2] = neededAirway[1][2].slice(startIndex === -1 ? 0 : startIndex, endIndex === -1 ? neededAirway[1][2].length : endIndex + 1);

                    if (neededAirway[1][2].length === 1) {
                        const waypoint = neededAirway[1][2][0];

                        waypoints.push({
                            identifier: waypoint[0],
                            kind: 'enroute',
                            type: waypoint[6],
                            coordinate: [waypoint[3], waypoint[4]],
                        });
                    }
                    else {
                        waypoints.push({
                            identifier: neededAirway[1][0] || split[1] || entry,
                            kind: 'airway',
                            airway: {
                                key: neededAirway[0],
                                value: neededAirway[1],
                            },
                        });
                    }
                }

                continue;
            }

            const vhfs = await getNavigraphParsedData('vhf', search);
            const ndbs = await getNavigraphParsedData('ndb', search);
            const waypointsList = await getNavigraphParsedData('waypoints', search);

            if (previousWaypoint && (vhfs || ndbs || waypointsList)) {
                const vhfWaypoint = previousWaypoint && Object.entries(vhfs ?? {}).sort((a, b) => {
                    const aCoord = [a[1][4], a[1][5]];
                    const bCoord = [b[1][4], b[1][5]];

                    return waypointDiff(previousWaypoint!, aCoord) - waypointDiff(previousWaypoint!, bCoord);
                })[0];

                const ndbWaypoint = previousWaypoint && Object.entries(ndbs ?? {}).sort((a, b) => {
                    const aCoord = [a[1][3], a[1][4]];
                    const bCoord = [b[1][3], b[1][4]];

                    return waypointDiff(previousWaypoint!, aCoord) - waypointDiff(previousWaypoint!, bCoord);
                })[0];

                const regularWaypoint = previousWaypoint && Object.entries(waypointsList ?? {}).sort((a, b) => {
                    const aCoord = [a[1][1], a[1][2]];
                    const bCoord = [b[1][1], b[1][2]];

                    return waypointDiff(previousWaypoint!, aCoord) - waypointDiff(previousWaypoint!, bCoord);
                })[0];

                let kind: NavigraphNavDataEnrouteWaypointPartial['kind'] = 'enroute';
                let identifier = '';
                let key = '';
                let type = '';
                let coordinate: Coordinate = [0, 0];

                const smallestCoordinates = [
                    [[vhfWaypoint?.[1][4], vhfWaypoint?.[1][5]], 'vhf'],
                    [[ndbWaypoint?.[1][3], ndbWaypoint?.[1][4]], 'ndb'],
                    [[regularWaypoint?.[1][1], regularWaypoint?.[1][2]], 'waypoint'],
                ] satisfies [Coordinate, string][];

                const smallest = smallestCoordinates.filter(x => typeof x[0][0] === 'number').sort((a, b) => {
                    return waypointDiff(previousWaypoint, a[0]) - waypointDiff(previousWaypoint, b[0]);
                })[0];

                if (smallest?.[0] && waypointDiff(previousWaypoint!, smallest[0]) < 700) {
                    coordinate = smallest[0];

                    if (smallest[1] === 'waypoint') {
                        identifier = regularWaypoint[1][0];
                        key = regularWaypoint[0];
                        type = regularWaypoint[1][3];
                    }
                    else if (smallest[1] === 'vhf') {
                        identifier = vhfWaypoint[1][0];
                        key = vhfWaypoint[0];
                        kind = 'vhf';
                    }
                    else if (smallest[1] === 'ndb') {
                        identifier = ndbWaypoint[1][0];
                        key = ndbWaypoint[0];
                        kind = 'ndb';
                    }

                    waypoints.push({
                        identifier,
                        coordinate,
                        kind,
                        type,
                        key,
                    });
                }
            }
        }
    }
    catch (e) {
        console.error(e);
    }

    return waypoints;
}

async function getCachedSids(procedures: IDBNavigraphProcedures, airport: string, value: EnroutePath['sids']) {
    return Object.fromEntries(
        (await Promise.all(Object.entries(value)
            .map(async ([key, value]) => {
                const procedure = procedures.sids.findIndex(x => x.identifier === key);
                if (typeof procedure === 'number' && procedure !== -1) {
                    return [
                        key, {
                            ...value,
                            procedure: (await getNavigraphAirportProcedure('sids', airport, procedure))!,
                        },
                    ] satisfies [string, DataStoreNavigraphProcedure];
                }
                return null as unknown as [string, DataStoreNavigraphProcedure][];
            }))).filter(x => !!x),
    );
}

async function getCachedStars(procedures: IDBNavigraphProcedures, airport: string, value: EnroutePath['stars']) {
    return Object.fromEntries(
        (await Promise.all(Object.entries(value)
            .map(async ([key, value]) => {
                const procedure = procedures.stars.findIndex(x => x.identifier === key);
                if (typeof procedure === 'number' && procedure !== -1) {
                    return [
                        key, {
                            ...value,
                            procedure: (await getNavigraphAirportProcedure('stars', airport, procedure))!,
                        },
                    ] satisfies [string, DataStoreNavigraphProcedure];
                }
                return null as unknown as [string, DataStoreNavigraphProcedure][];
            }))).filter(x => !!x),
    );
}

async function getCachedApproaches(procedures: IDBNavigraphProcedures, airport: string, value: EnroutePath['approaches']) {
    return Object.fromEntries(
        (await Promise.all(Object.entries(value)
            .map(async ([key, value]) => {
                const procedure = procedures.approaches.findIndex(x => `${ x.name }-${ x.runway }` === key);
                if (typeof procedure === 'number' && procedure !== -1) {
                    return [
                        key, {
                            ...value,
                            procedure: (await getNavigraphAirportProcedure('approaches', airport, procedure))!,
                        },
                    ] satisfies [string, DataStoreNavigraphProcedure<NavigraphNavDataApproach>];
                }
                return null as unknown as [string, DataStoreNavigraphProcedure<NavigraphNavDataApproach>][];
            }))).filter(x => !!x),
    );
}

export async function updateCachedProcedures() {
    const values = enroutePath.value;
    const aircraftValues = enrouteAircraftPath.value;
    const dataStore = useDataStore();

    if (values) {
        for (const [airport, value] of Object.entries(values)) {
            dataStore.navigraphProcedures[airport] ??= {
                sids: {},
                stars: {},
                approaches: {},
                runways: [],
                setBy: value.setBy,
            };
            const selectedAirport = dataStore.navigraphProcedures[airport]!;

            const { data: procedures } = await useAsyncData(computed(() => `${ airport }-procedures-selected`), () => getNavigraphAirportProcedures(airport));

            selectedAirport.runways = value.runways;
            selectedAirport.setBy = value.setBy;

            selectedAirport.sids = await getCachedSids(procedures.value!, airport, value.sids);
            selectedAirport.stars = await getCachedStars(procedures.value!, airport, value.stars);
            selectedAirport.approaches = await getCachedApproaches(procedures.value!, airport, value.approaches);

            if (!Object.keys(selectedAirport.sids).length && !Object.keys(selectedAirport.stars).length && !Object.keys(selectedAirport.approaches).length) {
                delete enroutePath.value![airport];
                delete dataStore.navigraphProcedures[airport];
            }
        }
    }

    if (aircraftValues) {
        for (const [cid, value] of Object.entries(aircraftValues)) {
            dataStore.navigraphAircraftProcedures.value[cid] ??= {
                departure: {
                    icao: value.departure.icao ?? '',
                    sids: {},
                    stars: {},
                    approaches: {},
                    runways: [],
                    setBy: value.departure.setBy,
                },
                arrival: {
                    icao: value.arrival.icao ?? '',
                    sids: {},
                    stars: {},
                    approaches: {},
                    runways: [],
                    setBy: value.arrival.setBy,
                },
            };

            if (value.departure.icao) {
                const selectedAirport = dataStore.navigraphAircraftProcedures.value[cid].departure;

                const { data: procedures } = await useAsyncData(computed(() => `${ value.departure.icao }-aircraft-procedures-selected`), () => getNavigraphAirportProcedures(value.departure.icao!));

                selectedAirport.runways = value.departure.runways;
                selectedAirport.setBy = value.departure.setBy;

                selectedAirport.sids = await getCachedSids(procedures.value!, value.departure.icao!, value.departure.sids);
            }

            if (value.arrival.icao) {
                const selectedAirport = dataStore.navigraphAircraftProcedures.value[cid].arrival;

                const { data: procedures } = await useAsyncData(computed(() => `${ value.departure.icao }-aircraft-procedures-selected`), () => getNavigraphAirportProcedures(value.arrival.icao!));

                selectedAirport.runways = value.arrival.runways;
                selectedAirport.setBy = value.arrival.setBy;

                selectedAirport.stars = await getCachedStars(procedures.value!, value.arrival.icao!, value.arrival.stars);
                selectedAirport.approaches = await getCachedApproaches(procedures.value!, value.arrival.icao!, value.arrival.approaches);
            }

            if (
                !Object.keys(dataStore.navigraphAircraftProcedures.value[cid]!.departure.sids).length &&
                !Object.keys(dataStore.navigraphAircraftProcedures.value[cid]!.departure.stars).length &&
                !Object.keys(dataStore.navigraphAircraftProcedures.value[cid]!.departure.approaches).length &&
                !Object.keys(dataStore.navigraphAircraftProcedures.value[cid]!.arrival.sids).length &&
                !Object.keys(dataStore.navigraphAircraftProcedures.value[cid]!.arrival.stars).length &&
                !Object.keys(dataStore.navigraphAircraftProcedures.value[cid]!.arrival.approaches).length
            ) {
                delete dataStore.navigraphAircraftProcedures.value[cid];
                delete dataStore.navigraphAircraftProcedures.value[cid];
            }
        }
    }
}

export async function buildNATWaypoints(nat: VatsimNattrakClient | VatsimNattrak) {
    const result: NavigraphNavDataEnrouteWaypointPartial[] = [];

    const waypoints = nat.last_routeing.split(' ');

    const parsedWaypoints: {
        identifier: string;
        coordinate: Coordinate | null;
    }[] = waypoints.map(x => ({ identifier: x, coordinate: getPreciseCoord(x)?.[0] ?? null }));

    for (let i = 0; i < parsedWaypoints.length; i++) {
        const waypoint = parsedWaypoints[i];
        if (waypoint.coordinate) continue;

        const refCoordinate = parsedWaypoints.find((x, xIndex) => (xIndex === i + 1 || xIndex === i - 1) && x.coordinate)?.coordinate;
        if (!refCoordinate) continue;

        const foundWaypoint = Object.entries(await getNavigraphParsedData('waypoints', waypoint.identifier) ?? {}).sort((a, b) => {
            const aCoord = [a[1][1], a[1][2]];
            const bCoord = [b[1][1], b[1][2]];

            return waypointDiff(refCoordinate, aCoord) - waypointDiff(refCoordinate, bCoord);
        })[0];

        if (foundWaypoint) waypoint.coordinate = [foundWaypoint[1][1], foundWaypoint[1][2]];
    }

    for (let i = 0; i < parsedWaypoints.length; i++) {
        const waypoint = parsedWaypoints[i];
        if (!waypoint.coordinate) continue;

        result.push({
            coordinate: waypoint.coordinate,
            identifier: waypoint.identifier,
            key: waypoint.identifier,
            kind: 'nat-waypoint',
        });
    }

    return result;
}
