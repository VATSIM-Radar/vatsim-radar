import { handleH3Error } from '~/utils/backend/h3';
import { radarStorage } from '~/utils/backend/storage';
import { readBody } from 'h3';
import { getInfluxOnlineFlightsTurns } from '~/utils/backend/influx/queries';
import type { InfluxGeojson } from '~/utils/backend/influx/converters';
import { getGeojsonForData } from '~/utils/backend/influx/converters';

export type TurnsBulkReturn = {
    cid: number;
    data: InfluxGeojson;
};

export default defineEventHandler(async (event): Promise<TurnsBulkReturn[] | null | undefined> => {
    const cids = await readBody<number[]>(event);

    const pilots = radarStorage.vatsim.data?.pilots.filter(x => cids.includes(+x.cid));
    if (!pilots || pilots?.length !== cids.length) {
        handleH3Error({
            event,
            statusCode: 404,
            statusMessage: 'Pilots with those cids were not found',
        });
        return;
    }

    const turns = await getInfluxOnlineFlightsTurns(pilots.map(x => +x.cid)) ?? [];

    return turns.map(x => ({
        cid: x.cid,
        data: getGeojsonForData(x.rows),
    }));
});
