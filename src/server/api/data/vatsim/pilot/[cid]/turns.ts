import { handleH3Error } from '~/utils/backend/h3';

import type { InfluxGeojson } from '~/utils/backend/influx/converters';
import { radarStorage } from '~/utils/backend/storage';
import { getInfluxOnlineFlightTurnsGeojson } from '~/utils/backend/influx/converters';

export default defineEventHandler(async (event): Promise<InfluxGeojson | null | undefined> => {
    if (!process.env.INFLUX_URL) return;

    const cid = getRouterParam(event, 'cid');
    if (!cid) {
        handleH3Error({
            event,
            statusCode: 400,
            data: 'Invalid CID',
        });
        return;
    }

    const pilot = radarStorage.vatsim.data?.pilots.find(x => x.cid === +cid);
    if (!pilot) {
        handleH3Error({
            event,
            statusCode: 404,
            data: 'Pilot with this cid was not found',
        });
        return;
    }

    const start = getQuery(event).start;

    const geojson = await getInfluxOnlineFlightTurnsGeojson(cid, typeof start === 'string' ? start : undefined);

    if (geojson) return geojson;

    handleH3Error({
        event,
        statusCode: 404,
        data: `This pilot is not online or doesn't have flight plan`,
    });
});
