import type { H3Event } from 'h3';
import { findUserByCookie } from '~/utils/server/user';
import { freezeH3Request, handleH3Error, handleH3Exception, unfreezeH3Request } from '~/utils/server/h3';
import { prisma } from '~/utils/server/prisma';
import { MAX_SETTINGS_PRESETS } from '~/utils/shared';
import type { UserPreset } from '#prisma';
import { UserPresetType } from '#prisma';
import { validateSettings } from '~/utils/settings/validate';
import { migrateV1Settings } from '~/utils/settings/migration';

export async function handleSettingsEvent(event: H3Event) {
    let userId: number | undefined;

    const isValidate = event.path.endsWith('validate');

    try {
        const user = await findUserByCookie(event);

        if (!user && !isValidate) {
            return handleH3Error({
                event,
                statusCode: 401,
            });
        }

        userId = user?.id;
        if (user && await freezeH3Request(event, user.id) !== true) return;

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

        const presets = (!user && isValidate)
            ? []
            : await prisma.userPreset.findMany({
                where: {
                    userId: user!.id,
                    type: UserPresetType.MAP_SETTINGS_V2,
                },
                orderBy: [
                    {
                        order: 'asc',
                    },
                    {
                        id: 'desc',
                    },
                ],
            });

        let settings: UserPreset | null = null;

        if (id) {
            settings = presets.find(x => x.id === +id) ?? null;

            if (!settings) {
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

            if (!body.name && !settings && !isValidate) {
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

            if (!body.json && !settings) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: 'Json is required when creating settings',
                });
            }

            if (body.json) {
                body.json = body.json as Record<string, any>;

                if (!('version' in body.json)) {
                    body.json = migrateV1Settings({
                        mapSettings: body.json,
                    });
                }

                const validation = validateSettings(body.json);

                if (!validation.success) {
                    return handleH3Error({
                        event,
                        statusCode: 400,
                        data: validation.error,
                    });
                }

                body.json = validation.output as Record<string, any>;
            }

            if (body.name) {
                const duplicatedPreset = presets.find(x => x.name.toLowerCase().trim() === body.name?.toLowerCase().trim());

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

            if (settings) {
                await prisma.userPreset.update({
                    where: {
                        id: settings.id,
                    },
                    data: {
                        name: body.name ?? settings.name,
                        json: (body.json ?? settings.json ?? undefined),
                    },
                });
            }
            else {
                const userPresets = await prisma.userPreset.count({
                    where: {
                        userId: user!.id,
                        type: UserPresetType.MAP_SETTINGS_V2,
                    },
                });

                if (userPresets >= MAX_SETTINGS_PRESETS) {
                    return handleH3Error({
                        event,
                        statusCode: 400,
                        data: `Only ${ MAX_SETTINGS_PRESETS } settings presets are allowed`,
                    });
                }

                await prisma.userPreset.create({
                    data: {
                        userId: user!.id,
                        type: UserPresetType.MAP_SETTINGS_V2,
                        name: body.name as string,
                        json: body.json!,
                    },
                });
            }

            return body.json ?? {
                status: 'ok',
            };
        }
        else if (event.method === 'DELETE' && settings) {
            await prisma.userPreset.delete({
                where: {
                    id: settings.id,
                },
            });

            return {
                status: 'ok',
            };
        }
        else if (event.method === 'GET') {
            if (id) {
                return settings;
            }
            else {
                return presets;
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
            await unfreezeH3Request(userId);
        }
    }
}
