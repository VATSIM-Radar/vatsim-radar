import type { H3Event } from 'h3';
import { freezeH3Request, handleH3Error, handleH3Exception, unfreezeH3Request } from '~/utils/backend/h3';
import { findUserByCookie } from '~/utils/backend/user';
import type { UserTrackingList } from '@prisma/client';
import { prisma } from '~/utils/backend/prisma';
import { UserTrackingListType } from '@prisma/client';
import { isObject, MAX_LISTS_USERS, MAX_USER_LISTS } from '~/utils/shared';
import { colorsList } from '~/utils/backend/styles';
import type {
    VatsimShortenedAircraft,
    VatsimShortenedController, VatsimShortenedData,
    VatsimShortenedPrefile,
} from '~/types/data/vatsim';
import { validateColor, validateRandomObjectKeys } from '~/utils/backend/handlers/index';

export interface UserList {
    id: number;
    name: string;
    color: string;
    type: UserTrackingListType;
    showInMenu: boolean;
    users: UserListUser[];
}

export interface UserListUser {
    name: string;
    cid: number;
    comment?: string;
    listName?: string;
}

export interface UserListLiveUserPilot extends UserListUser {
    type: 'pilot';
    sharedPilots: Array<UserListUser & {
        data: VatsimShortenedData['observers'][0];
    }>;
    data: VatsimShortenedAircraft;
}

export interface UserListLiveUserPrefile extends UserListUser {
    type: 'prefile';
    data: VatsimShortenedPrefile;
}

export interface UserListLiveUserController extends UserListUser {
    type: 'atc';
    data: VatsimShortenedController;
}

export interface UserListLiveUserSup extends UserListUser {
    type: 'sup';
    data: VatsimShortenedController;
}

export interface UserListLiveUserOffline extends UserListUser {
    type: 'offline';
    data?: undefined;
}

export type UserListLiveUser = UserListLiveUserPilot | UserListLiveUserPrefile | UserListLiveUserController | UserListLiveUserOffline | UserListLiveUserSup;

export type UserListLive = Omit<UserList, 'users'> & { users: UserListLiveUser[] };

