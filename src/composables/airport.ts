import type { StoreOverlayAirport } from '~/store/map';
import type { MaybeRef, Ref } from 'vue';
import type { VatsimShortenedAircraft, VatsimShortenedController, VatsimShortenedPrefile } from '~/types/data/vatsim';
import { toLonLat } from 'ol/proj';
import { calculateArrivalTime, calculateDistanceInNauticalMiles } from '~/utils/shared/flight';
import type { MapAircraftKeys } from '~/types/map';

/**
 * @note data must be reactive object or a computed
 */
export function provideAirport(data: MaybeRef<StoreOverlayAirport['data']>) {
    provide('airport', data);
}

export function injectAirport(): Ref<StoreOverlayAirport['data']> {
    const injection = inject<MaybeRef<StoreOverlayAirport['data']>>('airport')!;
    if (isRef(injection)) return injection;
    return shallowRef(injection);
}

export const getATCForAirport = (data: Ref<StoreOverlayAirport['data']>) => {
    const injected = inject<MaybeRef<VatsimShortenedController[]> | null>('airport-atc', null);

    const comp = computed((): VatsimShortenedController[] => {
        if (injected) return toValue(injected);
        const dataStore = useDataStore();

        const list = sortControllersByPosition([
            ...dataStore.vatsim.data.locals.value.filter(x => x.airport.icao === data.value.icao).map(x => x.atc),
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
                    visual_range: 0,
                    frequency: data.value.airport?.vatInfo?.ctafFreq,
                },
            ];
        }

        return list;
    });

    if (getCurrentInstance() && !injected) provide('airport-atc', comp);

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

    const aircraft = computed<AirportPopupPilotList | null>(() => {
        const vatAirport = dataStore.vatsim.data.airports.value.find(x => x.icao === data.value.icao);
        if (!vatAirport) return null;

        const airport = dataStore.vatspy.value?.data.airports.find(x => x.icao === data.value.icao);

        const list = {
            groundDep: [] as AirportPopupPilotStatus[],
            groundArr: [] as AirportPopupPilotStatus[],
            prefiles: [] as AirportPopupPilotStatus[],
            departures: [] as AirportPopupPilotStatus[],
            arrivals: [] as AirportPopupPilotStatus[],
        } satisfies AirportPopupPilotList;

        for (const pilot of dataStore.vatsim.data.pilots.value) {
            if (data.value.icao !== pilot.departure && data.value.icao !== pilot.arrival) continue;

            let distance = 0;
            let flown = 0;
            let eta: Date | null = null;

            const departureAirport = airport?.icao === pilot.departure ? airport : dataStore.vatspy.value?.data.airports.find(x => x.icao === pilot.departure!);
            const arrivalAirport = airport?.icao === pilot.arrival ? airport : dataStore.vatspy.value?.data.airports.find(x => x.icao === pilot.arrival!);

            if (arrivalAirport) {
                const pilotCoords = toLonLat([pilot.longitude, pilot.latitude]);
                const depCoords = toLonLat([departureAirport?.lon ?? 0, departureAirport?.lat ?? 0]);
                const arrCoords = toLonLat([arrivalAirport.lon, arrivalAirport.lat]);

                distance = calculateDistanceInNauticalMiles(pilotCoords, arrCoords);
                flown = calculateDistanceInNauticalMiles(pilotCoords, depCoords);
                if (pilot.groundspeed) {
                    eta = calculateArrivalTime(pilotCoords, arrCoords, pilot.groundspeed);
                }
            }

            const truePilot: AirportPopupPilotStatus = {
                ...pilot,
                distance,
                eta,
                flown,
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

    if (getCurrentInstance() && !injected && !filter) provide('airport-aircraft', aircraft);

    return aircraft;
};
