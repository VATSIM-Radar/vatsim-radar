import type { UserSettings } from '~/utils/backend/user';
import { findUserByCookie } from '~/utils/backend/user';
import { handleH3Error, handleH3Exception } from '~/utils/backend/h3';
import { prisma } from '~/utils/backend/prisma';

const sortOptions: UserSettings['favoriteSort'][] = ['newest', 'oldest', 'abcAsc', 'abcDesc', 'cidAsc', 'cidDesc'];
const timeOptions: UserSettings['timeFormat'][] = ['24h', '12h'];

const validators: Record<keyof UserSettings, (val: unknown) => boolean> = {
    autoFollow: val => typeof val === 'boolean',
    autoZoom: val => typeof val === 'boolean',
    autoShowAirportTracks: val => typeof val === 'boolean',
    timeFormat: val => typeof val === 'string' && timeOptions.includes(val as UserSettings['timeFormat']),
    toggleAircraftOverlays: val => typeof val === 'boolean',
    showFullRoute: val => typeof val === 'boolean',
    headerName: val => (typeof val === 'string' && val.length <= 30) || val === null,
    seenVersion: val => (typeof val === 'string' && val.length <= 15) || val === null,
    favoriteSort: val => (typeof val === 'string' && sortOptions.includes(val as any)) || val === null,
};

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

        const body = await readBody<UserSettings>(event);
        if (!body) {
            return handleH3Error({
                event,
                statusCode: 400,
                data: 'You must pass body to this route',
            });
        }

        for (const [key, value] of Object.entries(body) as [keyof UserSettings, unknown][]) {
            if (!(key in validators)) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: `Invalid key given: ${ key }`,
                });
            }

            if (!validators[key](value)) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: `${ key } validation has failed`,
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
