import type { UserSettings } from '~/utils/backend/user';
import { findUserByCookie } from '~/utils/backend/user';
import { handleH3Error, handleH3Exception } from '~/utils/backend/h3';
import { prisma } from '~/utils/backend/prisma';

const validators: Record<keyof UserSettings, (val: unknown) => boolean> = {
    autoFollow: val => typeof val === 'boolean',
    autoZoom: val => typeof val === 'boolean',
    autoShowAirportTracks: val => typeof val === 'boolean',
    headerName: val => (typeof val === 'string' && val.length <= 30) || val === null,
};

export default defineEventHandler(async (event) => {
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
                statusMessage: 'Only POST methods are allowed for this route',
            });
        }

        const body = await readBody<UserSettings>(event);
        if (!body) {
            return handleH3Error({
                event,
                statusCode: 400,
                statusMessage: 'You must pass body to this route',
            });
        }

        for (const [key, value] of Object.entries(body) as [keyof UserSettings, unknown][]) {
            if (!(key in validators)) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    statusMessage: `Invalid key given: ${ key }`,
                });
            }

            if (!validators[key](value)) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    statusMessage: `${ key } validation has failed`,
                });
            }
        }

        await prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                settings: JSON.stringify(body),
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
