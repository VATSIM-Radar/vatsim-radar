import type { UserPreset, UserTrackingList } from '@prisma/client';
import type { UserMapSettingsColor } from '~/utils/backend/handlers/map-settings';
import type { H3Event } from 'h3';
import { findUserWithListsByCookie } from '~/utils/backend/user';
import { freezeH3Request, handleH3Error, handleH3Exception, unfreezeH3Request } from '~/utils/backend/h3';
import { prisma } from '~/utils/backend/prisma';
import { UserPresetType } from '@prisma/client';
import { isNumber, isObject, MAX_FILTER_ARRAY_VALUE, MAX_FILTERS, parseFilterAltitude } from '~/utils/shared';
import { radarStorage } from '~/utils/backend/storage';
import { validateColor, validateRandomObjectKeys, validateTransparency } from '~/utils/backend/handlers/index';

export interface IUserFilterOthers {
    othersOpacity?: number;
    ourColor?: UserMapSettingsColor;
}

export interface IUserFilter {
    users: Partial<{
        pilots: {
            type?: 'prefix' | 'include';
            value?: string[];
        };
        atc: IUserFilter['users']['pilots'];
        lists: number[];
        cids: number[];
        strategy: 'and' | 'or';
    }>;
    airports: Partial<{
        departure: string[];
        arrival: string[];
        departurePrefix: string[];
        arrivalPrefix: string[];
        routes: string[];
    }>;
    atc: Partial<{
        ratings: number[];
        facilities: number[];
    }>;
    flights: Partial<{
        status: 'all' | 'departing' | 'airborne' | 'arrived';
        aircraft: string[];
        type: 'all' | 'domestic' | 'international';
        excludeNoFlightPlan: boolean;
        squawks: string[];
        ratings: number[];
        altitude: string[];
    }>;
    others: 'hide' | IUserFilterOthers;
    invert: boolean;
}

export type UserFilter = Partial<IUserFilter>;

export type UserFilterPreset = UserPreset & {
    json: UserFilter;
};

const allowedStatuses: IUserFilter['flights']['status'][] = ['all', 'departing', 'airborne', 'arrived'];
const allowedTypes: IUserFilter['flights']['type'][] = ['all', 'domestic', 'international'];

function validateCallsignFilter(val: unknown): boolean {
    if (!isObject(val)) return false;
    if (!validateRandomObjectKeys(val, ['type', 'value'])) return false;
    if ('type' in val && (typeof val.type !== 'string' || !['prefix', 'include'].includes(val.type))) return false;
    if ('value' in val && (!Array.isArray(val.value) || val.value.length > MAX_FILTER_ARRAY_VALUE || val.value.some(x => typeof x !== 'string' || x.length > 30))) return false;

    return true;
}

