import type { H3Event } from 'h3';
import { prisma } from '~/utils/server/prisma';
import { isNext } from '~/utils/server/debug';

export default defineEventHandler(async (event: H3Event) => {
    const id = getRouterParam(event, 'id');

    if (isNext()) {
        const request = await $fetch<{ isPrivate: boolean }>(`https://vatsim-radar.com/api/user/lists/privacy/${ id }`).catch(() => {});
        if (request?.isPrivate) {
            return {
                isPrivate: true,
            };
        }
    }

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
