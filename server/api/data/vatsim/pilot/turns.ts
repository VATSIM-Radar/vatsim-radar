import { handleH3Error } from '~/utils/server/h3';
import { radarStorage } from '~/utils/server/storage';
import { readBody } from 'h3';
import type { QuestDBGeojson } from '~/utils/server/questdb/converters';

export type TurnsBulkReturn = {
    cid: number;
    data: QuestDBGeojson;
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

    /* const turns = await getQuestDBOnlineFlightsTurns(pilots.map(x => +x.cid)) ?? [];

    return turns.map(x => ({
        cid: x.cid,
        data: getGeojsonForData(x.rows),
    }));*/
});
