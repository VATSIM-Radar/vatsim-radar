import { findUserByCookie } from '~/utils/backend/user';
import { handleH3Error, handleH3Exception } from '~/utils/backend/h3';
import { prisma } from '~/utils/backend/prisma';

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

        await prisma.user.delete({
            where: {
                id: user.id,
            },
        });
    }
    catch (e) {
        return handleH3Exception(event, e);
    }

    return {
        status: ':(',
    };
});
