import { prisma } from '~/utils/server/prisma';
import { vatsimGetUser } from '~/utils/server/vatsim';
import { readBody } from 'h3';
import { handleH3Error } from '~/utils/server/h3';
import { createDBUser, getDBUserToken } from '~/utils/db/user';
import { findUserByCookie } from '~/utils/server/user';

export default defineEventHandler(async event => {
    const body = await readBody<{ token: string }>(event);

    if (!body.token) {
        return handleH3Error({
            event,
            statusCode: 400,
            data: 'Token is missing',
        });
    }

    const vatsimUser = await vatsimGetUser(body.token);

    const vatsimUserClient = await prisma.vatsimUser.findFirst({
        select: {
            user: {
                select: {
                    id: true,
                },
            },
        },
        where: {
            id: vatsimUser.cid,
        },
    });

    let user = await findUserByCookie(event);

    if (vatsimUserClient) {
        if (!user) {
            await getDBUserToken(event, vatsimUserClient.user);
        }

        return {
            status: 'ok',
        };
    }

    if (!user) {
        user = await createDBUser();
        await getDBUserToken(event, user);
    }

    await prisma.vatsimUser.create({
        data: {
            id: vatsimUser.cid,
            userId: user.id,
            accessToken: body.token,
            accessTokenExpire: null,
            refreshToken: null,
            fullName: vatsimUser.personal.name_full,
        },
    });

    return {
        status: 'ok',
    };
});
