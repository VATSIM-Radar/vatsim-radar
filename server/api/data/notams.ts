import { handleH3Exception } from '~/utils/server/h3';
import { getAirportNotams } from '~/utils/server/notams';
import { getBulkAirportIcaos, mapAirportsInBatches } from '~/utils/server/vatsim/airport-data';

export default defineEventHandler(async event => {
    try {
        const query = getQuery(event);
        const isShort = !query.full;
        const icaos = getBulkAirportIcaos(event, 'icao');
        if (!icaos) return;

        return Object.fromEntries(await mapAirportsInBatches(icaos, async icao => [icao, await getAirportNotams(icao, isShort).catch(() => ([]))] as const));
    }
    catch (e) {
        handleH3Exception(event, e);
        return;
    }
});
