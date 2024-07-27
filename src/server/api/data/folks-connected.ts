import { validateDataReady } from '~/utils/backend/h3';
import { radarStorage } from '~/utils/backend/storage';

export default defineEventHandler(event => {
    if (!validateDataReady(event)) return;

    return radarStorage.vatsim.data?.general.onlineWSUsers ?? 0;
});
