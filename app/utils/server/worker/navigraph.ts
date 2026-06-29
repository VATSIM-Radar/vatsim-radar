import { createRouter, addRoute, findRoute } from 'rou3';
import { serve } from 'srvx';
import { defaultRedis, setRedisSync, unsetRedisSync } from '~/utils/server/redis';
import { radarStorage } from '~/utils/server/storage';
import { initNavigraph, navigraphCurrentDb, navigraphOutdatedDb } from '~/utils/server/navigraph/db';
import type { cycles } from '~/utils/server/navigraph/db';
import type { NavigraphNavDataShort, NavigraphNavDataShortProcedures } from '~/utils/server/navigraph/navdata/types';
import { defineCronJob, readJsonFile } from '~/utils/server';
import {
    ensureCycleCache,
    getCachedProcedurePath,
    readCachedItem,
} from '~/utils/server/navigraph/cache';
import type { NavigraphCycleType, NavigraphProcedureGroup } from '~/utils/server/navigraph/cache';

const navigraphData: {
    versions: typeof cycles;
    short: {
        current: NavigraphNavDataShort | null;
        outdated: NavigraphNavDataShort | null;
    };
    cachePath: {
        current: string;
        outdated: string;
    };
} = {
    versions: {
        current: '',
        outdated: '',
    },
    short: {
        current: null,
        outdated: null,
    },
    cachePath: {
        current: '',
        outdated: '',
    },
};

unsetRedisSync('navigraph-ready');
defaultRedis.publish('update', 'navigraph-data');
let updating = false;

async function updateNavigraph() {
    try {
        updating = true;
        if (navigraphData.versions.current !== radarStorage.navigraph.current || navigraphData.versions.outdated !== radarStorage.navigraph.outdated || process.env.NODE_ENV === 'development') {
            console.log('Update has started', radarStorage.navigraph.current, navigraphData.versions.current);
            await unsetRedisSync('navigraph-ready');
            const current = await ensureCycleCache({
                type: 'current',
                version: radarStorage.navigraph.current,
                db: navigraphCurrentDb!,
            });
            const outdated = await ensureCycleCache({
                type: 'outdated',
                version: radarStorage.navigraph.outdated,
                db: navigraphOutdatedDb!,
            });

            navigraphData.versions = { ...radarStorage.navigraph };

            navigraphData.short.current = current.short;
            navigraphData.short.outdated = outdated.short;
            navigraphData.cachePath.current = current.path;
            navigraphData.cachePath.outdated = outdated.path;

            setRedisSync('navigraph-ready', '1', 1000 * 60 * 60 * 24);
            defaultRedis.publish('update', 'navigraph-data');
            console.log(`Cycle is ${ navigraphData.versions.current }`);
        }
        else {
            setRedisSync('navigraph-ready', '1', 1000 * 60 * 60 * 24);
        }
    }
    catch (e) {
        console.error(e);
    }
    finally {
        updating = false;
    }
}

const router = createRouter<{ type: string }>();

addRoute(router, 'GET', '/item/:type/:data/:key', { type: 'item' });
addRoute(router, 'GET', '/data/:type', { type: 'data' });
addRoute(router, 'GET', '/airport/:type/:airport', { type: 'allProcedures' });
addRoute(router, 'GET', '/airport/:type/:airport/:group', { type: 'procedures' });
addRoute(router, 'GET', '/airport/:type/:airport/:group/all', { type: 'allProcedure' });
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

        if (updating) {
            return new Response('not ready yet', {
                status: 423,
            });
        }

        if (route.data.type === 'item') {
            const { type, key, data } = route.params!;
            const root = navigraphData.cachePath[type as NavigraphCycleType];

            const item = readCachedItem(root, data, key);
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

        if (route.data.type === 'allProcedures') {
            const { type, airport } = route.params!;
            const root = navigraphData.cachePath[type as NavigraphCycleType];

            const data = readJsonFile<NavigraphNavDataShortProcedures>(getCachedProcedurePath(root, airport, undefined, 'all'));
            if (!data) return handleError('Not found');

            return new Response(JSON.stringify(data), {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }

        if (route.data.type === 'procedures') {
            const { type, airport, group } = route.params!;
            const root = navigraphData.cachePath[type as NavigraphCycleType];

            const procedures = readJsonFile(getCachedProcedurePath(root, airport, group as NavigraphProcedureGroup, 'index'));
            if (!procedures) return handleError('Not found');

            return new Response(JSON.stringify(procedures), {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }

        if (route.data.type === 'procedure') {
            const { type, airport, group, index } = route.params!;
            const root = navigraphData.cachePath[type as NavigraphCycleType];

            const procedure = readJsonFile(getCachedProcedurePath(root, airport, group as NavigraphProcedureGroup, index));
            if (!procedure) return handleError('Not found');

            return new Response(JSON.stringify(procedure), {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }


        if (route.data.type === 'allProcedure') {
            const { type, airport, group } = route.params!;
            const root = navigraphData.cachePath[type as NavigraphCycleType];

            const procedure = readCachedItem(root, group, airport);

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
