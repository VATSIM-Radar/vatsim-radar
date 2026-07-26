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

    const id = getRouterParam(event, 'id');

    if (!id || isNaN(Number(id))) {
        return handleH3Error({
            event,
            statusCode: 400,
            data: 'Incorrect message',
        });
    }

    await prisma.userAcknowledgedMessages.delete({
        where: {
            id: +id,
            userId: user.id,
        },
    });

    user.messages = user.messages.filter(x => x.id.toString() !== id);

    return user;
});
