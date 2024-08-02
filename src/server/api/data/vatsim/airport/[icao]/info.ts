import { handleH3Exception } from '~/utils/backend/h3';
import type { VatsimAirportInfo } from '~/utils/backend/vatsim';
import { getVatsimAirportInfo, validateAirportIcao } from '~/utils/backend/vatsim';

export default defineEventHandler(async (event): Promise<VatsimAirportInfo | undefined> => {
    const icao = validateAirportIcao(event);
    if (!icao) return;

    try {
        return await getVatsimAirportInfo(icao);
    }
    catch (e) {
        handleH3Exception(event, e);
        return;
    }
});
