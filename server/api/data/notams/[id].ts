import { findUserByCookie } from '~/utils/server/user';
import { handleH3Error } from '~/utils/server/h3';
import { prisma } from '~/utils/server/prisma';
import type { RadarNotam } from '~/utils/shared/vatsim';

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

    if (vatsimUser.id !== '1747805') {
        return handleH3Error({
            event,
            statusCode: 418,
        });
    }

    const method = event.method;
    const id = +getRouterParam(event, 'id')!;

    if (method === 'GET') return prisma.notams.findMany();
    if (method === 'DELETE') {
        await prisma.notams.delete({
            where: {
                id,
            },
        });

        return {
            status: 'ok',
        };
    }

    const body = await readBody<RadarNotam>(event);

    if (method === 'PUT') {
        await prisma.notams.update({
            where: {
                id,
            },
            data: body,
        });
    }

    if (method === 'POST') {
        await prisma.notams.create({
            data: body,
        });
    }

    return {
        status: 'ok',
    };
});
