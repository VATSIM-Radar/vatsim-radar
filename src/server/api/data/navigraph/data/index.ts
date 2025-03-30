import { radarStorage } from '~/utils/backend/storage';
import { findAndRefreshFullUserByCookie } from '~/utils/backend/user';
import { handleH3Error, validateDataReady } from '~/utils/backend/h3';

export default defineEventHandler(async event => {
    if (!await validateDataReady(event)) return;
    const user = await findAndRefreshFullUserByCookie(event);

    if (!user || !user.hasFms) {
        return handleH3Error({
            event,
            statusCode: 403,
            data: 'You must have Navigraph Data/Unlimited subscription to access this short data',
        });
    }

    return radarStorage.navigraphData?.short.current ?? handleH3Error({
        event,
        statusCode: 404,
        data: 'Data not initialized',
    });
});
