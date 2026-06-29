import { createRouter, addRoute, findRoute } from 'rou3';
import { serve } from 'srvx';
import { defaultRedis, setRedisSync, unsetRedisSync } from '~/utils/server/redis';
import { radarStorage } from '~/utils/server/storage';
import { processDatabase } from '~/utils/server/navigraph/navdata';
import { initNavigraph, navigraphCurrentDb, navigraphOutdatedDb } from '~/utils/server/navigraph/db';
import type { cycles } from '~/utils/server/navigraph/db';
import type {
    NavDataProcedure,
    NavigraphNavData, NavigraphNavDataApproach, NavigraphNavDataApproachShort,
    NavigraphNavDataShort, NavigraphNavDataShortProcedures,
    NavigraphNavDataStar, NavigraphNavDataStarShort,
} from '~/utils/server/navigraph/navdata/types';
import { defineCronJob } from '~/utils/server';
import { dirname, join } from 'node:path';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

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

type NavigraphCycleType = 'current' | 'outdated';
type NavigraphProcedureGroup = 'stars' | 'sids' | 'approaches';

const navigraphCacheRoot = join(process.cwd(), 'app/data/navigraph-cache');
const procedureGroups = ['stars', 'sids', 'approaches'] as const satisfies readonly NavigraphProcedureGroup[];

function encodeCachePart(value: string | number) {
    return encodeURIComponent(String(value));
}

function getCycleCachePath(type: NavigraphCycleType, version: string) {
    return join(navigraphCacheRoot, `${ type }-${ version }`);
}

function getCachedProcedurePath(type: NavigraphCycleType, airport: string, group?: NavigraphProcedureGroup, index?: string | number) {
    const root = navigraphData.cachePath[type];
    const parts = [root, 'procedures', encodeCachePart(airport)];

    if (group) parts.push(group);
    if (index !== undefined) parts.push(`${ encodeCachePart(index) }.json`);

    return join(...parts);
}

function writeJsonFile(path: string, data: unknown) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(data));
}

