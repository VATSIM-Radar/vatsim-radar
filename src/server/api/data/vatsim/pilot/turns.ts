import { handleH3Error } from '~/utils/backend/h3';
import { radarStorage } from '~/utils/backend/storage';
import type { InfluxGeojson } from '~/utils/backend/influx';
import { getInfluxOnlineFlightTurnsGeojson } from '~/utils/backend/influx';

export default defineEventHandler(async (event): Promise<InfluxGeojson[] | null | undefined> => {
    const cids = getQuery(event).cids;
    if (typeof cids !== 'string') {
        handleH3Error({
            event,
            statusCode: 400,
            statusMessage: 'Invalid CIDs',
        });
        return;
    }

    const cidsArr = cids.split(',');

    const pilots = radarStorage.vatsim.data?.pilots.filter(x => cidsArr.includes(x.cid.toString()));
    if (pilots?.length !== cidsArr.length) {
        handleH3Error({
            event,
            statusCode: 404,
            statusMessage: 'Pilots with those cids were not found',
        });
        return;
    }

    const geojson = await Promise.all(cidsArr.map(x => getInfluxOnlineFlightTurnsGeojson(x)));
    return geojson.filter(x => x) as InfluxGeojson[];
});
