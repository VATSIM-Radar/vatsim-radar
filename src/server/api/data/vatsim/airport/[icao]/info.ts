import { handleH3Error, handleH3Exception } from '~/utils/backend/h3';
import { radarStorage } from '~/utils/backend/storage';
import type { VatsimAirportInfo } from '~/utils/backend/vatsim';
import { getVatsimAirportInfo } from '~/utils/backend/vatsim';

export default defineEventHandler(async (event): Promise<VatsimAirportInfo | undefined> => {
    const icao = getRouterParam(event, 'icao')?.toUpperCase();
    if (icao?.length !== 4) {
        handleH3Error({
            event,
            statusCode: 400,
            statusMessage: 'Invalid ICAO',
        });
        return;
    }

    const airport = radarStorage.vatspy.data?.airports.find(x => x.icao === icao);
    if (!airport) {
        handleH3Error({
            event,
            statusCode: 404,
            statusMessage: 'Airport not found',
        });
        return;
    }

    try {
        return await getVatsimAirportInfo(icao);
    }
    catch (e) {
        handleH3Exception(event, e);
        return;
    }
});
