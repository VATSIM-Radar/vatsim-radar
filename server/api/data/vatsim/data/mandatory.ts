import { ofetch } from 'ofetch';
import { radarStorage } from '~/utils/server/storage';
import { handleH3Error, validateDataReady } from '~/utils/server/h3';
import type { VatsimMandatoryData } from '~/types/data/vatsim';
import { filterVatsimDataByTimestamp } from '~/utils/server/vatsim/differential';

export default defineEventHandler(async event => {
    const remoteBase = process.env.REMOTE_DATA_URL?.replace(/\/+$/, '');
    if (remoteBase) {
        try {
            const mandatory = await ofetch<VatsimMandatoryData>(`${ remoteBase }/api/data/vatsim/data/mandatory`, {
                timeout: 1000 * 10,
                query: getQuery(event),
            });
            if (mandatory.pilots.length) return mandatory;

            handleH3Error({
                event,
                statusCode: 404,
                data: 'Mandatory data is not ready yet',
            });
            return;
        }
        catch (e) {
            console.error('[mandatory] REMOTE_DATA_URL proxy failed, serving local data:', e);
        }
    }

    if (!(await validateDataReady(event))) return;

    const mandatory = radarStorage.vatsim.mandatoryData;
    if (!mandatory) return mandatory;
    if (!mandatory.pilots.length) {
        handleH3Error({
            event,
            statusCode: 404,
            data: 'Mandatory data is not ready yet',
        });
        return;
    }

    const filteredMandatory = filterVatsimDataByTimestamp(event, mandatory, ['pilots'], false, radarStorage.vatsim.mandatoryDifferentialUpdate);
    if (!filteredMandatory) return;
    if (filteredMandatory.pilots.length) return filteredMandatory;

    const latestTimestamp = Object.values(radarStorage.vatsim.mandatoryDifferentialUpdate ?? {}).sort().at(-1);
    handleH3Error({
        event,
        statusCode: 404,
        data: `No mandatory changes after timestamp (latest: ${ latestTimestamp ?? 'unknown' })`,
    });
});
