import { handleSettingsEvent } from '~/utils/server/handlers/settings-v2';
import { migrationDone, migrationUsers } from '#server/api/user/settings/v2/migrate.post';
import { findAndRefreshUserByCookie, findUserByCookie } from '~/utils/server/user';
import { handleH3Error } from '~/utils/server/h3';

export default defineEventHandler(async event => {
    const user = await findAndRefreshUserByCookie(event, false);

    if (user?.cid !== '1747805') {
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
