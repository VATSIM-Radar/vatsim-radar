import type {
    NavDataProcedure,
    NavigraphNavDataApproach,
    NavigraphNavDataApproachShort,
    NavigraphNavDataEnrouteWaypointPartial,
    NavigraphNavDataShortProcedures,
    NavigraphNavDataStar,
    NavigraphNavDataStarShort, ShortAirway,
} from '~/utils/backend/navigraph/navdata/types';
import { clientDB } from '~/utils/client-db';
import type { ClientNavigraphData, IDBNavigraphProcedures } from '~/utils/client-db';
import { useStore } from '~/store';
import { isFetchError } from '~/utils/shared';
import type { Coordinate } from 'ol/coordinate';
import distance from '@turf/distance';
import type { DataStoreNavigraphProcedure, DataStoreNavigraphProceduresAirport } from '~/composables/data';
import type { VatsimNattrak, VatsimNattrakClient } from '~/types/data/vatsim';

export type NavigraphDataAirportKeys = 'sids' | 'stars' | 'approaches';

export async function getNavigraphAirportProcedures(airport: string): Promise<IDBNavigraphProcedures> {
    const idbAirport = await clientDB.get('navigraphAirports', airport);
    if (idbAirport?.approaches && idbAirport?.stars && idbAirport?.sids) return idbAirport as any;

    const store = useStore();

    const data = await $fetch<NavigraphNavDataShortProcedures>(`/api/data/navigraph/procedure/${ store.user?.hasFms ? 'current' : 'outdated' }/${ airport }`).catch(() => {});

    if (data) {
        if (idbAirport) {
            Object.assign(data, idbAirport);
        }

        await clientDB.put('navigraphAirports', data, airport);
        return data;
    }

    return {
        stars: [],
        sids: [],
        approaches: [],
    };
}

