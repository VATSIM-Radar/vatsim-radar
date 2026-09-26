import { getServerVatsimCompactShortData } from '~/utils/server/storage';
import { validateDataReady } from '~/utils/server/h3';
import { filterVatsimDataByTimestamp } from '~/utils/server/vatsim/differential';

export default defineEventHandler(async event => {
    if (!(await validateDataReady(event))) return;

    return filterVatsimDataByTimestamp(event, getServerVatsimCompactShortData());
});
