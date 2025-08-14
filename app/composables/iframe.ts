import { getQuery, getRequestHeader, setHeader } from 'h3';
import { isValidIPOrigin } from '~/utils/shared';
import { prisma } from '~/utils/backend/prisma';

const iframeWhitelist = [
    'localhost',
    'vatsimsa.com',
    'vatcar.net',
    'idvacc.id',
    'vatcol.org',
    'urrv.me',
    'vatsim.net',
    'vatsim-petersburg.com',
    'vatsim-radar.com',
];

export async function useIframeHeader() {
    if (import.meta.client) return;

    const event = useRequestEvent();
    if (!event) return;

    const originHeader = getRequestHeader(event, 'origin');
    const refererHeader = getRequestHeader(event, 'referer');
    if (!originHeader && !refererHeader) return;

    try {
        const origin = new URL(originHeader || refererHeader!).hostname;

        if (origin && iframeWhitelist.includes(origin)) {
            setHeader(event, 'Content-Security-Policy', `frame-ancestors 'self' ${ origin }`);
        }
        else {
            if (originHeader && isValidIPOrigin(originHeader)) {
                const token = (getQuery(event).iframe as string | undefined);
                if (token && await prisma.userIframeToken.findFirst({
                    where: {
                        accessToken: token,
                        accessTokenExpire: {
                            gte: new Date(),
                        },
                    },
                })) {
                    setHeader(event, 'Content-Security-Policy', `frame-ancestors 'self' ${ origin }`);
                    return;
                }
            }

            setHeader(event, 'Content-Security-Policy', `frame-ancestors 'self'`);
        }
    }
    catch (e) {
        console.error(e);
    }
}
