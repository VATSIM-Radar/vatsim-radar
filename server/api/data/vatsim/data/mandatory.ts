import { ofetch } from 'ofetch';
import { radarStorage } from '~/utils/server/storage';
import { handleH3Error, validateDataReady } from '~/utils/server/h3';
import type { VatsimMandatoryData } from '~/types/data/vatsim';
import { isValidDate } from '~/utils/shared';

export default defineEventHandler(async event => {
    const remoteBase = process.env.REMOTE_DATA_URL?.replace(/\/+$/, '');
    if (remoteBase) {
        try {
            return await ofetch<VatsimMandatoryData>(`${ remoteBase }/api/data/vatsim/data/mandatory`, {
                timeout: 1000 * 10,
            });
        }
        catch (e) {
            console.error('[mandatory] REMOTE_DATA_URL proxy failed, serving local data:', e);
        }
    }

    if (!(await validateDataReady(event))) return;

    const query = getQuery(event);
    let result = radarStorage.vatsim.mandatoryData;
    if (query.timestamp) {
        const mandatory = radarStorage.vatsim.mandatoryData;
        if (!mandatory) return mandatory;

        const date = new Date(query.timestamp as string);
        if (!isValidDate(date)) {
            return handleH3Error({
                event,
                statusCode: 400,
                data: 'Invalid date',
            });
        }

        result = { ...mandatory };

        for (const cid in result.pilots) {
            if (!radarStorage.vatsim.differentialUpdate?.pilots[cid] || radarStorage.vatsim.differentialUpdate?.pilots[cid] > result.pilots[cid]![5]!) continue;
            delete result.pilots[cid];
        }
    }

    return result;
});
