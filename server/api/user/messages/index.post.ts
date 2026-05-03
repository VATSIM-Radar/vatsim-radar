import type { UserMessage } from '~/utils/server/user';
import { findAndRefreshUserByCookie } from '~/utils/server/user';
import { handleH3Error } from '~/utils/server/h3';
import { UserMessageType } from '~/utils/shared';
import { prisma } from '~/utils/server/prisma';

export default defineEventHandler(async event => {
    const user = await findAndRefreshUserByCookie(event, false, false);

    if (!user) {
        return handleH3Error({
            event,
            statusCode: 401,
        });
    }

    const body = await readBody<{ message: UserMessageType }>(event);

    if (!body?.message || !Object.hasOwn(UserMessageType, body.message)) {
        return handleH3Error({
            event,
            statusCode: 400,
            data: 'Incorrect message',
        });
    }

    if (user.messages.some(x => x.message === body.message)) {
        return handleH3Error({
            event,
            statusCode: 400,
            data: 'That message already exists',
        });
    }

    const message = await prisma.userAcknowledgedMessages.create({
        data: {
            message: body.message,
            userId: user.id,
        },
    });

    user.messages.push(message as UserMessage);

    return user;
});
