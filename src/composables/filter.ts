import type { VatsimLiveDataShort, VatsimShortenedAircraft, VatsimShortenedController } from '~/types/data/vatsim';
import { useStore } from '~/store';
import { parseFilterAltitude } from '~/utils/shared';
import { getPilotTrueAltitude } from '~/utils/shared/vatsim';
import type { IUserFilterOthers } from '~/utils/backend/handlers/filters';

export function hasActivePilotFilter() {
    const store = useStore();
    if (Object.keys(store.config).length) return false;

    if (!store.activeFilter.users?.pilots?.value?.length &&
        !store.activeFilter.users?.lists?.length &&
        !store.activeFilter.users?.cids?.length &&
        (!store.activeFilter.airports || Object.values(!store.activeFilter.airports).some(x => x.length)) &&
        (!store.activeFilter.flights?.type || store.activeFilter.flights?.type === 'all') &&
        (!store.activeFilter.flights?.status || store.activeFilter.flights?.status === 'all') &&
        (!store.activeFilter.flights?.excludeNoFlightPlan) &&
        (!Object.values(store.activeFilter.flights ?? {}).some(x => Array.isArray(x) && x.length))
    ) return false;

    return true;
}

function filterUser(user: VatsimLiveDataShort['pilots'][0] | VatsimLiveDataShort['prefiles'][0] | VatsimShortenedController): boolean {
    const field = 'frequency' in user ? 'atc' : 'pilots';
    const store = useStore();

    let callsignFiltered: boolean | null = null;
    let cidFiltered: boolean | null = null;
    const strategy = store.activeFilter.users?.strategy ?? 'or';
    const callsign = store.activeFilter.users?.[field];

    if (callsign?.value?.length) {
        const strategy = callsign.type ?? 'prefix';

        callsignFiltered = !callsign.value.some(x => strategy === 'prefix' ? user.callsign.startsWith(x) : user.callsign.includes(x));
    }

    if (store.activeFilter.users?.lists?.length && (!callsignFiltered || strategy === 'or')) {
        const lists = store.lists.filter(x => store.activeFilter.users!.lists!.includes(x.id));

        cidFiltered = !lists.some(x => x.users.some(x => x.cid === user.cid));
    }

    if (store.activeFilter.users?.cids?.length && (!callsignFiltered || strategy === 'or')) {
        const match = !store.activeFilter.users?.cids?.some(x => x === user.cid);
        if (match) {
            cidFiltered = true;
        }
        else if (cidFiltered === null) cidFiltered = false;
    }

    if (callsignFiltered || cidFiltered) {
        if (callsignFiltered === null || cidFiltered === null) return false;

        if (strategy !== 'or' || (callsignFiltered && cidFiltered)) return false;
    }

    return true;
}

