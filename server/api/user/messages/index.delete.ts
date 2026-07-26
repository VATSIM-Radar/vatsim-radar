import { findAndRefreshUserByCookie } from '~/utils/server/user';
import { handleH3Error } from '~/utils/server/h3';
import { prisma } from '~/utils/server/prisma';

export default defineEventHandler(async event => {
    const user = await findAndRefreshUserByCookie(event, false, false);

    if (!user) {
        return handleH3Error({
            event,
            statusCode: 401,
        });
    }

    await prisma.userAcknowledgedMessages.deleteMany({
        where: {
            userId: user.id,
        },
    });

    return {
        ...user,
        messages: [],
    };
});
