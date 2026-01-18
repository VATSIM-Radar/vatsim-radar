import { findUserByCookie } from '~/utils/server/user';
import { freezeH3Request, handleH3Error, handleH3Exception, unfreezeH3Request } from '~/utils/server/h3';
import { prisma } from '~/utils/server/prisma';
import { getVATSIMIdentHeaders } from '~/utils/server';

export default defineEventHandler(async event => {
    const user = await findUserByCookie(event);

    try {
        if (!user) {
            return handleH3Error({
                event,
                statusCode: 401,
            });
        }

        if (await freezeH3Request(event, user.id) !== true) return;

        const body = await readBody<{ enabled: boolean }>(event);
        if (!('enabled' in body)) {
            return handleH3Error({
                event,
                statusCode: 400,
            });
        }

        if (!body.enabled) {
            await prisma.user.update({
                where: {
                    id: user.id,
                },
                data: {
                    isSup: false,
                },
            });

            return {
                status: 'ok',
            };
        }

        const vatsimId = await prisma.vatsimUser.findFirstOrThrow({
            select: {
                id: true,
            },
            where: {
                userId: user.id,
            },
        });

        const userData = await $fetch<{ rating: number }>(`https://api.vatsim.net/v2/members/${ vatsimId.id }`, {
            headers: getVATSIMIdentHeaders(),
        });
        if (userData.rating !== 11 && userData.rating !== 12) {
            await prisma.user.update({
                where: {
                    id: user.id,
                },
                data: {
                    isSup: false,
                },
            });

            return handleH3Error({
                event,
                statusCode: 403,
            });
        }

        await prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                isSup: true,
            },
        });

        return {
            status: 'ok',
        };
    }
    catch (e) {
        return handleH3Exception(event, e);
    }
    finally {
        if (user) {
            unfreezeH3Request(user.id);
        }
    }
});
