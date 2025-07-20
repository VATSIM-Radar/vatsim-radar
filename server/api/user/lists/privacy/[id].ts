import type { H3Event } from 'h3';
import { findUserByCookie } from '~/utils/backend/user';
import { handleH3Error } from '~/utils/backend/h3';
import { prisma } from '~/utils/backend/prisma';

export default defineEventHandler(async (event: H3Event) => {
    const user = await findUserByCookie(event);

    if (!user) {
        return handleH3Error({
            event,
            statusCode: 401,
        });
    }

    const id = getRouterParam(event, 'id');

    const dbUser = (await prisma.user.findFirst({
        where: {
            vatsim: {
                id,
            },
        },
        select: {
            privateMode: true,
            vatsim: {
                select: {
                    id: true,
                },
            },
        },
    }));

    return {
        isPrivate: !!dbUser?.privateMode,
    };
});
