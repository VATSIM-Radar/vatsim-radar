import type {
    NavDataProcedure,
    NavigraphNavDataApproach,
    NavigraphNavDataApproachShort,
    NavigraphNavDataEnrouteWaypointPartial, NavigraphNavDataShort,
    NavigraphNavDataShortProcedures,
    NavigraphNavDataStar,
    NavigraphNavDataStarShort, ShortAirway,
} from '~/utils/server/navigraph/navdata/types';
import { clientDB } from '~/composables/render/idb';
import type { IDBNavigraphProcedures } from '~/composables/render/idb';
import { useStore } from '~/store';
import { isFetchError } from '~/utils/shared';
import type { Coordinate } from 'ol/coordinate.js';
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

if (typeof window !== 'undefined' && localStorage.getItem('enroute-path') === '[object Object]') localStorage.removeItem('enroute-path');

export const enroutePath = useStorageLocal<Record<string, EnroutePath> | null>('enroute-path', null, undefined, { serializer: StorageSerializers.object });

export const enrouteAircraftPath = useStorageLocal<Record<string, {
    departure: EnroutePath;
    arrival: EnroutePath;
}> | null>('enroute-aircraft-path', {}, undefined, { serializer: StorageSerializers.object });

function dmToDecimal(raw: string, degDigits: number): number {
    const deg = parseInt(raw.slice(0, degDigits), 10);
    const min = parseInt(raw.slice(degDigits), 10);
    return deg + (min / 60);
}

function dmsToDecimal(raw: string, degDigits: number): number {
    const deg = parseInt(raw.slice(0, degDigits), 10);
    const min = parseInt(raw.slice(degDigits, degDigits + 2), 10);
    const sec = parseInt(raw.slice(degDigits + 2), 10);
    return deg + (min / 60) + (sec / 3600);
}

function withSign(value: number, dir: string): number {
    return dir === 'S' || dir === 'W' ? -value : value;
}

// N4930W01520 49/1520 570021N0380421E 07N178W 0330N18000E
// Wrote this myself because chatgpt can't write regex properly
const preciseRegex = /^(((?<latDir>[NS])(?<latRaw>\d{1,6}))|((?<latRaw2>\d{1,6})(?<latDir2>[NS]))|((?<latRaw3>\d{1,4})(\/)?))(((?<lonDir>[EW])(?<lonRaw>\d{2,7}))|((?<lonRaw2>\d{2,7})(?<lonDir2>[EW]))|((\/)(?<lonRaw3>\d{1,4})))$/;

const bearingRegex = /^(?<word>[A-Z]+)(?<heading>[0-9]{3})(?<miles>[0-9]{3})/;
const earthRadiusNm = 3440.065;

function parseCoordPart(raw: string, degreeDigits: 2 | 3, isLonDir2 = false): number | null {
    if (degreeDigits === 2) {
        if (raw.length <= 2) return parseInt(raw, 10); // 7, 07, 49
        if (raw.length === 4) return dmToDecimal(raw, 2); // 4930
        if (raw.length === 6) return dmsToDecimal(raw, 2); // 570021
    }

    if (degreeDigits === 3) {
        if (raw.length === 2 && !isLonDir2) return parseInt(raw, 10) + 100; // 55 -> 155
        if (raw.length <= 3) return parseInt(raw, 10); // 178, 020
        if (raw.length === 4) return dmToDecimal(raw, 2); // 1520 (slash format)
        if (raw.length === 5) return dmToDecimal(raw, 3); // 18000
        if (raw.length === 7) return dmsToDecimal(raw, 3); // 0380421
    }

    return null;
}

export function getPreciseCoord(input: string): [Coordinate, string] | null {
    const value = input.trim();

    const match = value.match(preciseRegex);
    if (!match) return null;

    let {
        latDir,
        latDir2,
        latRaw,
        latRaw2,
        latRaw3,
        lonDir,
        lonDir2,
        lonRaw,
        lonRaw2,
        lonRaw3,
    } = match.groups ?? {};

    latDir ??= latDir2;
    latRaw ??= latRaw2;
    latRaw ??= latRaw3;
    const isLonDir2 = !lonDir && !!lonDir2;
    lonDir ??= lonDir2;
    lonRaw ??= lonRaw2;
    lonRaw ??= lonRaw3;

    if (!latRaw || !lonRaw) return null;

    const lat = parseCoordPart(latRaw, 2);
    const lon = parseCoordPart(lonRaw, lonDir ? 3 : 2, isLonDir2);

    if (lat == null || lon == null || Number.isNaN(lat) || Number.isNaN(lon)) {
        return null;
    }

    const finalLatDir = latDir ?? 'N';
    const finalLonDir = lonDir ?? 'W';

    return [
        [withSign(lon, finalLonDir), withSign(lat, finalLatDir)],
        `${ finalLatDir }${ latRaw }${ finalLonDir }${ lonRaw }`,
    ];
}

