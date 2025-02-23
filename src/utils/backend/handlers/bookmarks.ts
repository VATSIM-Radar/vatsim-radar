import type { UserPreset } from '@prisma/client';
import type { H3Event } from 'h3';
import { findUserByCookie } from '~/utils/backend/user';
import { freezeH3Request, handleH3Error, handleH3Exception, unfreezeH3Request } from '~/utils/backend/h3';
import { prisma } from '~/utils/backend/prisma';
import { UserPresetType } from '@prisma/client';
import { isObject, MAX_BOOKMARKS } from '~/utils/shared';
import { radarStorage } from '~/utils/backend/storage';
import { validateRandomObjectKeys } from '~/utils/backend/handlers/index';
import type { Coordinate } from 'ol/coordinate';

export interface IUserBookmark {
    coords?: Coordinate;
    zoom?: number;
    icao?: string;
    binding?: {
        code: string;
        keys?: Partial<{
            ctrl: boolean;
            alt: boolean;
            shift: boolean;
            meta: boolean;
        }>;
    };
}

export type UserBookmark = Partial<IUserBookmark>;

export type UserBookmarkPreset = UserPreset & {
    json: UserBookmark;
};

const validators = async (): Promise<Record<keyof IUserBookmark, (val: unknown) => boolean>> => {
    const vatspy = (await radarStorage.vatspy())?.data;

    return {
        coords: val => {
            return Array.isArray(val) && val.length === 2 && val.every(x => typeof x === 'number' && x.toString().length < 50);
        },
        zoom: val => {
            return typeof val === 'number' && val > 0 && val < 50;
        },
        icao: val => {
            return typeof val === 'string' && !!vatspy?.keyAirports.realIcao[val];
        },
        binding: val => {
            if (!isObject(val)) return false;
            if (!validateRandomObjectKeys(val, ['code', 'keys'])) return false;

            if (!('code' in val) || typeof val.code !== 'string' || val.code.length === 0 || val.code.length > 100) return false;

            if ('keys' in val) {
                if (!isObject(val.keys)) return false;
                if (!validateRandomObjectKeys(val.keys, ['alt', 'ctrl', 'shift', 'meta'])) return false;
                if (!Object.values(val.keys).every(x => typeof x === 'boolean')) return false;
            }

            return true;
        },
    };
};

export async function handleBookmarksEvent(event: H3Event) {
    let userId: number | undefined;

    const id = getRouterParam(event, 'id');

    try {
        const user = await findUserByCookie(event);

        if (!user && id && event.method !== 'GET') {
            return handleH3Error({
                event,
                statusCode: 401,
            });
        }

        userId = user?.id;
        if (user && await freezeH3Request(event, user.id) !== true) return;

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

        if (event.method === 'GET' && id) {
            const preset = await prisma.userPreset.findFirst({
                where: {
                    id: +id!,
                    type: UserPresetType.BOOKMARK,
                },
            });

            if (!preset) {
                return handleH3Error({
                    event,
                    statusCode: 404,
                    data: 'Preset not found',
                });
            }

            return {
                id: preset.id,
                json: preset.json,
            };
        }

        if (!user) {
            return handleH3Error({
                event,
                statusCode: 401,
            });
        }

        const bookmarks = await prisma.userPreset.findMany({
            where: {
                userId: user.id,
                type: UserPresetType.BOOKMARK,
            },
        });

        let bookmark: UserPreset | null = null;

        if (id) {
            bookmark = bookmarks.find(x => x.id === +id) ?? null;

            if (!bookmark) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: 'This preset was not found for your user ID',
                });
            }
        }

        if (event.method === 'POST' || event.method === 'PUT') {
            const body = await readBody<Partial<UserPreset>>(event);
            if (!body) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: 'You must pass body to this route',
                });
            }

            if (!body.name && !bookmark) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: 'Name is required when creating settings',
                });
            }

            if (body.name && body.name.length > 30) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: 'Max name length is 30',
                });
            }

            if (!body.json && !bookmark) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: 'Json is required when creating settings',
                });
            }

            if (body.json) {
                body.json = body.json as Record<string, any>;

                const initValidators = await validators();

                for (const [key, value] of Object.entries(body.json) as [keyof IUserBookmark, unknown][]) {
                    if (!(key in initValidators)) {
                        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                        delete body.json[key];

                        continue;
                    }

                    if (!initValidators[key](value)) {
                        return handleH3Error({
                            event,
                            statusCode: 400,
                            data: `${ key } validation has failed`,
                        });
                    }
                }
            }

            if (body.name) {
                const duplicatedPreset = bookmarks.find(x => x.name.toLowerCase().trim() === body.name?.toLowerCase().trim());

                if (duplicatedPreset) {
                    if (getQuery(event).force === '1') {
                        await prisma.userPreset.delete({
                            where: {
                                id: duplicatedPreset.id,
                            },
                        });
                    }
                    else {
                        return handleH3Error({
                            event,
                            statusCode: 409,
                            data: 'A bookmark with this name already exists',
                        });
                    }
                }
            }

            if (bookmark) {
                await prisma.userPreset.update({
                    where: {
                        id: bookmark.id,
                    },
                    data: {
                        name: body.name ?? bookmark.name,
                        json: (body.json ?? bookmark.json ?? undefined),
                    },
                });
            }
            else {
                const userPresets = await prisma.userPreset.count({
                    where: {
                        userId: user.id,
                        type: UserPresetType.BOOKMARK,
                    },
                });

                if (userPresets > MAX_BOOKMARKS) {
                    return handleH3Error({
                        event,
                        statusCode: 400,
                        data: `Only ${ MAX_BOOKMARKS } filters presets are allowed`,
                    });
                }

                await prisma.userPreset.create({
                    data: {
                        userId: user.id,
                        type: UserPresetType.BOOKMARK,
                        name: body.name as string,
                        json: body.json!,
                    },
                });
            }

            return body.json ?? {
                status: 'ok',
            };
        }
        else if (event.method === 'DELETE' && bookmark) {
            await prisma.userPreset.delete({
                where: {
                    id: bookmark.id,
                },
            });

            return {
                status: 'ok',
            };
        }
        else if (event.method === 'GET') {
            if (id) {
                return bookmark;
            }
            else {
                return bookmarks;
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
