import type { StoreOverlayAirport } from '~/store/map';
import type { MaybeRef, Ref } from 'vue';
import type { VatsimShortenedAircraft, VatsimShortenedController, VatsimShortenedPrefile } from '~/types/data/vatsim';
import { calculateArrivalTime, calculateDistanceInNauticalMiles } from '~/utils/shared/flight';
import type {
    MapAircraftKeys, MapAircraftList,
} from '~/types/map';
import { getAircraftDistance } from '~/composables/vatsim/pilots';
import { debounce } from '~/utils/shared';
import type { PartialRecord } from '~/types';
import { getControllersForPosition } from '~/composables/render';
import { isValidDate } from '~/utils/shared';

export function getAirportControllers(icao: string, controllers: VatsimShortenedController[] = []) {
    const dataStore = useDataStore();
    const list = controllers.slice();
    const airport = dataStore.vatspy.value?.data.keyAirports.realIcao[icao] ?? dataStore.vatspy.value?.data.keyAirports.icao[icao];

    if (airport) {
        for (const controller of getControllersForPosition([airport.lon, airport.lat])) {
            if (!list.some(x => x.callsign === controller.callsign)) list.push(controller);
        }
    }

    return sortControllersByPosition(list);
}

/**
 * @note data must be reactive object or a computed
 */
export function provideAirport(data: MaybeRef<StoreOverlayAirport['data'] | undefined>) {
    provide('airport', data);
}

export function injectAirport(defaultValue: true): Ref<StoreOverlayAirport['data']> | null;
export function injectAirport(defaultValue?: false): Ref<StoreOverlayAirport['data']>;
export function injectAirport(defaultValue?: boolean): Ref<StoreOverlayAirport['data']> | null {
    const injection = defaultValue ? inject<MaybeRef<StoreOverlayAirport['data']> | null>('airport', null) : inject<MaybeRef<StoreOverlayAirport['data']>>('airport')!;
    if (isRef(injection)) return injection;
    return injection ? shallowRef(injection) : null;
}

