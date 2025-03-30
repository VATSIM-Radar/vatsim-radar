import { radarStorage } from '~/utils/backend/storage';
import { handleH3Error, validateDataReady } from '~/utils/backend/h3';

export default defineEventHandler(async event => {
    if (!await validateDataReady(event)) return;

    return radarStorage.navigraphData?.short.outdated ?? handleH3Error({
        event,
        statusCode: 404,
        data: 'Data not initialized',
    });
});