export async function getNavigraphAirportShortProceduresForKey<T extends NavigraphDataAirportKeys>(get: T, airport: string): Promise<T extends 'approaches' ? NavigraphNavDataApproachShort[] : NavigraphNavDataStarShort[]> {
    const idbAirport = await clientDB.get('navigraphAirports', airport);
    const idbData = idbAirport?.[get];
    if (idbData) return idbData as any;

    const store = useStore();

    const data = await $fetch<any[]>(`/api/data/navigraph/procedure/${ store.user?.hasFms ? 'current' : 'outdated' }/${ airport }/${ get }`).catch(e => e);

    if (Array.isArray(data)) {
        // @ts-expect-error dynamic data
        await clientDB.put('navigraphAirports', {
            ...idbAirport,
            [get]: data,
        }, airport);
        return data;
    }

    if (isFetchError(data) && data.statusCode === 404) {
        // @ts-expect-error dynamic data
        await clientDB.put('navigraphAirports', {
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
    const idbAirport = await clientDB.get('navigraphAirports', airport);
    const idbData = idbAirport?.[get];
    if (idbData?.every(x => x.procedure)) return idbData.map(x => x.procedure) as any;

    const store = useStore();

    const data = await $fetch<any>(`/api/data/navigraph/procedure/${ store.user?.hasFms ? 'current' : 'outdated' }/${ airport }/${ get }/all`).catch(e => e);

    if (Array.isArray(data)) {
        if (idbData) {
            await clientDB.put('navigraphAirports', {
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
        await clientDB.put('navigraphAirports', {
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
    const idbAirport = await clientDB.get('navigraphAirports', airport);
    const idbData = idbAirport?.[get];
    const idbProcedure = idbData?.[index];
    if (idbProcedure?.procedure) return idbProcedure.procedure as any;

    const store = useStore();

    const data = await $fetch<NavDataProcedure<NavigraphNavDataStar> | NavDataProcedure<NavigraphNavDataApproach>>(`/api/data/navigraph/procedure/${ store.user?.hasFms ? 'current' : 'outdated' }/${ airport }/${ get }/${ index }`).catch(() => {});

    if (data) {
        if (idbProcedure) {
            idbProcedure.procedure = data;
            // @ts-expect-error dynamic data
            await clientDB.put('navigraphAirports', {
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

export const enroutePath = useCookie<Record<string, EnroutePath> | null>('enroute-path', {
    path: '/',
    secure: true,
    sameSite: 'none',
});

export const enrouteAircraftPath = useCookie<Record<string, { departure: EnroutePath; arrival: EnroutePath }> | null>('enroute-aircraft-path', {
    path: '/',
    secure: true,
    sameSite: 'none',
});

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
        const lonDeg = parseFloat(parts[1]);

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

        return [[-lonDeg, lat], `N${ latPart }W${ parts[1] }`];
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
}

export function waypointDiff(compare: Coordinate, coordinate: Coordinate): number {
    return distance(compare, coordinate);
}

const routeRegex = /(?<waypoint>([A-Z0-9]+))\/([A-Z0-9]+?)(?<level>([FS])([0-9]{2,4}))/;
const NATRegex = /^NAT(?<letter>[A-Z])$/;

type NeededNavigraphData = Pick<ClientNavigraphData, 'parsedVHF' | 'parsedWaypoints' | 'parsedNDB' | 'parsedAirways'>;

let previousRequest = 0;
let interval: NodeJS.Timeout | null = null;
let data: NeededNavigraphData | null = null;
let gettingData = false;

async function getFullData(): Promise<NeededNavigraphData> {
    if (gettingData) {
        return new Promise<NeededNavigraphData>((resolve, reject) => {
            const interval = setInterval(() => {
                if (gettingData) return;
                resolve(data!);
                clearInterval(interval);
            }, 1000);
        });
    }

    previousRequest = Date.now();

    if (!interval) {
        interval = setInterval(() => {
            // For GC
            if (data && Date.now() - previousRequest > 1000 * 15) {
                data = null;
            }
        }, 1000);
    }

    if (data) return data;

    gettingData = true;

    try {
        data = {
            parsedAirways: await clientDB.get('navigraphData', 'parsedAirways') as any ?? {},
            parsedVHF: await clientDB.get('navigraphData', 'parsedVHF') as any ?? {},
            parsedNDB: await clientDB.get('navigraphData', 'parsedNDB') as any ?? {},
            parsedWaypoints: await clientDB.get('navigraphData', 'parsedWaypoints') as any ?? {},
        };

        gettingData = false;

        return data;
    }
    catch (e) {
        gettingData = false;

        throw e;
    }
}

export async function getFlightPlanWaypoints({ flightPlan, departure, arrival, cid, disableStarParsing, disableSidParsing }: FlightPlanInputWaypoint): Promise<NavigraphNavDataEnrouteWaypointPartial[]> {
    const waypoints: NavigraphNavDataEnrouteWaypointPartial[] = [];
    const dataStore = useDataStore();
    const entries = flightPlan.split(' ').map(x => x.replace(replacementRegex, '')).filter(x => x && x !== 'DCT');

    let sidInit = false;
    let starInit = false;

    const selectedDeparture = dataStore.navigraphAircraftProcedures.value[cid.toString()]?.departure;
    const selectedArrival = dataStore.navigraphAircraftProcedures.value[cid.toString()]?.arrival;

    let depRunway = selectedDeparture?.runways[0];
    let arrRunway = null as string | null;

    const depSid = Object.values(selectedDeparture?.sids ?? {})[0];
    let arrStar = null as null | DataStoreNavigraphProcedure;
    let arrApproach = null as null | DataStoreNavigraphProcedure<NavigraphNavDataApproach>;

    const navigraphData = await getFullData();

    try {
        for (let i = 0; i < entries.length; i++) {
            if (i === entries.length - 1) {
                arrRunway ||= selectedArrival?.runways[0];
                arrStar = Object.values(selectedArrival?.stars ?? {})[0];
                arrApproach = Object.values(selectedArrival?.approaches ?? {})[0];
            }

            const entry = entries[i];
            let split = entry.split('/');
            if (split.length > 2) split = split.slice(split.length - 2, split.length);
            if (split[1] && latRegex.test(split[1])) split.reverse();
            const search = split[0];

            if (split[1] && entry.startsWith(departure)) depRunway = split[1];

            if (routeRegex.test(entry)) split = split.slice(0, 1);

            const nat = NATRegex.exec(entry);

            if (nat?.groups?.letter) {
                const natRoute = dataStore.vatsim.tracks.value.find(x => x.identifier === nat?.groups?.letter);
                if (natRoute) {
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
            if (!starInit && (arrStar || arrApproach || starTest)) {
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

                if (arrStar || star !== -1) {
                    starInit = true;

                    const procedure = arrStar?.procedure ?? await getNavigraphAirportProcedure('stars', arrival, star);
                    const arrivalProcedures = arrApproach?.procedure ? [arrApproach.procedure] : (arrRunway && await getNavigraphAirportProceduresForKey('approaches', arrival));

                    const enrouteTransition = procedure?.transitions.enroute.find(x => arrStar?.transitions.includes(x.name) || x.name === entries[entries.length - 2] || x.name === entries[entries.length - 3] || x.name === entries[entries.length - 4]);
                    if (enrouteTransition) {
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

                    if (arrRunway) {
                        const runwayTransition = procedure?.transitions.runway.find(x => x.name === arrRunway);
                        if (runwayTransition) {
                            waypoints.push(...runwayTransition.waypoints.map(x => ({
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
                    }

                    if (arrivalProcedures) {
                        const forRunway = arrivalProcedures.filter(x => x.procedure.runway === arrRunway);
                        const procedure = arrApproach ? arrApproach.procedure : forRunway.find(x => x.procedure.procedureName.startsWith('ILS')) ?? forRunway[0];
                        if (procedure) {
                            const transition = procedure?.transitions.find(x => x.name === entries[entries.length - 2]);
                            if (transition) {
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

                            waypoints.push(...procedure.waypoints.map(x => ({
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

                            if (procedure.procedure.missedApproach) {
                                waypoints.push(...procedure.procedure.missedApproach.map(x => ({
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

                return waypoint?.coordinate || [waypoint?.airway?.value[2][0]?.[3], waypoint?.airway?.value[2][0]?.[4]] as Coordinate;
            }

            const previousWaypoint = previousWaypointCoordinate(waypoints[waypoints.length - 1]);

            const prevEntry = entries[i - 1]?.split('/')[0];
            if (prevEntry && waypoints[waypoints.length - 1]?.airway && navigraphData.parsedAirways[prevEntry]) {
                continue;
            }

            const nextEntry = entries[i + 1]?.split('/')[0];
            if (nextEntry && navigraphData.parsedAirways[nextEntry]) {
                continue;
            }

            const airways = navigraphData.parsedAirways[search];
            if (airways) {
                const list = Object.entries(airways);
                let neededAirway = list.find(x => x[1][2].some(x => x[0] === entries[i - 1]?.split('/')[0]) && x[1][2].some(x => !entries[i + 1] || x[0] === entries[i + 1]?.split('/')[0]));

                if (neededAirway) {
                    let startIndex = neededAirway[1][2].findIndex(x => x[0] === entries[i - 1]?.split('/')[0]);
                    let endIndex = neededAirway[1][2].findIndex(x => x[0] === entries[i + 1]?.split('/')[0]);

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

            const vhfs = navigraphData.parsedVHF[search];
            const ndbs = navigraphData.parsedNDB[search];
            const waypointsList = navigraphData.parsedWaypoints[search];

            if (previousWaypoint && (vhfs || ndbs || waypointsList)) {
                const vhfWaypoint = previousWaypoint && Object.entries(vhfs ?? {}).sort((a, b) => {
                    const aCoord = [a[1][3], a[1][4]];
                    const bCoord = [b[1][3], b[1][4]];

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
                    [[vhfWaypoint?.[1][3], vhfWaypoint?.[1][4]], 'vhf'],
                    [[ndbWaypoint?.[1][3], ndbWaypoint?.[1][4]], 'ndb'],
                    [[regularWaypoint?.[1][1], regularWaypoint?.[1][2]], 'waypoint'],
                ] satisfies [Coordinate, string][];

                const smallest = smallestCoordinates.filter(x => typeof x[0][0] === 'number').sort((a, b) => {
                    return waypointDiff(previousWaypoint, a[0]) - waypointDiff(previousWaypoint, b[0]);
                })[0];

                if (smallest) {
                    coordinate = smallest[0];

                    if (smallest[1] === 'waypoint') {
                        identifier = regularWaypoint[1][0];
                        key = regularWaypoint[0];
                        type = regularWaypoint[1][3];
                    }
                    else if (smallest[1] === 'vhf') {
                        identifier = vhfWaypoint[1][1];
                        key = vhfWaypoint[0];
                        kind = 'vhf';
                    }
                    else if (smallest[1] === 'ndb') {
                        identifier = ndbWaypoint[1][1];
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
                    sids: {},
                    stars: {},
                    approaches: {},
                    runways: [],
                    setBy: value.departure.setBy,
                },
                arrival: {
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
                selectedAirport.stars = await getCachedStars(procedures.value!, value.departure.icao!, value.departure.stars);
                selectedAirport.approaches = await getCachedApproaches(procedures.value!, value.departure.icao!, value.departure.approaches);
            }

            if (value.arrival.icao) {
                const selectedAirport = dataStore.navigraphAircraftProcedures.value[cid].arrival;

                const { data: procedures } = await useAsyncData(computed(() => `${ value.departure.icao }-aircraft-procedures-selected`), () => getNavigraphAirportProcedures(value.arrival.icao!));

                selectedAirport.runways = value.arrival.runways;
                selectedAirport.setBy = value.arrival.setBy;

                selectedAirport.sids = await getCachedSids(procedures.value!, value.arrival.icao!, value.arrival.sids);
                selectedAirport.stars = await getCachedStars(procedures.value!, value.arrival.icao!, value.arrival.stars);
                selectedAirport.approaches = await getCachedApproaches(procedures.value!, value.arrival.icao!, value.arrival.approaches);
            }

            if (
                !Object.keys(dataStore.navigraphAircraftProcedures.value[cid].departure.sids).length &&
                !Object.keys(dataStore.navigraphAircraftProcedures.value[cid].departure.stars).length &&
                !Object.keys(dataStore.navigraphAircraftProcedures.value[cid].departure.approaches).length &&
                !Object.keys(dataStore.navigraphAircraftProcedures.value[cid].arrival.sids).length &&
                !Object.keys(dataStore.navigraphAircraftProcedures.value[cid].arrival.stars).length &&
                !Object.keys(dataStore.navigraphAircraftProcedures.value[cid].arrival.approaches).length
            ) {
                delete dataStore.navigraphAircraftProcedures.value[cid];
                delete dataStore.navigraphAircraftProcedures.value[cid];
            }
        }
    }
}

export async function buildNATWaypoints(nat: VatsimNattrakClient | VatsimNattrak) {
    const result: NavigraphNavDataEnrouteWaypointPartial[] = [];

    const navigraphData = await getFullData();
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

        const foundWaypoint = Object.entries(navigraphData.parsedWaypoints?.[waypoint.identifier] ?? {}).sort((a, b) => {
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
