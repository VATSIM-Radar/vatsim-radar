import { validateDataReady } from '~/utils/server/h3';
import { radarStorage } from '~/utils/server/storage';

export default defineEventHandler(async event => {
    if (!(await validateDataReady(event))) return;

    return radarStorage.vatsim.data?.general.onlineWSUsers ?? 0;
});
