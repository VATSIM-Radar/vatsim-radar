import type { StoreOverlayAirport } from '~/store/map';
import type { MaybeRef, Ref } from 'vue';
import type { VatsimShortenedAircraft, VatsimShortenedController, VatsimShortenedPrefile } from '~/types/data/vatsim';
import { calculateArrivalTime, calculateDistanceInNauticalMiles } from '~/utils/shared/flight';
import type {
    MapAircraftKeys,
} from '~/types/map';
import { getAircraftDistance } from '~/composables/vatsim/pilots';
import { debounce } from '~/utils/shared';

/**
 * @note data must be reactive object or a computed
 */
export function provideAirport(data: MaybeRef<StoreOverlayAirport['data'] | undefined>) {
    provide('airport', data);
}

export function injectAirport(): Ref<StoreOverlayAirport['data']> {
    const injection = inject<MaybeRef<StoreOverlayAirport['data']>>('airport')!;
    if (isRef(injection)) return injection;
    return shallowRef(injection);
}

export const getATCForAirport = (data: Ref<StoreOverlayAirport['data']>) => {
    const injected = inject<MaybeRef<VatsimShortenedController[]> | null>('airport-controllers', null);

    const comp = computed((): VatsimShortenedController[] => {
        if (injected) return toValue(injected);
        const dataStore = useDataStore();

        const list = sortControllersByPosition([
            ...dataStore.vatsim.data.locals.value.filter(x => x.airport?.icao === data.value.icao).map(x => x.atc),
            ...dataStore.vatsim.data.firs.value.filter(x => data.value.airport?.center.includes(x.controller.callsign)).map(x => x.controller),
        ]);

        if (!list.length && data.value.airport?.vatInfo?.ctafFreq) {
            return [
                {
                    cid: Math.random(),
                    callsign: '',
                    facility: -2,
                    text_atis: null,
                    name: '',
                    logon_time: '',
                    rating: 0,
                    frequency: data.value.airport?.vatInfo?.ctafFreq,
                },
            ];
        }

        return list;
    });

    if (getCurrentInstance() && !injected) provide('airport-controllers', comp);

    return comp;
};

export type AirportPopupPilotStatus = (VatsimShortenedAircraft | VatsimShortenedPrefile) & {
    isArrival: boolean;
    distance: number;
    flown: number;
    eta: Date | null;
};

export type AirportPopupPilotList = Record<MapAircraftKeys, Array<AirportPopupPilotStatus>>;

