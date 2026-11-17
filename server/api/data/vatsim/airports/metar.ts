import { getBulkAirportIcaos } from '~/utils/server/vatsim/airport-data';
import { getAirportWeather } from '~/utils/server/vatsim/weather';

export default defineEventHandler(async event => {
    const airports = getBulkAirportIcaos(event);
    if (!airports) return;

    return getAirportWeather(airports);
});
