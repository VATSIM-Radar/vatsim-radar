import { prisma } from './prisma';
import { getCookie } from 'h3';
import type { H3Event } from 'h3';
import { getDBUserToken } from '~/utils/db/user';
import type { RequiredDBUser } from '~/utils/db/user';
import { getNavigraphGwtResult, refreshNavigraphToken } from '~/utils/backend/navigraph';

export async function findUserByCookie(event: H3Event): Promise<RequiredDBUser | null> {
    const cookie = getCookie(event, 'access-token');

    const token = await prisma.userToken.findFirst({
        select: {
            user: true,
        },
        where: {
            accessToken: cookie ?? '',
            accessTokenExpire: {
                gte: new Date(),
            },
        },
    });

    if (token) return token.user;
    return null;
}

export interface FullUser {
    id: number;
    hasFms: boolean | null;
    hasCharts: boolean | null;
    cid: string;
    fullName: string;
    settings: UserSettings;
}

export interface UserSettings {
    autoFollow?: boolean;
    autoZoom?: boolean;
    autoShowAirportTracks?: boolean;
    headerName?: string;
}

export async function findAndRefreshFullUserByCookie(event: H3Event): Promise<FullUser | null> {
    const cookie = getCookie(event, 'access-token');

    const token = await prisma.userToken.findFirst({
        select: {
            id: true,
            user: {
                select: {
                    id: true,
                    settings: true,
                    navigraph: {
                        select: {
                            accessToken: true,
                            accessTokenExpire: true,
                            refreshToken: true,
                            hasFms: true,
                            hasCharts: true,
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
            accessToken: cookie ?? '',
        },
    });

    if (token) {
        if (token.accessTokenExpire.getTime() < Date.now()) {
            await getDBUserToken(event, token.user, token);
        }

        if (token.user.navigraph && token.user.navigraph.accessTokenExpire.getTime() < Date.now()) {
            try {
                const refreshedToken = await refreshNavigraphToken(token.user.navigraph.refreshToken);
                const jwt = await getNavigraphGwtResult(refreshedToken.access_token);

                const hasFms = !!jwt.subscriptions?.includes('fmsdata');
                const hasCharts = !!jwt.subscriptions?.includes('charts');
                await prisma.navigraphUser.update({
                    where: {
                        userId: token.user.id,
                    },
                    data: {
                        accessToken: refreshedToken.access_token,
                        accessTokenExpire: new Date(Date.now() + (refreshedToken.expires_in * 1000)),
                        refreshToken: refreshedToken.refresh_token,
                        hasFms,
                        hasCharts,
                    },
                });
                token.user.navigraph.hasFms = hasFms;
                token.user.navigraph.hasCharts = hasCharts;
            }
            catch (e) {
                await prisma.navigraphUser.delete({
                    where: {
                        userId: token.user.id,
                    },
                });
                token.user.navigraph = null;
            }
        }

        return {
            id: token.user.id,
            hasFms: token.user.navigraph?.hasFms ?? null,
            hasCharts: token.user.navigraph?.hasCharts ?? null,
            cid: token.user.vatsim!.id,
            fullName: token.user.vatsim!.fullName,
            settings: (typeof token.user.settings === 'object' ? token.user.settings : JSON.parse(token.user.settings as string)) as UserSettings,
        };
    }
    return null;
}
