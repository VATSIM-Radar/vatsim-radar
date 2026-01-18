import { handleH3Error } from '~/utils/server/h3';
import { getAirportNotams } from '~/utils/server/notams';

export default defineEventHandler(async event => {
    const query = getQuery(event);
    const isShort = !query.full;
    const icao = getQuery(event).icao;

    if (!icao || typeof icao !== 'string') {
        return handleH3Error({
            event,
            statusCode: 400,
            data: 'icao GET-param is required',
        });
    }

    const icaos = icao.split(',');

    return Object.fromEntries(await Promise.all(icaos.map(async icao => [icao, await getAirportNotams(icao, isShort)])));
});
