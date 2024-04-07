import type { VatsimShortenedAircraft } from '~/types/data/vatsim';
import { useDataStore } from '~/store/data';
import type { VatSpyData } from '~/types/data/vatspy';

export function usePilotRating(pilot: VatsimShortenedAircraft): string[] {
    const dataStore = useDataStore();

    const ratings: string[] = [dataStore.vatsim.data!.pilot_ratings.find(x => x.id === pilot.pilot_rating)?.long_name ?? ''];
    if (pilot.military_rating) ratings.push(dataStore.vatsim.data!.military_ratings.find(x => x.id === pilot.pilot_rating)?.long_name ?? pilot.military_rating.toString());

    return ratings;
}

export function getAirportByIcao(icao?: string | null): VatSpyData['airports'][0] | null {
    if (!icao) return null;

    return useDataStore().vatspy!.data.airports.find(x => x.icao === icao) ?? null;
}
