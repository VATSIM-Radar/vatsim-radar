import { handleH3Exception } from '~/utils/backend/h3';
import { validateAirportIcao } from '~/utils/backend/vatsim';
import { getAirportWeather } from '~/utils/backend/vatsim/weather';

export default defineEventHandler(async event => {
    const icao = await validateAirportIcao(event);
    if (!icao) return;

    try {
        return await getAirportWeather(icao) ?? {};
    }
    catch (e) {
        handleH3Exception(event, e);
        return;
    }
});
