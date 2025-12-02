import { findAndRefreshUserByCookie } from '~/utils/backend/user';
import { handleH3Error } from '~/utils/backend/h3';

export default defineEventHandler(async event => {
    const user = await findAndRefreshUserByCookie(event, false, true);

    if (!user) {
        return handleH3Error({
            event,
            statusCode: 401,
        });
    }

    return user;
});
