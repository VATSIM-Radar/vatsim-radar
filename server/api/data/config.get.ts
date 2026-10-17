import { getRedisSync } from '~/utils/server/redis.ts';
import { findUserByCookie } from '~/utils/server/user.ts';
import { handleH3Error } from '~/utils/server/h3.ts';
import { prisma } from '~/utils/server/prisma.ts';

export default defineEventHandler(async event => {
    const user = await findUserByCookie(event);

    if (!user) {
        return handleH3Error({
            event,
            statusCode: 401,
        });
    }

    const vatsimUser = await prisma.vatsimUser.findFirstOrThrow({
        where: {
            userId: user.id,
        },
        select: {
            id: true,
        },
    });

    if (vatsimUser.id !== '1747805' && vatsimUser.id !== '10000001') {
        return handleH3Error({
            event,
            statusCode: 418,
        });
    }

    return {
        fastUpdatesEnabled: await getRedisSync('fast-updates-off') !== '0',
    };
});
