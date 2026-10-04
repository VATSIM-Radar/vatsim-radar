import type { H3Event } from 'h3';
import { getQuery } from 'h3';
import { radarStorage } from '~/utils/server/storage';
import { handleH3Error } from '~/utils/server/h3';
import { getAirportWeather } from '~/utils/server/vatsim/weather';
import { getVatsimAirportInfo } from '~/utils/server/vatsim';
import type { VatsimAirportData } from '~~/server/api/data/vatsim/airport/[icao]/index';
import type { VatsimBooking } from '~/types/data/vatsim';
import { BULK_AIRPORT_CONCURRENCY, MAX_BULK_AIRPORTS } from '~/utils/shared';

export async function getVatsimAirportData(icao: string, {
    weatherOnly = false,
    controllersOnly = false,
    excludeBookings = false,
    excludeWeather = false,
}: {
    weatherOnly?: boolean;
    controllersOnly?: boolean;
    excludeBookings?: boolean;
    excludeWeather?: boolean;
} = {}): Promise<VatsimAirportData> {
    const bookings: VatsimBooking[] = excludeBookings
        ? []
        : radarStorage.vatsimStatic.bookings.filter(b => b.atc.callsign.split('_')[0] === icao);

    const data: VatsimAirportData = { bookings };
    const requests: Promise<void>[] = [];

    if (!controllersOnly && !excludeWeather) {
        requests.push((async () => {
            try {
                const weather = await getAirportWeather(icao);
                if (weather?.metar) data.metar = weather.metar;
                if (weather?.taf) data.taf = weather.taf;
            }
            catch (error) {
                console.error(error);
            }
        })());
    }

    if (!weatherOnly && !controllersOnly) {
        requests.push((async () => {
            try {
                data.vatInfo = await getVatsimAirportInfo(icao);
            }
            catch (error) {
                console.error(error);
            }
        })());
    }

    // Weather and VATSIM airport info are independent; keep the available result if either source fails.
    await Promise.allSettled(requests);

    return data;
}

export function getKnownAirportIcaos(airports: string[]): string[] {
    const knownAirports = radarStorage.vatspy?.data?.keyAirports.icao;

    if (!knownAirports) return [];

    // Keep only unique, valid ICAOs known to VATSpy so one bad value cannot fail the whole batch.
    return [...new Set(airports
        .map(icao => icao.trim().toUpperCase())
        .filter(icao => icao.length === 4 && !!knownAirports[icao]))];
}

export function getBulkAirportIcaos(event: H3Event, queryKey = 'airports'): string[] | undefined {
    const airportsQuery = getQuery(event)[queryKey];
    if (typeof airportsQuery !== 'string') {
        handleH3Error({ event, statusCode: 400, data: `${ queryKey } GET-param is required` });
        return;
    }

    // Count non-empty query entries before filtering unknown or duplicate ICAOs to cap request work consistently.
    const requestedIcaos = airportsQuery.split(',').map(icao => icao.trim()).filter(Boolean);
    if (requestedIcaos.length > MAX_BULK_AIRPORTS) {
        handleH3Error({
            event,
            statusCode: 413,
            data: `A bulk request can contain at most ${ MAX_BULK_AIRPORTS } airports`,
        });
        return;
    }

    return getKnownAirportIcaos(requestedIcaos);
}

export async function mapAirportsInBatches<T>(airports: string[], mapper: (icao: string) => Promise<T>): Promise<T[]> {
    const results: T[] = [];

    // Process fixed-size batches so each bulk handler has at most ten airport tasks in flight.
    for (let index = 0; index < airports.length; index += BULK_AIRPORT_CONCURRENCY) {
        const batch = airports.slice(index, index + BULK_AIRPORT_CONCURRENCY);
        results.push(...await Promise.all(batch.map(mapper)));
    }

    return results;
}
