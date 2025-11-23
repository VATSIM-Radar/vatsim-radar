import { prisma } from './prisma';
import { getCookie } from 'h3';
import type { H3Event } from 'h3';
import { getDBUserToken } from '~/utils/db/user';
import type { RequiredDBUser } from '~/utils/db/user';
import { getNavigraphGwtResult, refreshNavigraphToken } from '~/utils/backend/navigraph';
import { handleH3Error } from '~/utils/backend/h3';
import type { UserList } from '~/utils/backend/handlers/lists';
import type { UserTrackingList } from '#prisma';
import { isNext } from '~/utils/backend/debug';

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

export async function findUserWithListsByCookie(event: H3Event) {
    const cookie = getCookie(event, 'access-token');

    const token = await prisma.userToken.findFirst({
        select: {
            user: {
                include: {
                    lists: true,
                },
            },
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
    discordId: string | null;
    lists: UserList[];
    privateMode: boolean;
    privateUntil: string | null;
    isSup: boolean;
}

export interface UserSettings {
    autoFollow?: boolean;
    autoZoom?: boolean;
    timeFormat?: '24h' | '12h';
    autoShowAirportTracks?: boolean;
    toggleAircraftOverlays?: boolean;
    showFullRoute?: boolean;
    headerName?: string;
    seenVersion?: string;
    favoriteSort?: 'newest' | 'oldest' | 'abcAsc' | 'abcDesc' | 'cidAsc' | 'cidDesc';
}

export async function findAndRefreshFullUserByCookie(event: H3Event, refresh = true): Promise<FullUser | null> {
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
                    discordId: true,
                    lists: true,
                    privateMode: true,
                    privateUntil: true,
                    isSup: true,
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
            if (refresh) {
                await getDBUserToken(event, token.user, token);
            }
            else {
                handleH3Error({
                    event,
                    statusCode: 401,
                });

                return null;
            }
        }

        if (token.user.navigraph && token.user.navigraph.accessTokenExpire.getTime() < Date.now() && refresh) {
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
            catch {
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
            discordId: token.user.discordId,
            privateMode: token.user.privateMode,
            privateUntil: token.user.privateUntil ? token.user.privateUntil.toISOString() : token.user.privateUntil,
            isSup: token.user.isSup,
            lists: await filterUserLists(token.user.lists as unknown as UserList[]),
        };
    }
    return null;
}

export async function filterUserLists(_lists: Array<UserTrackingList | UserList>): Promise<UserList[]> {
    const lists = _lists as UserList[];

    const dbUsers = (await prisma.user.findMany({
        where: {
            vatsim: {
                id: {
                    in: lists.flatMap(x => x.users.map(x => x.cid.toString())),
                },
            },
        },
        select: {
            privateMode: true,
            vatsim: {
                select: {
                    id: true,
                },
            },
        },
    })).filter(x => x.privateMode).map(x => x.vatsim!.id);

    for (const list of lists) {
        for (const user of list.users) {
            if (dbUsers.includes(user.cid.toString())) user.private = true;

            if (!user.private && isNext()) {
                const request = await $fetch<{ isPrivate: boolean }>(`https://vatsim-radar.com/api/user/lists/privacy/${ user.cid }`).catch(() => {});
                if (request?.isPrivate) user.private = true;
            }
        }
    }

    return lists;
}