function readJsonFile<T>(path: string): T | null {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function isCycleCacheReady(path: string) {
    return existsSync(join(path, 'ready')) && existsSync(join(path, 'short.json'));
}

function getShortStar(star: NavDataProcedure<NavigraphNavDataStar>): NavigraphNavDataStarShort {
    return {
        identifier: star.procedure.identifier,
        runways: star.procedure.runways,
        transitions: {
            runway: star.transitions.runway.map(x => x.name),
            enroute: star.transitions.enroute.map(x => x.name),
        },
    };
}

function getShortApproach(star: NavDataProcedure<NavigraphNavDataApproach>): NavigraphNavDataApproachShort {
    return {
        name: star.procedure.procedureName,
        runway: star.procedure.runway,
        transitions: star.transitions.map(x => x.name),
    };
}

function getShortProcedure(group: NavigraphProcedureGroup, procedure: NavDataProcedure<NavigraphNavDataStar> | NavDataProcedure<NavigraphNavDataApproach>) {
    return group === 'approaches'
        ? getShortApproach(procedure as NavDataProcedure<NavigraphNavDataApproach>)
        : getShortStar(procedure as NavDataProcedure<NavigraphNavDataStar>);
}

function writeProcedureCache(path: string, full: NavigraphNavData) {
    const airports = new Set([
        ...Object.keys(full.stars ?? {}),
        ...Object.keys(full.sids ?? {}),
        ...Object.keys(full.approaches ?? {}),
    ]);

    for (const airport of airports) {
        const allProcedures: NavigraphNavDataShortProcedures = {
            stars: [],
            sids: [],
            approaches: [],
        };

        for (const group of procedureGroups) {
            const procedures = full[group]?.[airport] ?? [];
            const groupShort = procedures.map(procedure => getShortProcedure(group, procedure));

            if (group === 'approaches') allProcedures.approaches = groupShort as NavigraphNavDataApproachShort[];
            else allProcedures[group] = groupShort as NavigraphNavDataStarShort[];
            writeJsonFile(join(path, 'procedures', encodeCachePart(airport), group, 'index.json'), groupShort);

            procedures.forEach((procedure, index) => {
                writeJsonFile(join(path, 'procedures', encodeCachePart(airport), group, `${ index }.json`), procedure);
            });
        }

        writeJsonFile(join(path, 'procedures', encodeCachePart(airport), 'all.json'), allProcedures);
    }
}

function writeItemCache(path: string, full: NavigraphNavData) {
    for (const [dataKey, data] of Object.entries(full)) {
        if (procedureGroups.includes(dataKey as NavigraphProcedureGroup)) continue;

        for (const [key, item] of Object.entries(data)) {
            writeJsonFile(join(path, 'item', encodeCachePart(dataKey), `${ encodeCachePart(key) }.json`), item);
        }
    }
}

function pruneOldCycleCaches(type: NavigraphCycleType, activeVersion: string) {
    if (!existsSync(navigraphCacheRoot)) return;

    const activeName = `${ type }-${ activeVersion }`;
    for (const entry of readdirSync(navigraphCacheRoot, { withFileTypes: true })) {
        if (!entry.isDirectory() || !entry.name.startsWith(`${ type }-`) || entry.name === activeName) continue;
        rmSync(join(navigraphCacheRoot, entry.name), { recursive: true, force: true });
    }
}

async function ensureCycleCache(type: NavigraphCycleType, version: string) {
    const path = getCycleCachePath(type, version);

    if (isCycleCacheReady(path)) {
        pruneOldCycleCaches(type, version);

        return {
            path,
            short: readJsonFile<NavigraphNavDataShort>(join(path, 'short.json'))!,
        };
    }

    rmSync(path, { recursive: true, force: true });
    mkdirSync(path, { recursive: true });

    const processed = await processDatabase(type === 'current' ? navigraphCurrentDb! : navigraphOutdatedDb!, version);

    writeItemCache(path, processed.full);
    writeProcedureCache(path, processed.full);
    writeJsonFile(join(path, 'short.json'), processed.short);
    writeFileSync(join(path, 'ready'), version);

    pruneOldCycleCaches(type, version);

    return {
        path,
        short: processed.short,
    };
}

function readCachedItem(type: NavigraphCycleType, data: string, key: string) {
    if (procedureGroups.includes(data as NavigraphProcedureGroup)) {
        const groupDir = join(navigraphData.cachePath[type], 'procedures', encodeCachePart(key), data);
        if (!existsSync(groupDir)) return null;

        const index = readJsonFile<unknown[]>(join(groupDir, 'index.json'));
        if (!index) return null;

        return index.map((_, procedureIndex) => readJsonFile(join(groupDir, `${ procedureIndex }.json`)));
    }

    return readJsonFile(join(navigraphData.cachePath[type], 'item', encodeCachePart(data), `${ encodeCachePart(key) }.json`));
}

async function updateNavigraph() {
    try {
        updating = true;
        if (navigraphData.versions.current !== radarStorage.navigraph.current || navigraphData.versions.outdated !== radarStorage.navigraph.outdated || process.env.NODE_ENV === 'development') {
            console.log('Update has started', radarStorage.navigraph.current, navigraphData.versions.current);
            await unsetRedisSync('navigraph-ready');
            const current = await ensureCycleCache('current', radarStorage.navigraph.current);
            const outdated = await ensureCycleCache('outdated', radarStorage.navigraph.outdated);

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

            const item = readCachedItem(type as NavigraphCycleType, data, key);
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

            const data = readJsonFile<NavigraphNavDataShortProcedures>(getCachedProcedurePath(type as NavigraphCycleType, airport, undefined, 'all'));
            if (!data) return handleError('Not found');

            return new Response(JSON.stringify(data), {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }

        if (route.data.type === 'procedures') {
            const { type, airport, group } = route.params!;

            const procedures = readJsonFile(getCachedProcedurePath(type as NavigraphCycleType, airport, group as NavigraphProcedureGroup, 'index'));
            if (!procedures) return handleError('Not found');

            return new Response(JSON.stringify(procedures), {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }

        if (route.data.type === 'procedure') {
            const { type, airport, group, index } = route.params!;

            const procedure = readJsonFile(getCachedProcedurePath(type as NavigraphCycleType, airport, group as NavigraphProcedureGroup, index));
            if (!procedure) return handleError('Not found');

            return new Response(JSON.stringify(procedure), {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }


        if (route.data.type === 'allProcedure') {
            const { type, airport, group } = route.params!;

            const procedure = readCachedItem(type as NavigraphCycleType, group, airport);

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
