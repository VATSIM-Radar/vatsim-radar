import { ofetch } from 'ofetch';
import { radarStorage } from '~/utils/server/storage';
import { validateDataReady } from '~/utils/server/h3';
import type { VatsimMandatoryData } from '~/types/data/vatsim';

export default cachedEventHandler(async event => {
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

    return radarStorage.vatsim.mandatoryData;
}, {
    name: 'mandatory',
    maxAge: 1,
    staleMaxAge: 2,
});
