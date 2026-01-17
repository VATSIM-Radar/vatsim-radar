import { getServerVatsimLiveShortData } from '~/utils/backend/storage';
import { validateDataReady } from '~/utils/backend/h3';

export default cachedEventHandler(async event => {
    if (!(await validateDataReady(event))) return;

    return getServerVatsimLiveShortData();
}, {
    name: 'short',
    maxAge: 3,
    staleMaxAge: 2,
});
