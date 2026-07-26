import { findAndRefreshUserByCookie } from '~/utils/server/user';
import { handleH3Error } from '~/utils/server/h3';

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
