import { findUserByCookie } from '~/utils/server/user';
import { handleH3Error, handleH3Exception } from '~/utils/server/h3';
import { prisma } from '~/utils/server/prisma';

export default defineEventHandler(async event => {
    try {
        const user = await findUserByCookie(event);

        if (!user) {
            return handleH3Error({
                event,
                statusCode: 401,
            });
        }

        if (event.method !== 'POST') {
            return handleH3Error({
                event,
                statusCode: 400,
                data: 'Only POST methods are allowed for this route',
            });
        }

        await prisma.navigraphUser.delete({
            where: {
                userId: user.id,
            },
        });
    }
    catch (e) {
        return handleH3Exception(event, e);
    }

    return {
        status: 'ok',
    };
});
