import type {
    NavDataProcedure,
    NavigraphNavDataApproach,
    NavigraphNavDataApproachShort,
    NavigraphNavDataEnrouteWaypointPartial,
    NavigraphNavDataShortProcedures,
    NavigraphNavDataStar,
    NavigraphNavDataStarShort,
} from '~/utils/backend/navigraph/navdata/types';
import { clientDB } from '~/utils/client-db';
import type { IDBNavigraphProcedures } from '~/utils/client-db';
import { useStore } from '~/store';
import { isFetchError } from '~/utils/shared';
import type { Coordinate } from 'ol/coordinate';

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
const numberRegex = /[0-9]/;
const latRegex = /^(\d{2,4})([NS])/;

export const enroutePath = useCookie<Record<string, { runway?: string; sid?: string; star?: string; approach?: string }>>('enroutePath', {
    path: '/',
    secure: true,
    sameSite: 'none',
});

function getPreciseCoord(input: string) {
    const latMatch = input.match(latRegex);
    if (!latMatch) return null;

    const latDigits = latMatch[1];
    const latDir = latMatch[2];

    const remainder = input.slice(latMatch[0].length);

    const lonMatch = remainder.match(/^(\d{3,5})([EW])/);
    if (!lonMatch) return null;

    const lonDigits = lonMatch[1];
    const lonDir = lonMatch[2];

    function toDecimal(degMin: string) {
        const len = degMin.length;
        const deg = parseInt(degMin.slice(0, len - 2), 10);
        const min = parseInt(degMin.slice(len - 2), 10);
        return deg + (min / 60);
    }

    const lat = (latDir === 'N' ? 1 : -1) * toDecimal(latDigits);
    const lon = (lonDir === 'E' ? 1 : -1) * toDecimal(lonDigits);


    return [lon, lat];
}

export interface FlightPlanInputWaypoint {
    flightPlan: string;
    departure: string;
    arrival: string;
}

