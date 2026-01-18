import { handleH3Error } from '~/utils/server/h3';
import { radarStorage } from '~/utils/server/storage';
import type { VatsimExtendedPilot } from '~/types/data/vatsim';

export default defineEventHandler(async (event): Promise<VatsimExtendedPilot | undefined> => {
    const cid = getRouterParam(event, 'cid');
    if (!cid) {
        handleH3Error({
            event,
            statusCode: 400,
            data: 'Invalid CID',
        });
        return;
    }

    const pilot = radarStorage.vatsim.extendedPilotsMap[cid];
    if (!pilot) {
        handleH3Error({
            event,
            statusCode: 404,
            data: 'Pilot with this cid is not found or offline',
        });
        return;
    }

    return pilot;
});
