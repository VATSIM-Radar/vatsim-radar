import { migrationDone, migrationUsers } from '#server/api/user/settings/v2/migrate.post';
import { findAndRefreshUserByCookie } from '~/utils/server/user';
import { handleH3Error } from '~/utils/server/h3';

export default defineEventHandler(async event => {
    const user = await findAndRefreshUserByCookie(event, false);

    if (user?.cid !== '1747805' && user?.cid !== '10000001') {
        return handleH3Error({
            event,
            statusCode: 403,
        });
    }

    return {
        migrationUsers,
        migrationDone,
    };
});
