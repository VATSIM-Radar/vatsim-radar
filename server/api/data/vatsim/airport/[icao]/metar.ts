import { handleH3Exception } from '~/utils/server/h3';
import { validateAirportIcao } from '~/utils/server/vatsim';
import { getAirportWeather } from '~/utils/server/vatsim/weather';

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
