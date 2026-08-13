import { getServerVatsimCompactShortData } from '~/utils/server/storage';
import { validateDataReady } from '~/utils/server/h3';

export default defineEventHandler(async event => {
    if (!(await validateDataReady(event))) return;

    return getServerVatsimCompactShortData();
});
