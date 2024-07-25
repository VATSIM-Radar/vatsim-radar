import { getServerVatsimLiveData, getServerVatsimLiveShortData } from '~/utils/backend/storage';
import { validateDataReady } from '~/utils/backend/h3';

export default defineEventHandler(event => {
    if (!validateDataReady(event)) return;

    const isShort = getQuery(event).short === '1';

    if (isShort) {
        return getServerVatsimLiveShortData();
    }

    return getServerVatsimLiveData();
});
