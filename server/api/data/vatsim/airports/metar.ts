import { getBulkAirportIcaos } from '~/utils/server/vatsim/airport-data';
import { getAirportWeather } from '~/utils/server/vatsim/weather';

export default defineEventHandler(async event => {
    const airports = getBulkAirportIcaos(event);
    if (!airports) return;

    const results = await Promise.all(airports.map(async icao => {
        try {
            return [icao, await getAirportWeather(icao) ?? {}] as const;
        }
        catch (error) {
            console.error(error);
            return [icao, {}] as const;
        }
    }));

    return Object.fromEntries(results);
});
