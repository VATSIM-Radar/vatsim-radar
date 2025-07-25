import { findUserByCookie } from '~/utils/backend/user';
import { freezeH3Request, handleH3Error, unfreezeH3Request } from '~/utils/backend/h3';
import { prisma } from '~/utils/backend/prisma';

export default defineEventHandler(async event => {
    const user = await findUserByCookie(event);

    if (!user) {
        return handleH3Error({
            event,
            statusCode: 401,
        });
    }

    if (await freezeH3Request(event, user.id) !== true) return;

    try {
        const body = await readBody<number[]>(event);

        const presets = await prisma.userPreset.findMany({
            where: {
                id: {
                    in: body,
                },
                userId: user.id,
            },
        });

        if (!presets.length) {
            return {
                status: 'ok',
            };
        }

        await Promise.all(presets.map(async preset => prisma.userPreset.update({
            where: {
                id: preset.id,
            },
            data: {
                order: body.findIndex(x => x === preset.id),
            },
        })));
    }
    finally {
        unfreezeH3Request(user.id);
    }
});
