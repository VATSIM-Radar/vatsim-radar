import { getBulkAirportIcaos, getVatsimAirportData, mapAirportsInBatches } from '~/utils/server/vatsim/airport-data';
import type { VatsimAirportData } from '../airport/[icao]/index';

export default defineEventHandler(async event => {
    const airports = getBulkAirportIcaos(event);
    if (!airports) return;

    // Isolate per-airport failures so one slow or unavailable source does not discard the other results.
    const results = await mapAirportsInBatches(airports, async icao => {
        try {
            return [icao, await getVatsimAirportData(icao, { excludeWeather: true })] as const;
        }
        catch (error) {
            console.error(error);
            return [icao, {} satisfies VatsimAirportData] as const;
        }
    });

    return Object.fromEntries(results);
});
