import type { H3Event, H3Error } from 'h3';
import { prisma } from '~/utils/server/prisma';
import { isNext } from '~/utils/server/debug';
import { handleH3Error } from '~/utils/server/h3';

export default defineEventHandler(async (event: H3Event): Promise<Record<string, boolean> | void | H3Error<any>> => {
    const authorization = getHeader(event, 'Authorization');

    if (!authorization || !process.env.VATSIM_IDENT_TOKEN || authorization.replace('Bearer ', '') !== process.env.VATSIM_IDENT_TOKEN) {
        return handleH3Error({
            event,
            statusCode: 401,
        });
    }

    const ids = readBody<Array<string | number>>(event);

    if (isNext()) {
        return await $fetch<Record<string, boolean>>(`https://vatsim-radar.com/api/user/lists/privacy`, {
            body: ids,
        }).catch(() => {}) ?? {};
    }

    const users = await prisma.user.findMany({
        where: {
            NOT: {
                privateMode: false,
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
    });

    return Object.fromEntries(users.map(user => [user.vatsim?.id, user.privateMode ?? false]).filter(x => x[0] && x[1]));
});
