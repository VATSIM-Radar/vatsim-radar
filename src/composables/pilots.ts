import type { VatsimExtendedPilot, VatsimShortenedAircraft } from '~/types/data/vatsim';
import type { VatSpyData } from '~/types/data/vatspy';
import type { Map } from 'ol';
import type { ShallowRef } from 'vue';
import type { ColorsList } from '~/modules/styles';

export function usePilotRating(pilot: VatsimShortenedAircraft, short = false): string[] {
    const dataStore = useDataStore();

    const ratings: string[] = [dataStore.vatsim.data.pilot_ratings.value.find(x => x.id === pilot.pilot_rating)?.[short ? 'short_name' : 'long_name'] ?? ''];
    if (pilot.military_rating) ratings.push(dataStore.vatsim.data.military_ratings.value.find(x => x.id === pilot.pilot_rating)?.[short ? 'short_name' : 'long_name'] ?? pilot.military_rating.toString());

    return ratings;
}

export function getAirportByIcao(icao?: string | null): VatSpyData['airports'][0] | null {
    if (!icao) return null;

    return useDataStore().vatspy.value!.data.airports.find(x => x.icao === icao) ?? null;
}

export function showPilotOnMap(pilot: VatsimShortenedAircraft | VatsimExtendedPilot, map: Map | null) {
    map = map || inject<ShallowRef<Map | null>>('map')!.value;
    const view = map?.getView();

    view?.animate({
        center: [pilot.longitude, pilot.latitude],
        zoom: isPilotOnGround(pilot) ? 17 : 7,
    });
}

export function isPilotOnGround(pilot: VatsimShortenedAircraft | VatsimExtendedPilot) {
    const dataStore = useDataStore();

    return 'isOnGround' in pilot
        ? pilot.isOnGround
        : dataStore.vatsim.data.airports.value.some(x => x.aircraft.groundArr?.includes(pilot.cid) || x.aircraft.groundDep?.includes(pilot.cid));
}

export function getPilotStatus(status: VatsimExtendedPilot['status'], isOffline = false): { color: ColorsList; title: string } {
    if (isOffline) {
        return {
            color: 'neutral800',
            title: 'Offline',
        };
    }

    switch (status) {
        case 'depGate':
            return {
                color: 'success500',
                title: 'Departing | At gate',
            };
        case 'depTaxi':
            return {
                color: 'success500',
                title: 'Departing',
            };
        case 'departed':
            return {
                color: 'warning500',
                title: 'Departed',
            };
        case 'enroute':
            return {
                color: 'primary500',
                title: 'Enroute',
            };
        case 'cruising':
            return {
                color: 'primary500',
                title: 'Cruising',
            };
        case 'climbing':
            return {
                color: 'primary400',
                title: 'Climbing',
            };
        case 'descending':
            return {
                color: 'primary600',
                title: 'Descending',
            };
        case 'arriving':
            return {
                color: 'warning600',
                title: 'Arriving',
            };
        case 'arrTaxi':
            return {
                color: 'error500',
                title: 'Arrived',
            };
        case 'arrGate':
            return {
                color: 'error500',
                title: 'Arrived | At gate',
            };
        default:
            return {
                color: 'neutral1000',
                title: 'Status unknown',
            };
    }
}
