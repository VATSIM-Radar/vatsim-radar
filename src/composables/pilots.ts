import type { VatsimShortenedAircraft } from '~/types/data/vatsim';
import type { VatSpyData } from '~/types/data/vatspy';

export function usePilotRating(pilot: VatsimShortenedAircraft): string[] {
    const dataStore = useDataStore();

    const ratings: string[] = [dataStore.vatsim.data.pilot_ratings.value.find(x => x.id === pilot.pilot_rating)?.long_name ?? ''];
    if (pilot.military_rating) ratings.push(dataStore.vatsim.data.military_ratings.value.find(x => x.id === pilot.pilot_rating)?.long_name ?? pilot.military_rating.toString());

    return ratings;
}

export function getAirportByIcao(icao?: string | null): VatSpyData['airports'][0] | null {
    if (!icao) return null;

    return useDataStore().vatspy.value!.data.airports.find(x => x.icao === icao) ?? null;
}
