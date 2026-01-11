import { handleH3Error } from '~/utils/server/h3';
import { radarStorage } from '~/utils/server/storage';
import { readBody } from 'h3';
import type { InfluxGeojson } from '~/utils/server/influx/converters';

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
            data: 'Pilots with those cids were not found',
        });
        return;
    }

    handleH3Error({
        event,
        statusCode: 418,
        data: 'This API is disabled',
    });
    return;

    /* const turns = await getInfluxOnlineFlightsTurns(pilots.map(x => +x.cid)) ?? [];

    return turns.map(x => ({
        cid: x.cid,
        data: getGeojsonForData(x.rows),
    }));*/
});
