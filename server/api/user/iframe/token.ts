import { handleH3Error } from '~/utils/backend/h3';
import { isValidIPOrigin } from '~/utils/backend';
import { prisma } from '~/utils/backend/prisma';
import { randomUUID } from 'node:crypto';

export default defineEventHandler(async event => {
    const config = useRuntimeConfig();

    const origin = getRequestHeader(event, 'Origin');

    setResponseHeaders(event, {
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'X-Radar-Token',
        'Access-Control-Expose-Headers': '*',
    });

    if (event.method === 'OPTIONS') {
        event.node.res.statusCode = 204;
        event.node.res.statusMessage = 'No Content.';
        return 'OK';
    }

    if (!origin || !isValidIPOrigin(origin)) {
        return handleH3Error({
            event,
            statusCode: 400,
            data: `${ origin } is not a valid Origin`,
        });
    }

    const token = getRequestHeader(event, 'X-Radar-Token');
    if (token !== config.IFRAME_TOKEN) {
        return handleH3Error({
            event,
            statusCode: 403,
        });
    }

    const curDate = Date.now();
    const accessToken = randomUUID();
    const refreshToken = randomUUID();
    const accessTokenExpire = new Date(curDate + (1000 * 60 * 60 * 24));
    const refreshTokenExpire = new Date(curDate + (1000 * 60 * 60 * 24 * 21));

    await prisma.userIframeToken.create({
        data: {
            accessToken,
            refreshToken,
            accessTokenExpire,
            refreshTokenExpire,
        },
    });

    return {
        accessToken,
        refreshToken,
        accessTokenExpire: accessTokenExpire.toISOString(),
        refreshTokenExpire: refreshTokenExpire.toISOString(),
    };
});