export async function getFlightPlanWaypoints({ flightPlan, departure, arrival }: FlightPlanInputWaypoint): Promise<NavigraphNavDataEnrouteWaypointPartial[]> {
    const waypoints: NavigraphNavDataEnrouteWaypointPartial[] = [];
    const dataStore = useDataStore();
    const entries = flightPlan.split(' ').map(x => x.replace(replacementRegex, '')).filter(x => x && x !== 'DCT');

    try {
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const split = entry.split('/');
            const search = split[0];

            // SIDs
            if (i === 0 && numberRegex.test(entry)) {
                const sids = await getNavigraphAirportShortProceduresForKey('sids', departure);
                const [identifier, runway] = split;
                const sid = sids.findIndex(x => x.identifier === identifier);

                if (sid !== -1) {
                    // We already have it fully drawn
                    if (dataStore.navigraphProcedures[departure]?.sids[sids[sid].identifier]) continue;

                    const procedure = await getNavigraphAirportProcedure('sids', departure, sid);

                    if (runway) {
                        const runwayTransition = procedure?.transitions.runway.find(x => x.name === runway);
                        if (runwayTransition) {
                            waypoints.push(...runwayTransition.waypoints.map(x => ({
                                identifier: x.identifier,
                                coordinate: x.coordinate,
                                kind: 'sids',
                            } satisfies NavigraphNavDataEnrouteWaypointPartial)));
                        }
                    }

                    waypoints.push(...procedure?.waypoints.map(x => ({
                        identifier: x.identifier,
                        coordinate: x.coordinate,
                        kind: 'sids',
                    } satisfies NavigraphNavDataEnrouteWaypointPartial)) ?? []);

                    const enrouteTransition = procedure?.transitions.enroute.find(x => x.name === entries[1] || x.name === entries[2]);
                    if (enrouteTransition) {
                        waypoints.push(...enrouteTransition.waypoints.map(x => ({
                            identifier: x.identifier,
                            coordinate: x.coordinate,
                            kind: 'sids',
                        } satisfies NavigraphNavDataEnrouteWaypointPartial)));
                    }

                    continue;
                }
            }

            // STARs/Approaches
            if (i === entries.length - 1 && numberRegex.test(entry)) {
                const stars = await getNavigraphAirportShortProceduresForKey('stars', arrival);
                const [identifier, runway] = split;
                const star = stars.findIndex(x => x.identifier === identifier);

                if (star !== -1) {
                    // We already have it fully drawn
                    if (dataStore.navigraphProcedures[arrival]?.stars[stars[star].identifier]) continue;

                    const procedure = await getNavigraphAirportProcedure('stars', arrival, star);
                    const arrivalProcedures = runway && await getNavigraphAirportProceduresForKey('approaches', arrival);

                    if (arrivalProcedures && !Object.keys(dataStore.navigraphProcedures[arrival]?.approaches ?? {}).length) {
                        const forRunway = arrivalProcedures.filter(x => x.procedure.runway === runway);
                        const procedure = forRunway.find(x => x.procedure.procedureName.startsWith('ILS')) ?? forRunway[0];
                        if (procedure) {
                            const transition = procedure?.transitions.find(x => x.name === entries[entries.length - 2]);
                            if (transition) {
                                waypoints.push(...transition.waypoints.map(x => ({
                                    identifier: x.identifier,
                                    coordinate: x.coordinate,
                                    kind: 'approaches',
                                } satisfies NavigraphNavDataEnrouteWaypointPartial)));
                            }

                            waypoints.push(...procedure.waypoints.map(x => ({
                                identifier: x.identifier,
                                coordinate: x.coordinate,
                                kind: 'approaches',
                            } satisfies NavigraphNavDataEnrouteWaypointPartial)));
                        }
                    }

                    if (runway) {
                        const runwayTransition = procedure?.transitions.runway.find(x => x.name === runway);
                        if (runwayTransition) {
                            waypoints.push(...runwayTransition.waypoints.map(x => ({
                                identifier: x.identifier,
                                coordinate: x.coordinate,
                                kind: 'stars',
                            } satisfies NavigraphNavDataEnrouteWaypointPartial)));
                        }
                    }

                    waypoints.push(...procedure?.waypoints.map(x => ({
                        identifier: x.identifier,
                        coordinate: x.coordinate,
                        kind: 'stars',
                    } satisfies NavigraphNavDataEnrouteWaypointPartial)) ?? []);

                    const enrouteTransition = procedure?.transitions.enroute.find(x => x.name === entries[entries.length - 2] || x.name === entries[entries.length - 3] || x.name === entries[entries.length - 4]);
                    if (enrouteTransition) {
                        waypoints.push(...enrouteTransition.waypoints.map(x => ({
                            identifier: x.identifier,
                            coordinate: x.coordinate,
                            kind: 'stars',
                        } satisfies NavigraphNavDataEnrouteWaypointPartial)));
                    }

                    continue;
                }
            }

            const precise = getPreciseCoord(entry);

            if (precise) {
                waypoints.push({
                    identifier: split[1] || entry,
                    coordinate: precise,
                    kind: 'enroute',
                });
                continue;
            }

            const airways = dataStore.navigraph.data.value?.parsedAirways[search];
            if (airways) {
                const list = Object.entries(airways);
                const neededAirways = list.filter(x => x[1][2].some(x => x[0] === entries[i - 1]?.split('/')[0] || x[0] === entries[i + 1]?.split('/')[0]));
                let neededAirway = list.find(x => x[1][2].some(x => x[0] === entries[i - 1]?.split('/')[0] && x[0] === entries[i + 1]?.split('/')[0])) ?? neededAirways[0];

                if (neededAirway) {
                    const startIndex = neededAirway[1][2].findIndex(x => x[0] === entries[i - 1]);
                    const endIndex = neededAirway[1][2].findIndex(x => x[0] === entries[i + 1]);

                    neededAirway = JSON.parse(JSON.stringify(neededAirway));
                    neededAirway[1][2] = neededAirway[1][2].slice(startIndex === -1 ? 0 : startIndex, endIndex === -1 ? neededAirway[1][2].length : endIndex);

                    waypoints.push({
                        identifier: split[1] || entry,
                        kind: 'airway',
                        airway: {
                            key: neededAirway[0],
                            value: neededAirway[1],
                        },
                    });

                    continue;
                }
            }

            function previousWaypointCoordinate(waypoint: NavigraphNavDataEnrouteWaypointPartial) {
                return waypoint?.coordinate || [waypoint?.airway?.value[2][0]?.[3], waypoint?.airway?.value[2][0]?.[4]];
            }

            const previousWaypoint = previousWaypointCoordinate(waypoints[waypoints.length - 1]);

            const vhfs = dataStore.navigraph.data.value?.parsedVHF[search];

            function waypointDiff(coordinate: Coordinate): number {
                return (coordinate[0] - (previousWaypoint[0]! ** 2)) + (coordinate[1] - (previousWaypoint[1]! ** 2));
            }

            if (vhfs) {
                const list = Object.entries(vhfs);

                const neededWaypoint = previousWaypoint && list.sort((a, b) => {
                    const aCoord = [a[1][3], a[1][4]];
                    const bCoord = [b[1][3], b[1][4]];

                    return waypointDiff(aCoord) - waypointDiff(bCoord);
                })[0];

                if (neededWaypoint) {
                    waypoints.push({
                        identifier: neededWaypoint[0],
                        coordinate: [neededWaypoint[1][3], neededWaypoint[1][4]],
                        kind: 'vhf',
                    });

                    continue;
                }
            }

            const ndbs = dataStore.navigraph.data.value?.parsedNDB[search];

            if (ndbs) {
                const list = Object.entries(ndbs);

                const neededWaypoint = previousWaypoint && list.sort((a, b) => {
                    const aCoord = [a[1][3], a[1][4]];
                    const bCoord = [b[1][3], b[1][4]];

                    return waypointDiff(aCoord) - waypointDiff(bCoord);
                })[0];

                if (neededWaypoint) {
                    waypoints.push({
                        identifier: neededWaypoint[0],
                        coordinate: [neededWaypoint[1][3], neededWaypoint[1][4]],
                        kind: 'ndb',
                    });

                    continue;
                }
            }

            const waypointsList = dataStore.navigraph.data.value?.parsedWaypoints[search];
            if (waypointsList) {
                const list = Object.entries(waypointsList);

                const neededWaypoint = previousWaypoint && list.sort((a, b) => {
                    const aCoord = [a[1][1], a[1][2]];
                    const bCoord = [b[1][1], b[1][2]];

                    return waypointDiff(aCoord) - waypointDiff(bCoord);
                })[0];

                if (neededWaypoint) {
                    waypoints.push({
                        identifier: neededWaypoint[1][0],
                        coordinate: [neededWaypoint[1][1], neededWaypoint[1][2]],
                        kind: 'enroute',
                    });

                    continue;
                }
            }
        }
    }
    catch (e) {
        console.error(e);
    }

    console.log(waypoints);

    return waypoints;
}