function calculateBearingCoordinate(reference: Coordinate, heading: number, miles: number): Coordinate {
    const lon = reference[0] * Math.PI / 180;
    const lat = reference[1] * Math.PI / 180;
    const bearing = heading * Math.PI / 180;
    const angularDistance = miles / earthRadiusNm;

    const destinationLat = Math.asin(
        (Math.sin(lat) * Math.cos(angularDistance)) +
        (Math.cos(lat) * Math.sin(angularDistance) * Math.cos(bearing)),
    );
    const destinationLon = lon + Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat),
        Math.cos(angularDistance) - (Math.sin(lat) * Math.sin(destinationLat)),
    );

    return [
        ((((destinationLon * 180 / Math.PI) + 540) % 360) - 180),
        destinationLat * 180 / Math.PI,
    ];
}

export async function getBearingCoord(input: string, previousWaypoint?: Coordinate | null): Promise<[Coordinate, string] | null> {
    const value = input.trim();

    const match = value.match(bearingRegex);
    if (!match) return null;

    const { word, heading, miles } = match.groups ?? {};
    if (!word || !heading || !miles) return null;

    const reference = await getSmallestNavigraphCoordinate(word, previousWaypoint ?? undefined);
    if (!reference) return null;

    return [
        calculateBearingCoordinate(reference.coordinate, parseInt(heading, 10), parseInt(miles, 10)),
        input.split('/')[1] ?? `${ word }${ heading }${ miles }`,
    ];
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

function isCoordinate(coordinate: unknown[]): coordinate is Coordinate {
    return coordinate.every(value => typeof value === 'number' && Number.isFinite(value));
}

type NavigraphCoordinateCandidate = {
    coordinate: Coordinate;
    identifier: string;
    kind: NavigraphNavDataEnrouteWaypointPartial['kind'];
    key: string;
    type: string;
};

const nmToIgnorePriority = 2;

function getNavigraphCoordinatePriority(candidate: NavigraphCoordinateCandidate): number {
    return candidate.kind === 'vhf' || candidate.kind === 'ndb' ? 0 : 1;
}

function sortNavigraphCoordinateCandidates<T extends NavigraphCoordinateCandidate>(candidates: T[], reference?: Coordinate): T[] {
    if (!reference) return candidates;

    return candidates.toSorted((a, b) => {
        const aDistance = waypointDiff(reference, a.coordinate);
        const bDistance = waypointDiff(reference, b.coordinate);
        const distanceDiff = aDistance - bDistance;

        if (Math.abs(distanceDiff) > nmToIgnorePriority) return distanceDiff;

        const priorityDiff = getNavigraphCoordinatePriority(a) - getNavigraphCoordinatePriority(b);

        return priorityDiff || distanceDiff;
    });
}

function createNavigraphCoordinateCandidate(candidate: Omit<NavigraphCoordinateCandidate, 'coordinate'> & { coordinate: unknown[] }): NavigraphCoordinateCandidate | null {
    if (!isCoordinate(candidate.coordinate)) return null;

    return {
        ...candidate,
        coordinate: candidate.coordinate,
    };
}

async function getSmallestNavigraphCoordinate(search: string, reference?: Coordinate): Promise<NavigraphCoordinateCandidate | null> {
    const dataStore = useDataStore();
    const vhfs = await getNavigraphParsedData('vhf', search);
    const ndbs = await getNavigraphParsedData('ndb', search);
    const waypointsList = await getNavigraphParsedData('waypoints', search);
    const airport = dataStore.vatspy.value?.data.keyAirports.realIcao[search] ?? dataStore.vatspy.value?.data.keyAirports.realIata[search];

    const candidates = [
        ...Object.entries(vhfs ?? {}).map(([key, value]) => createNavigraphCoordinateCandidate({
            coordinate: [value[4], value[5]],
            identifier: value[0],
            key,
            kind: 'vhf',
            type: '',
        })),
        ...Object.entries(ndbs ?? {}).map(([key, value]) => createNavigraphCoordinateCandidate({
            coordinate: [value[3], value[4]],
            identifier: value[0],
            key,
            kind: 'ndb',
            type: '',
        })),
        ...Object.entries(waypointsList ?? {}).map(([key, value]) => createNavigraphCoordinateCandidate({
            coordinate: [value[1], value[2]],
            identifier: value[0],
            key,
            kind: 'enroute',
            type: value[3],
        })),
        airport && createNavigraphCoordinateCandidate({
            coordinate: [airport.lon, airport.lat],
            identifier: airport.icao,
            key: airport.icao,
            kind: 'enroute',
            type: 'airport',
        }),
    ].filter(x => !!x);

    const smallest = sortNavigraphCoordinateCandidates(candidates, reference)[0];

    if (!smallest) return null;
    if (reference && waypointDiff(reference, smallest.coordinate) >= 2000) return null;

    return smallest;
}

function getNatRouteWaypointToken(token: string): { identifier: string; coordinate: Coordinate | null } {
    const split = token.split('/');
    const defaultCoord = getPreciseCoord(token)?.[0];

    if (!defaultCoord && split.length !== 2) {
        return {
            identifier: token,
            coordinate: null,
        };
    }

    return { identifier: defaultCoord ? token : split[1], coordinate: defaultCoord ?? getPreciseCoord(split[0])?.[0] ?? null };
}

const routeRegex = /(?<waypoint>([A-Z0-9]+))\/([A-Z0-9]+?)(?<level>([FS])([0-9]{2,4}))/;
const NATRegex = /^NAT(?<letter>[A-Z])$/;

const dataCache: {
    [K in 'vhf' | 'ndb' | 'waypoints' | 'airways' | 'holdings' | 'restrictedAirspace' | 'controlledAirspace']: NavigraphNavDataShort[K]
} = {
    vhf: {},
    ndb: {},
    waypoints: {},
    airways: {},
    holdings: {},
    restrictedAirspace: {},
    controlledAirspace: {},
};

let latestUpdate = 0;

type ShortAirwayEntry = [string, ShortAirway];
type ShortAirwayWaypoint = ShortAirway[2][number];

function cloneAirwayWithSegment(airway: ShortAirwayEntry, segment: ShortAirwayWaypoint[]): ShortAirwayEntry {
    return [
        airway[0],
        [
            airway[1][0],
            airway[1][1],
            segment.map(waypoint => [...waypoint] as ShortAirwayWaypoint),
        ],
    ];
}

function sameAirwayWaypointCoordinate(a: ShortAirwayWaypoint, b: ShortAirwayWaypoint): boolean {
    return Math.abs(a[3] - b[3]) < 0.01 && Math.abs(a[4] - b[4]) < 0.01;
}

function resolveAirwayPath(
    airways: ShortAirwayEntry[],
    fromWaypoint: string,
    toWaypoint: string,
): ShortAirwayEntry | undefined {
    type AirwayGraphNode = {
        id: string;
        airway: ShortAirwayEntry;
        waypoint: ShortAirwayWaypoint;
        edges: Set<string>;
    };

    const nodes = new Map<string, AirwayGraphNode>();
    const nodesByIdentifier = new Map<string, AirwayGraphNode[]>();

    // Airways with the same identifier can be split by region/type, so model all fragments as one route graph.
    for (const airway of airways) {
        for (let index = 0; index < airway[1][2].length; index++) {
            const waypoint = airway[1][2][index];
            const id = `${ airway[0] }:${ index }`;
            const node: AirwayGraphNode = {
                id,
                airway,
                waypoint,
                edges: new Set(),
            };

            nodes.set(id, node);

            const sameIdentifierNodes = nodesByIdentifier.get(waypoint[0]) ?? [];
            sameIdentifierNodes.push(node);
            nodesByIdentifier.set(waypoint[0], sameIdentifierNodes);

            if (index > 0) {
                const previousId = `${ airway[0] }:${ index - 1 }`;
                node.edges.add(previousId);
                nodes.get(previousId)?.edges.add(id);
            }
        }
    }

    // Region transitions are represented by duplicated boundary waypoints with the same identifier and coordinate.
    for (const sameIdentifierNodes of nodesByIdentifier.values()) {
        for (let i = 0; i < sameIdentifierNodes.length; i++) {
            for (let k = i + 1; k < sameIdentifierNodes.length; k++) {
                const first = sameIdentifierNodes[i];
                const second = sameIdentifierNodes[k];

                if (!sameAirwayWaypointCoordinate(first.waypoint, second.waypoint)) continue;

                first.edges.add(second.id);
                second.edges.add(first.id);
            }
        }
    }

    const startNodes = nodesByIdentifier.get(fromWaypoint) ?? [];
    const endNodeIds = new Set((nodesByIdentifier.get(toWaypoint) ?? []).map(node => node.id));

    if (!startNodes.length || !endNodeIds.size) return undefined;

    const visited = new Set<string>();
    const queue = startNodes.map(node => ({
        id: node.id,
        path: [node.id],
    }));

    for (const node of startNodes) {
        visited.add(node.id);
    }

    // Multi-source BFS keeps the route direction-independent and allows the anchor point to live in any fragment.
    while (queue.length) {
        const current = queue.shift()!;

        if (endNodeIds.has(current.id)) {
            const pathWaypoints: ShortAirwayWaypoint[] = [];

            for (const id of current.path) {
                const waypoint = nodes.get(id)?.waypoint;
                if (!waypoint) continue;
                const previousPathWaypoint = pathWaypoints[pathWaypoints.length - 1];
                if (previousPathWaypoint?.[0] === waypoint[0] && sameAirwayWaypointCoordinate(previousPathWaypoint, waypoint)) continue;

                pathWaypoints.push(waypoint);
            }

            if (!pathWaypoints.length) return undefined;

            return cloneAirwayWithSegment(nodes.get(current.path[0])!.airway, pathWaypoints);
        }

        const node = nodes.get(current.id);
        if (!node) continue;

        for (const nextId of node.edges) {
            if (visited.has(nextId)) continue;

            visited.add(nextId);
            queue.push({
                id: nextId,
                path: [
                    ...current.path,
                    nextId,
                ],
            });
        }
    }

    return undefined;
}

export async function getNavigraphParsedData<T extends 'vhf' | 'ndb' | 'waypoints' | 'airways' | 'holdings' | 'restrictedAirspace' | 'controlledAirspace'>(type: T, key: string): Promise<NavigraphNavDataShort[T] | null>;
export async function getNavigraphParsedData(type: 'vhf' | 'ndb' | 'waypoints' | 'airways' | 'holdings' | 'restrictedAirspace' | 'controlledAirspace', key: string): Promise<any | null> {
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
            dataCache.restrictedAirspace = {};
            dataCache.controlledAirspace = {};
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

                    const enrouteTransition = procedure?.transitions.enroute.find(x => depSid?.transitions.includes(x.name) || x.name === entries[1] || x.name === entries[2]);

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

                    const starProcedure: NavDataProcedure<NavigraphNavDataStar> | null = arrStar?.procedure ?? await getNavigraphAirportProcedure('stars', arrival, star);
                    let arrivalProcedures = (arrRunway && await getNavigraphAirportShortProceduresForKey('approaches', arrival));

                    if (!arrivalProcedures && Array.isArray(starProcedure?.procedure.runways) && starProcedure?.procedure.runways.length === 1 && starProcedure?.procedure.runways[0]) {
                        arrRunway = starProcedure?.procedure.runways[0];
                        arrivalProcedures = await getNavigraphAirportShortProceduresForKey('approaches', arrival);
                    }

                    const enrouteTransition = starProcedure?.transitions.enroute.find(x => arrStar?.transitions.includes(x.name) || x.name === entries[entries.length - 2] || x.name === entries[entries.length - 3] || x.name === entries[entries.length - 4]);
                    if (enrouteTransition) {
                        deleteDoubleWaypoint(enrouteTransition.waypoints[0].identifier);

                        waypoints.push(...enrouteTransition.waypoints.map(x => ({
                            title: starProcedure?.procedure.identifier,
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

                    deleteDoubleWaypoint(starProcedure?.waypoints[0]?.identifier ?? '');

                    waypoints.push(...starProcedure?.waypoints.map(x => ({
                        title: starProcedure?.procedure.identifier,
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
                            const transition = fetchedProcedure?.transitions.find(x => arrApproach?.transitions.includes(x.name) || x.name === starProcedure?.waypoints[starProcedure.waypoints.length - 1]?.identifier);

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

            function previousWaypointCoordinate(waypoint: NavigraphNavDataEnrouteWaypointPartial): Coordinate | null {
                if (!waypoint) {
                    if (!dataStore.vatspy.value?.data.keyAirports.realIcao[departure]) return null;

                    return [dataStore.vatspy.value?.data.keyAirports.realIcao[departure].lon, dataStore.vatspy.value?.data.keyAirports.realIcao[departure].lat];
                }

                return waypoint?.coordinate || [waypoint?.airway?.value[2][waypoint?.airway?.value[2].length - 1]?.[3], waypoint?.airway?.value[2][waypoint?.airway?.value[2].length - 1]?.[4]] as Coordinate;
            }

            const previousWaypoint = previousWaypointCoordinate(waypoints[waypoints.length - 1]);

            const bearing = await getBearingCoord(search, previousWaypoint);

            if (bearing) {
                waypoints.push({
                    identifier: split[1] || bearing[1] || entry,
                    coordinate: bearing[0],
                    kind: 'enroute',
                });
                continue;
            }

            const airways = await getNavigraphParsedData('airways', search);

            if (airways) {
                const prevWaypoint = entries[i - 1]?.split('/')[0];
                const nextWaypoint = entries[i + 1]?.split('/')[0];
                const neededAirway = prevWaypoint && nextWaypoint
                    ? resolveAirwayPath(Object.entries(airways), prevWaypoint, nextWaypoint)
                    : undefined;

                if (neededAirway) {
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
                            kind: 'airways',
                            airway: {
                                key: neededAirway[0],
                                value: neededAirway[1],
                            },
                        });
                    }
                }

                continue;
            }

            const prevEntry = entries[i - 1]?.split('/')[0];
            if (prevEntry && waypoints[waypoints.length - 1]?.airway && await getNavigraphParsedData('airways', prevEntry)) {
                continue;
            }

            const nextEntry = entries[i + 1]?.split('/')[0];
            if (nextEntry && await getNavigraphParsedData('airways', nextEntry)) {
                continue;
            }

            const precise = getPreciseCoord(search);

            if (precise) {
                waypoints.push({
                    identifier: split[1] || precise[1] || entry,
                    coordinate: precise[0],
                    kind: 'enroute',
                });
                continue;
            }

            const smallest = previousWaypoint ? await getSmallestNavigraphCoordinate(search, previousWaypoint) : null;

            if (smallest) {
                waypoints.push({
                    identifier: smallest.identifier,
                    coordinate: smallest.coordinate,
                    kind: smallest.kind,
                    type: smallest.type,
                    key: smallest.key,
                });
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
        dataStore.navigraphProcedures.value = {};

        for (const [airport, value] of Object.entries(values)) {
            dataStore.navigraphProcedures.value[airport] ??= {
                sids: {},
                stars: {},
                approaches: {},
                runways: [],
                setBy: value.setBy,
            };
            const selectedAirport = dataStore.navigraphProcedures.value[airport]!;

            const { data: procedures } = await useAsyncData(computed(() => `${ airport }-procedures-selected`), () => getNavigraphAirportProcedures(airport));

            selectedAirport.runways = value.runways;
            selectedAirport.setBy = value.setBy;

            selectedAirport.sids = await getCachedSids(procedures.value!, airport, value.sids);
            selectedAirport.stars = await getCachedStars(procedures.value!, airport, value.stars);
            selectedAirport.approaches = await getCachedApproaches(procedures.value!, airport, value.approaches);

            if (!Object.keys(selectedAirport.sids).length && !Object.keys(selectedAirport.stars).length && !Object.keys(selectedAirport.approaches).length) {
                delete enroutePath.value![airport];
                delete dataStore.navigraphProcedures.value[airport];
            }
        }

        triggerRef(dataStore.navigraphProcedures);
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

                const procedures = await getNavigraphAirportProcedures(value.departure.icao!);

                selectedAirport.runways = value.departure.runways;
                selectedAirport.setBy = value.departure.setBy;

                selectedAirport.sids = await getCachedSids(procedures, value.departure.icao!, value.departure.sids);
            }

            if (value.arrival.icao) {
                const selectedAirport = dataStore.navigraphAircraftProcedures.value[cid].arrival;

                const procedures = await getNavigraphAirportProcedures(value.arrival.icao!);

                selectedAirport.runways = value.arrival.runways;
                selectedAirport.setBy = value.arrival.setBy;

                selectedAirport.stars = await getCachedStars(procedures, value.arrival.icao!, value.arrival.stars);
                selectedAirport.approaches = await getCachedApproaches(procedures, value.arrival.icao!, value.arrival.approaches);
            }

            if (dataStore.navigraphAircraftProcedures.value[cid]) {
                if (
                    !Object.keys(dataStore.navigraphAircraftProcedures.value[cid]!.departure.sids).length &&
                !Object.keys(dataStore.navigraphAircraftProcedures.value[cid]!.departure.stars).length &&
                !Object.keys(dataStore.navigraphAircraftProcedures.value[cid]!.departure.approaches).length &&
                !Object.keys(dataStore.navigraphAircraftProcedures.value[cid]!.arrival.sids).length &&
                !Object.keys(dataStore.navigraphAircraftProcedures.value[cid]!.arrival.stars).length &&
                !Object.keys(dataStore.navigraphAircraftProcedures.value[cid]!.arrival.approaches).length
                ) {
                    delete dataStore.navigraphAircraftProcedures.value[cid];
                }
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
    }[] = waypoints.map(x => getNatRouteWaypointToken(x));

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
