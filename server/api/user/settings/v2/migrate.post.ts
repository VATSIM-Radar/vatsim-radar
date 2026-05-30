import { handleH3Error } from '~/utils/server/h3';
import { findAndRefreshUserByCookie } from '~/utils/server/user';
import { prisma } from '~/utils/server/prisma';
import { UserPresetType } from '#build/prisma/client';

export let migrationUsers = 0;
export const migrationDone = 0;

export default defineEventHandler(async event => {
    const user = await findAndRefreshUserByCookie(event, false);

    if (user?.cid !== '1747805') {
        return handleH3Error({
            event,
            statusCode: 403,
        });
    }

    if (migrationUsers !== 0) {
        return handleH3Error({
            event,
            statusCode: 400,
            data: 'Already started',
        });
    }

    const users = await prisma.user.findMany({
        include: {
            presets: {
                where: {
                    type: UserPresetType.MAP_SETTINGS,
                },
            },
        },
    });

    migrationUsers = users.length;
});
