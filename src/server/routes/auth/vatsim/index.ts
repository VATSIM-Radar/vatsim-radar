import { prisma } from '~/utils/backend/prisma';
import { handleH3Exception } from '~/utils/backend/h3';
import { createDBUser, getDBUserToken } from '~/utils/db/user';
import { vatsimAuthOrRefresh, vatsimGetUser } from '~/utils/backend/vatsim';
import { findUserByCookie } from '~/utils/backend/user';

export default defineEventHandler(async (event) => {
    try {
        const config = useRuntimeConfig();
        const query = getQuery(event) as Record<string, string>;

        const { id: verifierId } = await prisma.auth.findFirstOrThrow({
            select: {
                id: true,
            },
            where: {
                state: query.state ?? '',
            },
        });

        await prisma.auth.delete({ where: { id: verifierId } });

        const auth = await vatsimAuthOrRefresh(query.code as string, 'auth');

        const vatsimUser = await vatsimGetUser(auth.access_token);

        const expires = new Date(Date.now() + auth.expires_in * 1000);

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
            await prisma.vatsimUser.update({
                where: {
                    userId: vatsimUserClient.user.id,
                },
                data: {
                    accessToken: auth.access_token,
                    accessTokenExpire: expires,
                    refreshToken: auth.refresh_token,
                    fullName: vatsimUser.personal.name_full,
                },
            });

            if (!user) {
                await getDBUserToken(event, vatsimUserClient.user);
            }
            return sendRedirect(event, config.DOMAIN);
        }

        if (!user) {
            user = await createDBUser();
            await getDBUserToken(event, user);
        }

        await prisma.vatsimUser.create({
            data: {
                id: vatsimUser.cid,
                userId: user.id,
                accessToken: auth.access_token,
                accessTokenExpire: expires,
                refreshToken: auth.refresh_token,
                fullName: vatsimUser.personal.name_full,
            },
        });

        return sendRedirect(event, config.DOMAIN);
    }
    catch (e) {
        return handleH3Exception(event, e);
    }
});
