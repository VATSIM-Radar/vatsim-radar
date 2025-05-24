import { createRouter, addRoute, findRoute } from 'rou3';
import { serve } from 'srvx';
import { defaultRedis, setRedisSync, unsetRedisSync } from '~/utils/backend/redis';
import { radarStorage } from '~/utils/backend/storage';
import { processDatabase } from '~/utils/backend/navigraph/navdata';
import { initNavigraph, navigraphCurrentDb, navigraphOutdatedDb } from '~/utils/backend/navigraph/db';
import type { cycles } from '~/utils/backend/navigraph/db';
import type {
    NavDataProcedure,
    NavigraphNavData, NavigraphNavDataApproach,
    NavigraphNavDataShort,
    NavigraphNavDataStar,
} from '~/utils/backend/navigraph/navdata/types';
import { defineCronJob } from '~/utils/backend';

const navigraphData: {
    versions: typeof cycles;
    full: {
        current: NavigraphNavData | null;
        outdated: NavigraphNavData | null;
    };
    short: {
        current: NavigraphNavDataShort | null;
        outdated: NavigraphNavDataShort | null;
    };
} = {
    versions: {
        current: '',
        outdated: '',
    },
    full: {
        current: null,
        outdated: null,
    },
    short: {
        current: null,
        outdated: null,
    },
};

unsetRedisSync('navigraph-ready');
defaultRedis.publish('update', 'navigraph-data');

async function updateNavigraph() {
    try {
        if (navigraphData.versions.current !== radarStorage.navigraph.current || navigraphData.versions.outdated !== radarStorage.navigraph.outdated || process.env.NODE_ENV === 'development') {
            const current = await processDatabase(navigraphCurrentDb!);
            const outdated = await processDatabase(navigraphOutdatedDb!);

            navigraphData.versions = radarStorage.navigraph;

            navigraphData.full.current = current.full;
            navigraphData.short.current = current.short;

            navigraphData.full.outdated = outdated.full;
            navigraphData.short.outdated = outdated.short;

            setRedisSync('navigraph-ready', '1', 1000 * 60 * 60 * 24);
            defaultRedis.publish('update', 'navigraph-data');
        }
        else {
            setRedisSync('navigraph-ready', '1', 1000 * 60 * 60 * 24);
        }
    }
    catch (e) {
        console.error(e);
    }
}

const router = createRouter<{ type: string }>();

addRoute(router, 'GET', '/item/:type/:data/:key', { type: 'item' });
addRoute(router, 'GET', '/data/:type', { type: 'data' });
addRoute(router, 'GET', '/airport/:type/:airport/:group', { type: 'procedures' });
addRoute(router, 'GET', '/airport/:type/:airport/:group/:index', { type: 'procedure' });

function handleError(message: string, statusCode = 404) {
    return new Response(message, {
        status: statusCode,
    });
}

serve({
    port: 3000,
    fetch(request) {
        const path = request.url.split(':3000')[1];
        const method = request.method;
        const route = findRoute<{ type: string }>(router, method, path);
        if (!route) {
            return new Response('not found', {
                status: 404,
            });
        }

        if (route.data.type === 'item') {
            const { type, key, data } = route.params!;

            const object = navigraphData.full[type as 'current' | 'outdated']?.[data as keyof NavigraphNavData];
            if (!object) {
                return handleError('Data object not found');
            }

            const item = object[key as keyof typeof object];
            if (!item) {
                return handleError('Item not found for this key');
            }

            return new Response(JSON.stringify(item), {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }

        if (route.data.type === 'data') {
            const { type } = route.params!;

            const params = request.url.split('?')[1];
            const keys = params ? params.split('keys=')[1]?.split('&')[0] : '';
            const requestedKeys = keys ? keys.split(',') : [];

            const data = navigraphData?.short[type as 'current' | 'outdated'];
            if (!data) {
                return handleError('Data not initialized');
            }

            if (!requestedKeys?.length) {
                return new Response(JSON.stringify(data), {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            }

            const newObj: Partial<NavigraphNavDataShort> = {};

            for (const key of requestedKeys) {
                // @ts-expect-error dynamic assigment
                newObj[key] = data[key];
            }

            return new Response(JSON.stringify(newObj), {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }

        if (route.data.type === 'procedures') {
            const { type, airport, group } = route.params!;

            const data = navigraphData?.full[type as 'current' | 'outdated'];
            if (!data) {
                return handleError('Data not initialized');
            }

            const _procedures = data[group as 'stars' | 'sids' | 'approaches'][airport];

            if (!_procedures) return handleError('Not found');

            if (group !== 'approaches') {
                const procedures = _procedures as NavDataProcedure<NavigraphNavDataStar>[];

                return new Response(JSON.stringify(procedures.map(x => ({
                    identifier: x.procedure.identifier,
                    runways: x.procedure.runways,
                    transitions: {
                        runway: x.transitions.runway.map(x => x.name),
                        enroute: x.transitions.enroute.map(x => x.name),
                    },
                }))), {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            }
            else {
                const procedures = _procedures as NavDataProcedure<NavigraphNavDataApproach>[];

                return new Response(JSON.stringify(procedures.map(x => ({
                    name: x.procedure.procedureName,
                    runway: x.procedure.runway,
                    transitions: x.transitions.map(x => x.name),
                }))), {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            }
        }

        if (route.data.type === 'procedure') {
            const { type, airport, group, index } = route.params!;

            const data = navigraphData?.full[type as 'current' | 'outdated'];
            if (!data) {
                return handleError('Data not initialized');
            }

            const procedure = data[group as 'stars' | 'sids' | 'approaches'][airport][+index];

            if (!procedure) return handleError('Not found');

            return new Response(JSON.stringify(procedure), {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }

        return handleError('Not found');
    },
});

await defineCronJob('30 */2 * * *', async () => {
    await initNavigraph();
    await updateNavigraph();
});