export async function handleListsEvent(event: H3Event) {
    let userId: number | undefined;

    try {
        const user = await findUserByCookie(event);

        if (!user) {
            return handleH3Error({
                event,
                statusCode: 401,
            });
        }

        userId = user.id;
        if (await freezeH3Request(event, user.id) !== true) return;

        const id = getRouterParam(event, 'id');

        if (id && event.method !== 'GET' && event.method !== 'PUT' && event.method !== 'DELETE') {
            return handleH3Error({
                event,
                statusCode: 400,
                data: 'Only PUT, DELETE and GET are allowed when using id',
            });
        }
        else if (!id && event.method !== 'GET' && event.method !== 'POST') {
            return handleH3Error({
                event,
                statusCode: 400,
                data: 'Only POST is allowed when not using id',
            });
        }

        const lists = await prisma.userTrackingList.findMany({
            where: {
                userId: user.id,
            },
        });

        let list: UserTrackingList | null = null;

        if (id) {
            list = lists.find(x => x.id === +id) ?? null;

            if (!list) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: 'This list was not found for your user ID',
                });
            }
        }

        let type: UserTrackingListType = list?.type ?? UserTrackingListType.OTHER;

        if (event.method === 'POST' || event.method === 'PUT') {
            const body = await readBody<Partial<UserTrackingList>>(event);
            if (!body) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: 'You must pass body to this route',
                });
            }

            if (body.type === UserTrackingListType.FRIENDS) type = UserTrackingListType.FRIENDS;

            if (type === UserTrackingListType.FRIENDS && lists.some(x => x.type === UserTrackingListType.FRIENDS && x.id !== list?.id)) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: 'Only one list with type friends is possible',
                });
            }

            if (!body.name && !list) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: 'Name is required when creating list',
                });
            }

            if (typeof body.showInMenu !== 'boolean' && !list) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: 'showInMenu is required when creating list',
                });
            }

            if ('showInMenu' in body && typeof body.showInMenu !== 'boolean') {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: 'showInMenu must be of type boolean',
                });
            }

            if (!body.color && !list) {
                if (type !== UserTrackingListType.FRIENDS) {
                    return handleH3Error({
                        event,
                        statusCode: 400,
                        data: 'Color is required when creating list',
                    });
                }
                else body.color = colorsList.success300;
            }

            if (body.name && body.name.length > 30) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: 'Max name length is 30',
                });
            }

            if (!body.users && !list) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: 'Users are required when creating list',
                });
            }

            if (body.users) {
                if (!Array.isArray(body.users)) {
                    return handleH3Error({
                        event,
                        statusCode: 400,
                        data: 'Users must be an array',
                    });
                }

                if (body.users.length > MAX_LISTS_USERS) {
                    return handleH3Error({
                        event,
                        statusCode: 400,
                        data: `Users count cannot extend ${ MAX_LISTS_USERS }`,
                    });
                }

                for (const user of body.users) {
                    if (!isObject(user) || !validateRandomObjectKeys(user, ['name', 'cid', 'comment'])) {
                        return handleH3Error({
                            event,
                            statusCode: 400,
                            data: `Users validation failed`,
                        });
                    }

                    if (typeof user.name !== 'string' || user.name.length > 50) {
                        return handleH3Error({
                            event,
                            statusCode: 400,
                            data: 'Max user name length is 50',
                        });
                    }

                    if (user.comment !== undefined && (typeof user.comment !== 'string' || user.comment.length > 200)) {
                        return handleH3Error({
                            event,
                            statusCode: 400,
                            data: 'Max user comment length is 200',
                        });
                    }

                    if (typeof user.cid !== 'number' || user.cid.toString().length > 15) {
                        return handleH3Error({
                            event,
                            statusCode: 400,
                            data: 'Max user cid length is 15. How did you even get this number? Huh?',
                        });
                    }

                    user.cid = parseInt(user.cid.toString(), 10);
                }

                body.users = body.users.filter((user: any, index) => !(body.users as any[]).some((y: any, yIndex) => yIndex > index && y.cid === user.cid));
            }

            if (body.name) {
                const duplicatedList = lists.find(x => (!id || x.id !== +id) && x.name.toLowerCase().trim() === body.name?.toLowerCase().trim());

                if (duplicatedList) {
                    if (getQuery(event).force === '1') {
                        await prisma.userPreset.delete({
                            where: {
                                id: duplicatedList.id,
                            },
                        });
                    }
                    else {
                        return handleH3Error({
                            event,
                            statusCode: 409,
                            data: 'A list with this name already exists',
                        });
                    }
                }
            }

            if (body.color) {
                if (!validateColor(body.color, true)) {
                    return handleH3Error({
                        event,
                        statusCode: 409,
                        data: 'Invalid list color',
                    });
                }
            }

            if (list) {
                await prisma.userTrackingList.update({
                    where: {
                        id: list.id,
                    },
                    data: {
                        name: body.name ?? list.name,
                        users: (body.users ?? list.users ?? undefined),
                        color: body.color ?? list.color,
                        type,
                        showInMenu: body.showInMenu ?? list.showInMenu,
                    },
                });
            }
            else {
                const userPresets = await prisma.userTrackingList.count({
                    where: {
                        userId: user.id,
                    },
                });

                if (userPresets > MAX_USER_LISTS) {
                    return handleH3Error({
                        event,
                        statusCode: 400,
                        data: 'Only 5 lists are allowed',
                    });
                }

                await prisma.userTrackingList.create({
                    data: {
                        name: body.name!,
                        users: body.users!,
                        color: body.color!,
                        type,
                        userId: user.id,
                        showInMenu: body.showInMenu,
                    },
                });
            }

            return {
                status: 'ok',
            };
        }
        else if (event.method === 'DELETE' && list) {
            await prisma.userTrackingList.delete({
                where: {
                    id: list.id,
                },
            });

            return {
                status: 'ok',
            };
        }
        else if (event.method === 'GET') {
            if (id) {
                return list;
            }
            else {
                return lists;
            }
        }
        else {
            return handleH3Error({
                event,
                statusCode: 400,
                data: 'Incorrect method received',
            });
        }
    }
    catch (e) {
        return handleH3Exception(event, e);
    }
    finally {
        if (userId) {
            unfreezeH3Request(userId);
        }
    }
}
