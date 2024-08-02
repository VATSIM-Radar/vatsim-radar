import { handleH3Exception } from '~/utils/backend/h3';
import { validateAirportIcao } from '~/utils/backend/vatsim';
import { getAirportWeather } from '~/utils/backend/vatsim/weather';

export default defineEventHandler(event => {
    const icao = validateAirportIcao(event);
    if (!icao) return;

    try {
        return getAirportWeather(icao) ?? {};
    }
    catch (e) {
        handleH3Exception(event, e);
        return;
    }
});
