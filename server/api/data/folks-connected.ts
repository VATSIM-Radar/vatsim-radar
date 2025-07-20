import { validateDataReady } from '~/utils/backend/h3';
import { radarStorage } from '~/utils/backend/storage';

export default defineEventHandler(async event => {
    if (!(await validateDataReady(event))) return;

    return radarStorage.vatsim.data?.general.onlineWSUsers ?? 0;
});
