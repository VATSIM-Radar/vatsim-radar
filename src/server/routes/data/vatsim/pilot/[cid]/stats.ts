import type { VatsimMemberStats } from '~/types/data/vatsim';
import { handleH3Error } from '~/utils/backend/h3';

export default defineEventHandler(async (event): Promise<VatsimMemberStats | void> => {
    const cid = getRouterParam(event, 'cid');
    if (!cid) {
        handleH3Error({
            event,
            statusCode: 400,
            statusMessage: 'Invalid CID',
        });
        return;
    }

    return await $fetch<VatsimMemberStats>(`https://api.vatsim.net/v2/members/${ cid }/stats`);
});
