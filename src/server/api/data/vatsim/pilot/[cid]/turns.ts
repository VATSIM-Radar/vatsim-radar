import { handleH3Error } from '~/utils/backend/h3';
import { radarStorage } from '~/utils/backend/storage';
import type { InfluxGeojson } from '~/utils/backend/influx';
import { getInfluxOnlineFlightTurnsGeojson } from '~/utils/backend/influx';

export default defineEventHandler(async (event): Promise<InfluxGeojson | null | undefined> => {
    const cid = getRouterParam(event, 'cid');
    if (!cid) {
        handleH3Error({
            event,
            statusCode: 400,
            statusMessage: 'Invalid CID',
        });
        return;
    }

    const pilot = radarStorage.vatsim.data?.pilots.find(x => x.cid === +cid);
    if (!pilot?.flight_plan) {
        handleH3Error({
            event,
            statusCode: 404,
            statusMessage: 'Pilot with this cid was not found or doesn\'t have flight plan',
        });
        return;
    }

    const geojson = await getInfluxOnlineFlightTurnsGeojson(cid);

    if (geojson) return geojson;

    handleH3Error({
        event,
        statusCode: 404,
        statusMessage: `This pilot is not online or doesn't have flight plan`,
    });
});
