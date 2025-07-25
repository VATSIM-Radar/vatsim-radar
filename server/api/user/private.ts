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

        const body = await readBody<{ date: string | null; enabled: boolean }>(event);
        if (!('date' in body) || !('enabled' in body)) {
            return handleH3Error({
                event,
                statusCode: 400,
            });
        }

        const date = body.date && new Date(body.date);
        if (date && (!(date instanceof Date) || isNaN(date.getTime()))) {
            return handleH3Error({
                event,
                statusCode: 400,
            });
        }

        await prisma.user.update({
            data: {
                privateMode: !!body.enabled,
                privateUntil: date || null,
            },
            where: {
                id: user.id,
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
