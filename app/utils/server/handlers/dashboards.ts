import type { H3Event } from 'h3';
import type { Dashboard } from '#prisma';
import { safeParse } from 'valibot';
import { findUserByCookie } from '~/utils/server/user';
import { freezeH3Request, handleH3Error, handleH3Exception, unfreezeH3Request } from '~/utils/server/h3';
import { prisma } from '~/utils/server/prisma';
import { MAX_DASHBOARDS } from '~/utils/shared';
import { radarStorage } from '~/utils/server/storage';
import { DashboardSettingsSchema } from '~/utils/shared/dashboard';
import type { DashboardSettings } from '~/utils/shared/dashboard';

export type UserDashboard = Omit<Dashboard, 'json'> & {
    json: DashboardSettings;
};

export type PublicDashboard = Omit<UserDashboard, 'userId'> & {
    owner: boolean;
};

type ValidateResult =
    | { error: string }
    | { settings: DashboardSettings };

function validateDashboardSettings(json: unknown): ValidateResult {
    const parsed = safeParse(DashboardSettingsSchema, json);

    if (!parsed.success) {
        return { error: parsed.issues[0]?.message ?? 'Invalid dashboard settings' };
    }

    const realIcao = radarStorage.vatspy?.data?.keyAirports.realIcao;

    for (const airport of parsed.output.airports) {
        if (!realIcao?.[airport.icao]) {
            return { error: `Unknown airport ICAO: ${ airport.icao }` };
        }
    }

    return { settings: parsed.output };
}

export async function handleDashboardsEvent(event: H3Event) {
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

        const dashboards = (!user && isValidate)
            ? []
            : await prisma.dashboard.findMany({
                where: {
                    userId: user!.id,
                },
                orderBy: [
                    {
                        createdAt: 'asc',
                    },
                    {
                        id: 'asc',
                    },
                ],
            });

        let dashboard: Dashboard | null = null;

        if (id) {
            dashboard = dashboards.find(x => x.id === +id) ?? null;

            if (!dashboard) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: 'This dashboard was not found for your user ID',
                });
            }
        }

        if (event.method === 'POST' || event.method === 'PUT') {
            const body = await readBody<Partial<Dashboard>>(event);
            if (!body) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: 'You must pass body to this route',
                });
            }

            if (!body.name && !dashboard && !isValidate) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: 'Name is required when creating a dashboard',
                });
            }

            if (body.name && body.name.trim().length > 50) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: 'Max name length is 50',
                });
            }

            if (!body.json && !dashboard) {
                return handleH3Error({
                    event,
                    statusCode: 400,
                    data: 'Json is required when creating a dashboard',
                });
            }

            let jsonToStore: Record<string, any> | undefined;

            if (body.json) {
                const result = validateDashboardSettings(body.json);

                if ('error' in result) {
                    return handleH3Error({
                        event,
                        statusCode: 400,
                        data: result.error,
                    });
                }

                jsonToStore = result.settings as Record<string, any>;
            }

            if (body.name) {
                const duplicatedDashboard = dashboards.find(x => x.id !== dashboard?.id && x.name.toLowerCase().trim() === body.name?.toLowerCase().trim());

                if (duplicatedDashboard) {
                    if (getQuery(event).force === '1') {
                        await prisma.dashboard.delete({
                            where: {
                                id: duplicatedDashboard.id,
                            },
                        });
                    }
                    else {
                        return handleH3Error({
                            event,
                            statusCode: 409,
                            data: 'A dashboard with this name already exists',
                        });
                    }
                }
            }

            if (isValidate) {
                return {
                    status: 'ok',
                };
            }

            if (dashboard) {
                await prisma.dashboard.update({
                    where: {
                        id: dashboard.id,
                    },
                    data: {
                        name: body.name?.trim() ?? dashboard.name,
                        public: body.public ?? dashboard.public,
                        json: jsonToStore ?? (dashboard.json as Record<string, any>),
                    },
                });

                return {
                    id: dashboard.id,
                };
            }
            else {
                const userDashboards = await prisma.dashboard.count({
                    where: {
                        userId: user!.id,
                    },
                });

                if (userDashboards >= MAX_DASHBOARDS) {
                    return handleH3Error({
                        event,
                        statusCode: 400,
                        data: `Only ${ MAX_DASHBOARDS } dashboards are allowed`,
                    });
                }

                const created = await prisma.dashboard.create({
                    data: {
                        userId: user!.id,
                        name: (body.name as string).trim(),
                        public: body.public ?? false,
                        json: jsonToStore!,
                    },
                    select: {
                        id: true,
                    },
                });

                return {
                    id: created.id,
                };
            }
        }
        else if (event.method === 'DELETE' && dashboard) {
            await prisma.dashboard.delete({
                where: {
                    id: dashboard.id,
                },
            });

            return {
                status: 'ok',
            };
        }
        else if (event.method === 'GET') {
            if (id) {
                return dashboard;
            }
            else {
                return dashboards;
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

// Public endpoint for a single dashboard: returns it if it is public or the requester is its
// author, otherwise 403. Auth-aware via cookie so authors can preview their own private boards.
export async function handlePublicDashboardEvent(event: H3Event) {
    const id = getRouterParam(event, 'id');

    if (!id || isNaN(+id)) {
        return handleH3Error({
            event,
            statusCode: 400,
            data: 'Invalid dashboard id',
        });
    }

    try {
        const dashboard = await prisma.dashboard.findUnique({
            where: {
                id: +id,
            },
        });

        if (!dashboard) {
            return handleH3Error({
                event,
                statusCode: 404,
                data: 'Dashboard not found',
            });
        }

        const user = await findUserByCookie(event);
        const owner = !!user && dashboard.userId === user.id;

        if (!dashboard.public && !owner) {
            return handleH3Error({
                event,
                statusCode: 403,
                data: 'This dashboard is private',
            });
        }

        return {
            id: dashboard.id,
            name: dashboard.name,
            public: dashboard.public,
            createdAt: dashboard.createdAt,
            json: dashboard.json as DashboardSettings,
            owner,
        } satisfies PublicDashboard;
    }
    catch (e) {
        return handleH3Exception(event, e);
    }
}
