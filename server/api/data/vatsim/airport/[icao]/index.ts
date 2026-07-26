import { radarStorage } from '~/utils/server/storage';
import type { VatsimAirportInfo } from '~/utils/server/vatsim';
import { getVatsimAirportInfo, validateAirportIcao } from '~/utils/server/vatsim';
import { getAirportWeather } from '~/utils/server/vatsim/weather';
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

    const weatherOnly = getQuery(event).requestedDataType === '1';
    const controllersOnly = getQuery(event).requestedDataType === '2';
    const excludeBookings = getQuery(event).excludeBookings === '1';

    const bookings = excludeBookings ? [] : radarStorage.vatsimStatic.bookings.filter(b => b.atc.callsign.split('_')[0] === icao);

    const data: VatsimAirportData = {
        bookings: bookings,
    };
    const promises: PromiseLike<any>[] = [];

    if (!controllersOnly) {
        promises.push(new Promise<void>(async resolve => {
            const weather = await getAirportWeather(icao);
            if (weather?.metar) data.metar = weather.metar;
            if (weather?.taf) data.taf = weather.taf;

            resolve();
        }));
    }
    if (!weatherOnly && !controllersOnly) {
        promises.push(new Promise<void>(async resolve => {
            try {
                data.vatInfo = await getVatsimAirportInfo(icao);

                resolve();
            }
            catch (e) {
                console.error(e);
                resolve();
            }
        }));
    }

    await Promise.allSettled(promises);

    return data;
});
