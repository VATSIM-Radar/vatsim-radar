import { getServerVatsimLiveShortData } from '~/utils/backend/storage';
import { validateDataReady } from '~/utils/backend/h3';

export default defineEventHandler(event => {
    if (!validateDataReady(event)) return;

    return getServerVatsimLiveShortData();
});
