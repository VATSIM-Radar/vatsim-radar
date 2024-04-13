import { prisma } from './prisma';
import { getCookie } from 'h3';
import type { H3Event } from 'h3';
import { getDBUserToken  } from '~/utils/db/user';
import type { RequiredDBUser } from '~/utils/db/user';

export async function findUserByCookie(event: H3Event): Promise<RequiredDBUser | null> {
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

export interface FullUser {
    id: number
    hasFms: boolean | null
    cid: string
    fullName: string
}

export async function findAndRefreshFullUserByCookie(event: H3Event): Promise<FullUser | null> {
    const cookie = getCookie(event, 'access-token');

    const token = await prisma.userToken.findFirst({
        select: {
            user: {
                select: {
                    id: true,
                    navigraph: {
                        select: {
                            hasFms: true,
                        },
                    },
                    vatsim: {
                        select: {
                            id: true,
                            fullName: true,
                        },
                    },
                },
            },
            accessTokenExpire: true,
            refreshMaxDate: true,
        },
        where: {
            accessToken: cookie,
        },
    });

    if (token && token.accessTokenExpire.getTime() < Date.now()) {
        getDBUserToken(event, token.user, token);
    }

    if (token) {
        return {
            id: token.user.id,
            hasFms: token.user.navigraph?.hasFms ?? null,
            cid: token.user.vatsim!.id,
            fullName: token.user.vatsim!.fullName,
        };
    }
    return null;
}