const initValidators = (lists: UserTrackingList[] = []): Record<keyof IUserFilter, (val: unknown) => boolean> => {
    return {
        users: val => {
            if (!isObject(val)) return false;
            if (!validateRandomObjectKeys(val, ['pilots', 'atc', 'lists', 'cids', 'strategy'])) return false;

            if ('pilots' in val && !validateCallsignFilter(val.pilots)) return false;
            if ('atc' in val && !validateCallsignFilter(val.atc)) return false;
            if ('lists' in val) {
                if (!Array.isArray(val.lists)) {
                    return false;
                }

                val.lists = val.lists.filter(x => lists.some(y => y.id === x));
            }
            if ('cids' in val &&
                (
                    !Array.isArray(val.cids) ||
                    !val.cids.every(x => isNumber(x) && x > 0 && x < 999999999999999) ||
                    val.cids.length > MAX_FILTER_ARRAY_VALUE
                )
            ) return false;

            if ('strategy' in val && (typeof val.strategy !== 'string' || !['and', 'or'].includes(val.strategy))) return false;

            return true;
        },
        airports: val => {
            if (!isObject(val)) return false;
            if (!validateRandomObjectKeys(val, ['departure', 'arrival', 'departurePrefix', 'arrivalPrefix', 'routes'])) return false;

            if ('departure' in val && (!Array.isArray(val.departure) || val.departure.length > MAX_FILTER_ARRAY_VALUE || !val.departure.every(x => radarStorage.vatspy.data?.keyAirports.realIcao[x]))) return false;
            if ('arrival' in val && (!Array.isArray(val.arrival) || val.arrival.length > MAX_FILTER_ARRAY_VALUE || !val.arrival.every(x => radarStorage.vatspy.data?.keyAirports.realIcao[x]))) return false;
            if ('departurePrefix' in val && (!Array.isArray(val.departurePrefix) || val.departurePrefix.length > MAX_FILTER_ARRAY_VALUE || !val.departurePrefix.every(x => typeof x === 'string' && x.length > 0 && x.length <= 30))) return false;
            if ('arrivalPrefix' in val && (!Array.isArray(val.arrivalPrefix) || val.arrivalPrefix.length > MAX_FILTER_ARRAY_VALUE || !val.arrivalPrefix.every(x => typeof x === 'string' && x.length > 0 && x.length <= 30))) return false;
            if ('routes' in val && (!Array.isArray(val.routes) || val.routes.length > MAX_FILTER_ARRAY_VALUE || !val.routes.every(x => {
                if (typeof x !== 'string') return false;

                const split = x.split('-');
                return split.length === 2 && split.every(x => radarStorage.vatspy.data?.keyAirports.realIcao[x]);
            }))) return false;

            return true;
        },
        atc: val => {
            if (!isObject(val)) return false;
            if (!validateRandomObjectKeys(val, ['ratings', 'facilities'])) return false;

            if ('ratings' in val && (!Array.isArray(val.ratings) || val.ratings.length > MAX_FILTER_ARRAY_VALUE || !val.ratings.every(x => isNumber(x) && x < 1000 && x > 0))) return false;
            if ('facilities' in val && (!Array.isArray(val.facilities) || val.facilities.length > MAX_FILTER_ARRAY_VALUE || !val.facilities.every(x => isNumber(x) && x < 1000 && x > 0))) return false;

            return true;
        },
        flights: val => {
            if (!isObject(val)) return false;
            if (!validateRandomObjectKeys(val, ['status', 'aircraft', 'type', 'excludeNoFlightPlan', 'squawks', 'ratings', 'altitude'])) return false;

            if ('status' in val && val.status !== allowedStatuses) return false;
            if ('aircraft' in val && (!Array.isArray(val.aircraft) || val.aircraft.length > MAX_FILTER_ARRAY_VALUE || !val.aircraft.every(x => typeof x === 'string' && x.length > 0 && x.length < 50))) return false;
            if ('type' in val && val.type !== allowedTypes) return false;
            if ('squawks' in val && (!Array.isArray(val.squawks) || val.squawks.length > MAX_FILTER_ARRAY_VALUE || !val.squawks.every(x => typeof x === 'string' && x.length === 4))) return false;
            if ('ratings' in val && (!Array.isArray(val.ratings) || val.ratings.length > MAX_FILTER_ARRAY_VALUE || !val.ratings.every(x => isNumber(x) && x < 1000 && x > 0))) return false;
            if ('altitude' in val && (!Array.isArray(val.altitude) || val.altitude.length > MAX_FILTER_ARRAY_VALUE || !val.altitude.every(x => typeof x === 'string' && parseFilterAltitude(x).length > 0))) return false;
            if ('excludeNoFlightPlan' in val && typeof val.excludeNoFlightPlan !== 'boolean') return false;

            return true;
        },
        others: val => {
            if (isObject(val)) {
                if (!validateRandomObjectKeys(val, ['othersOpacity', 'ourColor'])) return false;

                if ('othersOpacity' in val) {
                    const validatedTransparency = validateTransparency(val.othersOpacity);
                    if (typeof validatedTransparency === 'number') val.othersOpacity = validatedTransparency;
                    else return false;
                }

                if ('ourColor' in val && !validateColor(val.ourColor)) return false;

                return true;
            }
            else return val === 'hide';
        },
        invert: val => {
            return typeof val === 'boolean';
        },
    };
};

