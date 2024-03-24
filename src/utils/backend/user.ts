import { prisma } from './prisma';
import { getCookie } from 'h3';
import type { H3Event } from 'h3';

export async function findUserByCookie(event: H3Event) {
    const cookie = getCookie(event, 'access-token');

    const token = await prisma.userToken.findFirst({
        select: {
            user: true,
        },
        where: {
            accessToken: cookie,
            accessTokenExpire: {
                gte: new Date(),
            },
        },
    });

    if (token) return token.user;
    return null;
}
