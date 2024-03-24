import { prisma } from '~/utils/backend/prisma';
import { randomUUID } from 'node:crypto';
import type { H3Event } from 'h3';
import { setCookie } from 'h3';
import type { User } from '@prisma/client';

export function createDBUser() {
    return prisma.user.create({
        select: {
            id: true,
        },
    });
}

export type RequiredDBUser = Partial<Omit<User, 'id'>> & Pick<User, 'id'>

export async function getDBUserToken(event: H3Event, user: RequiredDBUser) {
    const token = randomUUID();

    const curDate = Date.now();
    const accessTokenExpire = new Date(curDate + 1000 * 60 * 60 * 24 * 7);
    const refreshMaxDate = new Date(curDate + 1000 * 60 * 60 * 24 * 37);

    await prisma.userToken.create({
        data: {
            userId: user.id,
            accessToken: token,
            accessTokenExpire,
            //Allow to recreate token for a month after expire
            refreshMaxDate,
        },
    });

    setCookie(event, 'access-token', token, {
        expires: refreshMaxDate,
        secure: true,
        httpOnly: true,
    });

    return token;
}
