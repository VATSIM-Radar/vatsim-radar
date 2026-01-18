import type { H3Event, H3Error } from 'h3';
import { prisma } from '~/utils/server/prisma';
import { isNext } from '~/utils/server/debug';
import { MAX_LISTS_USERS } from '~/utils/shared';
import { handleH3Error } from '~/utils/server/h3';

// TODO: use on next after prod release
export default defineEventHandler(async (event: H3Event): Promise<Record<string, boolean> | void | H3Error<any>> => {
    const ids = readBody<Array<string | number>>(event);

    if (isNext()) {
        return await $fetch<Record<string, boolean>>(`https://vatsim-radar.com/api/user/lists/privacy`, {
            body: ids,
        }).catch(() => {}) ?? {};
    }

    if (!Array.isArray(ids) || ids.length > MAX_LISTS_USERS) {
        return handleH3Error({
            event,
            data: 'Invalid body',
            statusCode: 400,
        });
    }

    const users = await prisma.user.findMany({
        where: {
            vatsim: {
                id: {
                    in: ids.map(x => typeof x === 'string' ? x : x.toString()),
                },
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

    return Object.fromEntries(ids.map(id => [id.toString(), users.find(x => x.vatsim?.id === id.toString())?.privateMode ?? false]));
});