export const getATCForAirport = (data: Ref<StoreOverlayAirport['data'] | null>) => {
    const injected = inject<MaybeRef<VatsimShortenedController[]> | null>('airport-controllers', null);
    const dataStore = useDataStore();
    const atc = shallowRef<VatsimShortenedController[]>([]);

    watch([dataStore.airportsList, data], () => {
        if (injected) {
            atc.value = toValue(injected);
            return;
        }

        if (!data.value) return;

        const dataStore = useDataStore();

        const list = getAirportControllers(data.value.icao, dataStore.airportsList.value[data.value.icao]?.atc);

        if (!list.length && data.value.airport?.vatInfo?.ctafFreq) {
            atc.value = [
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

            return;
        }

        atc.value = list;
    }, {
        immediate: true,
    });

    if (getCurrentInstance() && !injected) provide('airport-controllers', atc);

    return atc;
};

export type AirportPopupPilotStatus = (VatsimShortenedAircraft | VatsimShortenedPrefile) & {
    isArrival: boolean;
    distance: number;
    flown: number;
    eta: Date | null;
};

export type AirportPopupPilotList = Record<MapAircraftKeys, Array<AirportPopupPilotStatus>>;

export const getAircraftForAirport = (_data: MaybeRef<StoreOverlayAirport['data'] | null>, filter?: MaybeRef<MapAircraftKeys | null>) => {
    const dataStore = useDataStore();
    const injected = inject<MaybeRef<AirportPopupPilotList> | null>('airport-aircraft', null);
    if (!getCurrentScope()) throw new Error('Vue instance is unavailable in getAircraftForAirport');
    if (injected) {
        return computed(() => {
            if (!toValue(injected)) {
                return {
                    groundDep: [],
                    groundArr: [],
                    prefiles: [],
                    departures: [],
                    arrivals: [],
                };
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
                        [_filter]: toValue(injected)[_filter],
                    };
                }
            }

            return toValue(injected);
        });
    }

    const pilotDistances = shallowRef<Record<string, ReturnType<typeof getAircraftDistance>>>({});

    const aircraft = computed<AirportPopupPilotList | null>(() => {
        const data = toValue(_data);
        const vatAirport = dataStore.airportsList.value[data?.icao ?? ''];
        if (!vatAirport || !data) return null;

        const airport = getAirportByIcao(data.icao);

        const list = {
            groundDep: [] as AirportPopupPilotStatus[],
            groundArr: [] as AirportPopupPilotStatus[],
            prefiles: [] as AirportPopupPilotStatus[],
            departures: [] as AirportPopupPilotStatus[],
            arrivals: [] as AirportPopupPilotStatus[],
        } satisfies AirportPopupPilotList;

        for (const pilot of dataStore.vatsim.data.pilots.value) {
            if (data.icao !== pilot.departure && data.icao !== pilot.arrival && vatAirport?.iata !== pilot.departure && vatAirport?.iata !== pilot.arrival) {
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

            let departureAirport = airport?.icao === pilot.departure ? airport : dataStore.vatspy.value?.data.keyAirports.realIcao[pilot.departure!];
            let arrivalAirport = airport?.icao === pilot.arrival ? airport : dataStore.vatspy.value?.data.keyAirports.realIcao[pilot.arrival!];

            if (!departureAirport && vatAirport) departureAirport = vatAirport.iata === pilot.departure ? airport : dataStore.vatspy.value?.data.keyAirports.realIata[pilot.departure!];
            if (!arrivalAirport && vatAirport) arrivalAirport = vatAirport.iata === pilot.arrival ? airport : dataStore.vatspy.value?.data.keyAirports.realIata[pilot.arrival!];

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

            const calculatedEta = pilotDistance.toGoTime ? new Date(pilotDistance.toGoTime) : eta;

            const truePilot: AirportPopupPilotStatus = {
                ...pilot,
                distance: pilotDistance.toGoDist || distance,
                eta: calculatedEta && isValidDate(calculatedEta) ? calculatedEta : null,
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
            if (pilot.departure !== data.icao) continue;
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
                if (interval >= intervals || !returnArray[interval]) continue;
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

type AircraftType = MapAircraftKeys | 'training';

export function getAirportCounters(counters: MapAircraftList) {
    const dataStore = useDataStore();
    const list: PartialRecord<AircraftType, VatsimShortenedPrefile[]> = {};

    const departuresMode = getKeyedValueFromSettings('map.preferences.airports.counters.departuresMode');
    const arrivalsMode = getKeyedValueFromSettings('map.preferences.airports.counters.syncDeparturesArrivals') ? departuresMode : getKeyedValueFromSettings('map.preferences.airports.counters.arrivalsMode');
    const prefilesMode = getKeyedValueFromSettings('map.preferences.airports.counters.horizontalCounter');

    let departures: VatsimShortenedAircraft[] = [];
    let arrivals: VatsimShortenedAircraft[] = [];
    let prefiles: Array<VatsimShortenedPrefile | VatsimShortenedAircraft> = [];
    let training: VatsimShortenedAircraft[] = [];

    const countersAircraft = Object.fromEntries(
        Object.entries(counters)
            .map(x => [x[0] as keyof MapAircraftList, x[1].map(x => dataStore.vatsim.data.keyedPilots.value[x] ?? dataStore.vatsim.data.keyedPrefiles.value[x]).filter(x => x)] satisfies [keyof MapAircraftList, VatsimShortenedAircraft[]]),
    ) as PartialRecord<keyof MapAircraftList, VatsimShortenedAircraft[]>;

    let groundDep = countersAircraft.groundDep;

    if (!getKeyedValueFromSettings('map.preferences.airports.counters.disableTraining')) {
        training = countersAircraft?.groundDep?.filter(x => x.departure && x.departure === x.arrival) ?? [];
        if (groundDep) groundDep = groundDep.filter(x => !training.some(y => y.cid === x.cid));
    }

    if (departuresMode !== 'hide') {
        switch (departuresMode) {
            case 'total':
                departures = [
                    ...groundDep ?? [],
                    ...countersAircraft.departures ?? [],
                ];
                break;
            case 'totalMoving':
                departures = [
                    ...groundDep?.filter(x => x.groundspeed > 0) ?? [],
                    ...countersAircraft.departures?.filter(x => x.groundspeed > 0) ?? [],
                ];
                break;
            case 'totalLanded':
                departures = [
                    ...groundDep?.filter(x => x.status !== 'depGate') ?? [],
                    ...countersAircraft.departures ?? [],
                ];
                break;
            case 'airborne':
                departures = countersAircraft.departures?.filter(x => x.groundspeed > 0) ?? [];
                break;
            case 'ground':
                departures = groundDep ?? [];
                break;
            case 'groundMoving':
                departures = groundDep?.filter(x => x.groundspeed > 0) ?? [];
                break;
        }
    }

    if (arrivalsMode !== 'hide') {
        switch (arrivalsMode) {
            case 'total':
                arrivals = [
                    ...countersAircraft.groundArr ?? [],
                    ...countersAircraft.arrivals ?? [],
                ];
                break;
            case 'totalMoving':
                arrivals = [
                    ...countersAircraft.groundArr?.filter(x => x.groundspeed > 0) ?? [],
                    ...countersAircraft.arrivals?.filter(x => x.groundspeed > 0) ?? [],
                ];
                break;
            case 'totalLanded':
                arrivals = [
                    ...countersAircraft.groundArr?.filter(x => x.groundspeed > 0) ?? [],
                    ...countersAircraft.arrivals ?? [],
                ];
                break;
            case 'airborne':
                arrivals = countersAircraft.arrivals?.filter(x => x.groundspeed > 0) ?? [];
                break;
            case 'ground':
                arrivals = countersAircraft.groundArr ?? [];
                break;
            case 'groundMoving':
                arrivals = countersAircraft.groundArr?.filter(x => x.groundspeed > 0) ?? [];
                break;
        }
    }

    if (prefilesMode !== 'hide') {
        switch (prefilesMode) {
            case 'total':
                prefiles = [
                    ...groundDep ?? [],
                    ...countersAircraft.departures ?? [],
                    ...countersAircraft.groundArr ?? [],
                    ...countersAircraft.arrivals ?? [],
                ];
                break;
            case 'prefiles':
                prefiles = countersAircraft.prefiles ?? [];
                break;
            case 'ground':
                prefiles = [
                    ...groundDep ?? [],
                    ...countersAircraft.groundArr ?? [],
                ];
                break;
            case 'groundMoving':
                prefiles = [
                    ...groundDep?.filter(x => x.groundspeed > 0) ?? [],
                    ...countersAircraft.groundArr?.filter(x => x.groundspeed > 0) ?? [],
                ];
                break;
        }
    }

    list.groundDep = departures;
    list.training = training;
    list.prefiles = prefiles;
    list.groundArr = arrivals;

    return list;
}