export const getAircraftForAirport = (data: Ref<StoreOverlayAirport['data']>, filter?: MaybeRef<MapAircraftKeys | null>) => {
    const dataStore = useDataStore();
    const injected = inject<MaybeRef<AirportPopupPilotList> | null>('airport-aircraft', null);
    if (!getCurrentInstance()) throw new Error('Vue instance is unavailable in getAircraftForAirport');
    if (injected) {
        return computed(() => {
            if (filter) {
                const _filter = toValue(filter);

                if (_filter) {
                    return {
                        groundDep: [],
                        groundArr: [],
                        prefiles: [],
                        departures: [],
                        arrivals: [],
                        [_filter]: toValue(injected)[_filter],
                    };
                }
            }

            return toValue(injected);
        });
    }

    const pilotDistances = shallowRef<Record<string, ReturnType<typeof getAircraftDistance>>>({});

    const aircraft = computed<AirportPopupPilotList | null>(() => {
        const vatAirport = dataStore.vatsim.data.airports.value.find(x => x.icao === data.value.icao);
        if (!vatAirport) return null;

        const airport = getAirportByIcao(data.value.icao);

        const list = {
            groundDep: [] as AirportPopupPilotStatus[],
            groundArr: [] as AirportPopupPilotStatus[],
            prefiles: [] as AirportPopupPilotStatus[],
            departures: [] as AirportPopupPilotStatus[],
            arrivals: [] as AirportPopupPilotStatus[],
        } satisfies AirportPopupPilotList;

        for (const pilot of dataStore.vatsim.data.pilots.value) {
            if (data.value.icao !== pilot.departure && data.value.icao !== pilot.arrival) {
                // we want to skip the pilot if they are not departing or arriving at the airport for performance reasons
                // but if they have not filed a flight plan, we have to check first if they are on the ground before we skip (Yes, pilots can be in the vatAirport.aircraft.groundDep even when they have not filed a flight plan)
                if (!pilot.departure && !pilot.arrival) {
                    if (!vatAirport.aircraft.groundDep?.includes(pilot.cid) && !vatAirport.aircraft.groundArr?.includes(pilot.cid)) continue;
                }
                else {
                    continue;
                }
            }

            let distance = 0;
            let flown = 0;
            let eta: Date | null = null;

            const departureAirport = airport?.icao === pilot.departure ? airport : dataStore.vatspy.value?.data.keyAirports.realIcao[pilot.departure!];
            const arrivalAirport = airport?.icao === pilot.arrival ? airport : dataStore.vatspy.value?.data.keyAirports.realIcao[pilot.arrival!];

            const pilotDistance = pilotDistances.value[pilot.cid.toString()] ?? {};

            if (arrivalAirport && !pilotDistance?.toGoTime) {
                const pilotCoords = [pilot.longitude, pilot.latitude];
                const depCoords = [departureAirport?.lon ?? 0, departureAirport?.lat ?? 0];
                const arrCoords = [arrivalAirport.lon, arrivalAirport.lat];

                distance = calculateDistanceInNauticalMiles(pilotCoords, arrCoords);
                flown = calculateDistanceInNauticalMiles(pilotCoords, depCoords);
                if (pilot.groundspeed) {
                    eta = calculateArrivalTime(pilotCoords, arrCoords, pilot.groundspeed);
                }
            }

            const truePilot: AirportPopupPilotStatus = {
                ...pilot,
                distance: pilotDistance.toGoDist || distance,
                eta: pilotDistance.toGoTime ? new Date(pilotDistance.toGoTime) : eta,
                flown: pilotDistance.depDist || flown,
                isArrival: true,
            };

            if (vatAirport.aircraft.departures?.includes(pilot.cid)) {
                list.departures.push({ ...truePilot, isArrival: false });
            }
            if (vatAirport.aircraft.arrivals?.includes(pilot.cid)) {
                list.arrivals.push(truePilot);
            }
            if (vatAirport.aircraft.groundDep?.includes(pilot.cid)) {
                list.groundDep.push({ ...truePilot, isArrival: false });
            }
            if (vatAirport.aircraft.groundArr?.includes(pilot.cid)) list.groundArr.push(truePilot);
        }

        for (const pilot of dataStore.vatsim.data.prefiles.value) {
            if (pilot.departure !== data.value.icao) continue;
            if (vatAirport.aircraft.prefiles?.includes(pilot.cid)) {
                list.prefiles.push({
                    ...pilot,
                    distance: 0,
                    flown: 0,
                    eta: null,
                    isArrival: false,
                });
            }
        }

        if (filter) {
            const _filter = toValue(filter);
            if (_filter) {
                return {
                    groundDep: [],
                    groundArr: [],
                    prefiles: [],
                    departures: [],
                    arrivals: [],
                    [_filter]: list[_filter],
                };
            }
        }

        return list;
    });

    const debouncedUpdate = debounce(() => {
        pilotDistances.value = Object.fromEntries(Object.values(aircraft.value ?? {}).flatMap(aircraft => aircraft.map(aircraft => [aircraft.cid.toString(), getAircraftDistance(dataStore.vatsim.data.keyedPilots.value[aircraft.cid.toString()])])));
    }, 5000);

    watch(dataStore.navigraphWaypoints, debouncedUpdate);

    if (getCurrentInstance() && !injected && !filter) provide('airport-aircraft', aircraft);

    return aircraft;
};

export const getArrivalRate = (aircraft: Ref<AirportPopupPilotList | null>, intervals: number, intervalLength: number) => {
    const returnArray = computed<AirportPopupPilotStatus[][]>(() => {
        const returnArray = Array(intervals).fill(null).map(() => [] as AirportPopupPilotStatus[]);

        if (aircraft.value?.arrivals) {
            const currentDate = new Date() as Date;

            for (const arrival of aircraft.value?.arrivals || []) {
                if (!arrival.eta) continue;

                const differenceInMs = arrival.eta.getTime() - currentDate.getTime();
                const differenceInMinutes = differenceInMs / (1000 * 60);
                const interval = Math.floor(differenceInMinutes / intervalLength);
                if (interval >= intervals) continue;
                returnArray[interval].push(arrival);
            }
        }

        return returnArray;
    });

    return returnArray;
};

export const getAirportCountry = (icao?: string | null) => {
    if (!icao) return null;
    if (icao === 'UMKK') icao = 'UUDD';

    return useDataStore().vatspy.value?.data.countries.find(x => x.code === icao.slice(0, 2));
};
