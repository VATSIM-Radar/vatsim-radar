import { getServerVatsimCompactShortData } from '~/utils/server/storage';
import { validateDataReady } from '~/utils/server/h3';

export default cachedEventHandler(async event => {
    if (!(await validateDataReady(event))) return;

    return getServerVatsimCompactShortData();
}, {
    name: 'short-compact',
    maxAge: 3,
    staleMaxAge: 2,
});
