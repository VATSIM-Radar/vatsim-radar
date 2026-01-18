import { handleH3Error } from '~/utils/server/h3';
import { prisma } from '~/utils/server/prisma';
import { randomUUID } from 'node:crypto';
import { isValidIPOrigin } from '~/utils/shared';

export default defineEventHandler(async event => {
    const config = useRuntimeConfig();

    const origin = getRequestHeader(event, 'Origin');

    setResponseHeaders(event, {
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'X-Radar-Token,X-Refresh-Token',
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

    const refreshToken = getRequestHeader(event, 'X-Refresh-Token');
    if (!refreshToken) {
        return handleH3Error({
            event,
            statusCode: 400,
            data: 'Refresh token is missing',
        });
    }

    const iframeToken = await prisma.userIframeToken.findFirst({
        where: {
            refreshToken,
        },
    });

    if (iframeToken) {
        const curDate = Date.now();
        if (iframeToken.refreshTokenExpire.getTime() < curDate) {
            return handleH3Error({
                event,
                statusCode: 403,
                data: 'Refresh token is expired',
            });
        }

        const accessToken = randomUUID();
        const refreshToken = randomUUID();
        const accessTokenExpire = new Date(curDate + (1000 * 60 * 60 * 24));
        const refreshTokenExpire = new Date(curDate + (1000 * 60 * 60 * 24 * 21));

        await prisma.userIframeToken.update({
            where: {
                id: iframeToken.id,
            },
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
    }

    return handleH3Error({
        event,
        statusCode: 401,
        data: 'Refresh token not found or expired',
    });
});