export function filterVatsimPilots<T extends VatsimLiveDataShort['pilots'] | VatsimLiveDataShort['prefiles']>(pilots: T): T {
    const store = useStore();

    if (!hasActivePilotFilter()) return pilots;

    const routes = store.activeFilter.airports?.routes?.map(x => x.split('-'));
    const altitude = store.activeFilter.flights?.altitude?.map(x => parseFilterAltitude(x));

    let filteredPilots = pilots.filter(pilot => {
        if (store.activeFilter.flights?.excludeNoFlightPlan && !pilot.departure) return false;

        if (!filterUser(pilot)) return false;

        const airportsFilter: Record<'departure' | 'arrival' | 'departurePrefix' | 'arrivalPrefix' | 'routes', boolean | null> = {
            departure: null,
            arrival: null,
            departurePrefix: null,
            arrivalPrefix: null,
            routes: null,
        };

        if (store.activeFilter.airports?.departure?.length) {
            airportsFilter.departure = !store.activeFilter.airports?.departure.some(x => pilot.departure === x);
        }

        if (store.activeFilter.airports?.arrival?.length) {
            airportsFilter.arrival = !store.activeFilter.airports?.arrival.some(x => pilot.arrival === x);
        }

        if (store.activeFilter.airports?.departurePrefix?.length) {
            airportsFilter.departurePrefix = !store.activeFilter.airports?.departurePrefix.some(x => pilot.departure?.startsWith(x));
        }

        if (store.activeFilter.airports?.arrivalPrefix?.length) {
            airportsFilter.arrivalPrefix = !store.activeFilter.airports?.arrivalPrefix.some(x => pilot.arrival?.startsWith(x));
        }

        if (routes?.length) {
            airportsFilter.routes = !routes.some(([dep, arr]) => pilot.departure === dep && pilot.arrival === arr);
        }

        const airportsArray = Object.values(airportsFilter);

        if (airportsArray.some(x => x !== null) && !airportsArray.some(x => x === false)) return false;

        if (store.activeFilter.flights?.status && store.activeFilter.flights.status !== 'all') {
            if (!('status' in pilot)) return store.activeFilter.flights.status === 'departing';

            switch (store.activeFilter.flights.status) {
                case 'departing':
                    if (pilot.status !== 'depGate' && pilot.status !== 'depTaxi') return false;
                    break;
                case 'arrived':
                    if (pilot.status !== 'arrGate' && pilot.status !== 'arrTaxi') return false;
                    break;
                case 'airborne':
                    if (pilot.status === 'depGate' || pilot.status === 'depTaxi' || pilot.status === 'arrGate' || pilot.status === 'arrTaxi') return false;
                    break;
            }
        }

        if (store.activeFilter.flights?.aircraft?.length && !store.activeFilter.flights?.aircraft.some(x => pilot.aircraft_short?.startsWith(x))) return false;

        if (store.activeFilter.flights?.type && store.activeFilter.flights.type !== 'all') {
            if (!pilot.departure) return false;
            const depCountry = getAirportCountry(pilot.departure);
            const arrCountry = getAirportCountry(pilot.arrival!);

            if (store.activeFilter.flights.type === 'international' && depCountry === arrCountry) return false;
            else if (depCountry !== arrCountry) return false;
        }

        if (store.activeFilter.flights?.squawks?.length && !store.activeFilter.flights.squawks.some(x => 'transponder' in pilot && pilot.transponder === x)) return false;
        if (store.activeFilter.flights?.ratings?.length && !store.activeFilter.flights.ratings.some(x => 'pilot_rating' in pilot && pilot.pilot_rating === x)) return false;
        if (altitude?.length) {
            if (!('logon_time' in pilot)) return false;

            let someMatched = false;
            const pilotAltitude = getPilotTrueAltitude(pilot as unknown as VatsimShortenedAircraft);

            for (const filter of altitude) {
                let fullMatch = true;

                for (const config of filter) {
                    if (config.strategy === 'below' && pilotAltitude - 300 > config.altitude) {
                        fullMatch = false;
                    }

                    if (config.strategy === 'above' && pilotAltitude + 300 < config.altitude) {
                        fullMatch = false;
                    }
                }

                if (fullMatch) {
                    someMatched = true;
                    break;
                }
            }

            if (!someMatched) return false;
        }

        return true;
    });

    if (store.activeFilter.invert) filteredPilots = pilots.filter(x => !filteredPilots.some(y => y.cid === x.cid));

    if (typeof store.activeFilter.others === 'object' && (typeof store.activeFilter.others.othersOpacity === 'number' || store.activeFilter.others.ourColor)) {
        const others = store.activeFilter.others as IUserFilterOthers;

        pilots.map(pilot => {
            if (!('pilot_rating' in pilot)) return;
            const excluded = !filteredPilots.some(x => x.cid === pilot.cid);
            if (excluded && typeof others.othersOpacity === 'number') pilot.filteredOpacity = others.othersOpacity;
            if (!excluded && others.ourColor) pilot.filteredColor = others.ourColor;
        });

        return pilots;
    }

    return filteredPilots as T;
}

export function hasActiveATCFilter() {
    const store = useStore();

    if (Object.keys(store.config).length) return false;

    if (!store.activeFilter.users?.atc?.value?.length &&
        !store.activeFilter.users?.lists?.length &&
        !store.activeFilter.users?.cids?.length &&
        (!Object.values(store.activeFilter.atc ?? {}).some(x => x.length))
    ) return false;

    return true;
}

function filterController(atc: VatsimShortenedController): boolean {
    const store = useStore();

    if (!filterUser(atc)) return false;
    if (store.activeFilter.atc?.ratings?.length && !store.activeFilter.atc.ratings.some(x => atc.rating === x)) return false;
    if (store.activeFilter.atc?.facilities?.length && !store.activeFilter.atc.facilities.some(x => atc.facility === x || (atc.isATIS && x === -1))) return false;

    return true;
}

export function filterVatsimControllers(locals: VatsimLiveDataShort['locals'], firs: VatsimLiveDataShort['firs']): {
    locals: VatsimLiveDataShort['locals'];
    firs: VatsimLiveDataShort['firs'];
} {
    const store = useStore();

    if (!hasActiveATCFilter()) return { locals, firs };

    let filteredLocals = locals.filter(local => filterController(local.atc));
    let filteredFirs = firs.filter(local => filterController(local.controller));

    if (store.activeFilter.invert) {
        filteredLocals = locals.filter(x => !filteredLocals.some(y => y.atc.cid === x.atc.cid));
        filteredFirs = firs.filter(x => !filteredFirs.some(y => y.controller.cid === x.controller.cid));
    }

    return { locals: filteredLocals, firs: filteredFirs };
}
