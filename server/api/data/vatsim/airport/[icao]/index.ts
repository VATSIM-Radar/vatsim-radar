import { validateAirportIcao } from '~/utils/server/vatsim';
import type { VatsimAirportInfo } from '~/utils/server/vatsim';
import { getVatsimAirportData } from '~/utils/server/vatsim/airport-data';
import type { VatsimBooking } from '~/types/data/vatsim';

export interface VatsimAirportData {
    metar?: string;
    taf?: string;
    vatInfo?: VatsimAirportInfo | null;
    bookings?: VatsimBooking[];
}

export default defineEventHandler(async (event): Promise<VatsimAirportData | undefined> => {
    const validateAirport = await validateAirportIcao(event, true);
    if (!validateAirport) return;

    const { icao } = validateAirport;

    return getVatsimAirportData(icao, {
        weatherOnly: getQuery(event).requestedDataType === '1',
        controllersOnly: getQuery(event).requestedDataType === '2',
        excludeBookings: getQuery(event).excludeBookings === '1',
        excludeWeather: getQuery(event).excludeWeather === '1',
    });
});