export async function handleFiltersEvent(event: H3Event) {
    let userId: number | undefined;

    const isValidate = event.path.endsWith('validate');
    const id = getRouterParam(event, 'id');

    try {
        const user = await findUserWithListsByCookie(event);

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

        if (id && event.method === 'GET') {
            const preset = await prisma.userPreset.findFirst({
                where: {
                    id: +id!,
                    type: UserPresetType.FILTER,
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

        const filters = (await prisma.userPreset.findMany({
            where: {
                userId: user.id,
                type: UserPresetType.FILTER,
            },
            include: {
                lists: true,
            },
        })).map(x => {
            const json = x.json as UserFilter;
            if (json.users?.lists) {
                json.users.lists = x.lists.map(x => x.listId);
            }

            return x;
        });

        let filter: typeof filters[0] | null = null;

        if (id) {
            filter = filters.find(x => x.id === +id) ?? null;

            if (!filter) {
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

            if (!body.name && !filter && !isValidate) {
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

            if (!body.json && !filter) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: 'Json is required when creating settings',
                });
            }

            if (body.json) {
                body.json = body.json as Record<string, any>;

                const validators = initValidators(user.lists);

                for (const [key, value] of Object.entries(body.json) as [keyof IUserFilter, unknown][]) {
                    if (!(key in validators)) {
                        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                        delete body.json[key];

                        continue;
                    }

                    if (!validators[key](value)) {
                        return handleH3Error({
                            event,
                            statusCode: 400,
                            data: `${ key } validation has failed`,
                        });
                    }
                }
            }

            if (body.name) {
                const duplicatedPreset = filters.find(x => x.name.toLowerCase().trim() === body.name?.toLowerCase().trim());

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
                            data: 'A preset with this name already exists',
                        });
                    }
                }
            }

            if (isValidate) {
                return {
                    status: 'ok',
                };
            }

            if (filter) {
                await prisma.userPreset.update({
                    where: {
                        id: filter.id,
                    },
                    data: {
                        name: body.name ?? filter.name,
                        json: (body.json ?? filter.json ?? undefined),
                    },
                });

                const lists = (body.json as UserFilter)?.users?.lists;

                if (lists && filter) {
                    const toDelete: number[] = [];
                    const toAdd: number[] = [];

                    for (const list of lists) {
                        if (!filter.lists.some(x => x.listId === list)) toAdd.push(list);
                    }

                    for (const list of filter.lists) {
                        if (!lists.some(x => x === list.listId)) toDelete.push(list.listId);
                    }

                    if (toAdd.length) {
                        await prisma.userPresetList.createMany({
                            data: toAdd.map(x => ({
                                listId: x,
                                presetId: filter.id,
                            })),
                        });
                    }

                    if (toDelete.length) {
                        await prisma.userPresetList.deleteMany({
                            where: {
                                OR: toDelete.map(x => ({
                                    listId: x,
                                    presetId: filter.id,
                                })),
                            },
                        });
                    }
                }
            }
            else {
                const userPresets = await prisma.userPreset.count({
                    where: {
                        userId: user.id,
                        type: UserPresetType.FILTER,
                    },
                });

                if (userPresets > MAX_FILTERS) {
                    return handleH3Error({
                        event,
                        statusCode: 400,
                        data: `Only ${ MAX_FILTERS } filters presets are allowed`,
                    });
                }

                const result = await prisma.userPreset.create({
                    data: {
                        userId: user.id,
                        type: UserPresetType.FILTER,
                        name: body.name as string,
                        json: body.json!,
                    },
                    select: {
                        id: true,
                    },
                });

                const lists = (body.json as UserFilter)?.users?.lists;
                if (lists?.length) {
                    await prisma.userPresetList.createMany({
                        data: lists.map(x => ({
                            listId: x,
                            presetId: result.id,
                        })),
                    });
                }
            }

            return body.json ?? {
                status: 'ok',
            };
        }
        else if (event.method === 'DELETE' && filter) {
            await prisma.userPreset.delete({
                where: {
                    id: filter.id,
                },
            });

            return {
                status: 'ok',
            };
        }
        else if (event.method === 'GET') {
            if (id) {
                return filter;
            }
            else {
                return filters;
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
