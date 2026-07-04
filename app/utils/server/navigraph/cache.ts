import type sqlite3 from 'better-sqlite3';
import { join } from 'node:path';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { encodeCachePart, isObject } from '~/utils/shared';
import { readJsonFile, writeJsonFile } from '~/utils/server';
import { processDatabase } from '~/utils/server/navigraph/navdata';
import type {
    NavDataProcedure,
    NavigraphNavData,
    NavigraphNavDataFull,
    NavigraphNavDataApproach,
    NavigraphNavDataApproachShort,
    NavigraphNavDataShort,
    NavigraphNavDataShortProcedures,
    NavigraphNavDataStar,
    NavigraphNavDataStarShort,
} from '~/utils/server/navigraph/navdata/types';

export type NavigraphCycleType = 'current' | 'outdated';
export type NavigraphProcedureGroup = 'stars' | 'sids' | 'approaches';

export const navigraphCacheRoot = join(process.cwd(), 'app/data/navigraph-cache');
const procedureGroups = ['stars', 'sids', 'approaches'] as const satisfies readonly NavigraphProcedureGroup[];
const cacheVersion = 'items-by-type-v6';
const itemMemoryTtl = 10 * 60 * 1000;

type CacheVersionFile = {
    version: string;
};

type CachedItemFile = {
    data: unknown;
    lastUsed: number;
};

const itemFileMemoryCache = new Map<string, CachedItemFile>();

function pruneUnusedItemMemory(now = Date.now()) {
    for (const [path, item] of itemFileMemoryCache.entries()) {
        if (now - item.lastUsed <= itemMemoryTtl) continue;

        itemFileMemoryCache.delete(path);
    }
}

const itemMemoryPruneInterval = setInterval(() => pruneUnusedItemMemory(), 60 * 1000);
itemMemoryPruneInterval.unref?.();

function clearItemMemoryForRoot(root: string) {
    for (const path of itemFileMemoryCache.keys()) {
        if (path !== root && !path.startsWith(`${ root }/`)) continue;

        itemFileMemoryCache.delete(path);
    }
}

export function getCachedProcedurePath(root: string, airport: string, group?: NavigraphProcedureGroup, index?: string | number) {
    const parts = [root, 'procedures', encodeCachePart(airport)];

    if (group) parts.push(group);
    if (index !== undefined) parts.push(`${ encodeCachePart(index) }.json`);

    return join(...parts);
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

function writeItemCache(path: string, full: NavigraphNavDataFull) {
    for (const [dataKey, data] of Object.entries(full)) {
        if (procedureGroups.includes(dataKey as NavigraphProcedureGroup)) continue;

        writeJsonFile(join(path, 'item', `${ encodeCachePart(dataKey) }.json`), data);
    }
}

function clearFullData(full: NavigraphNavDataFull) {
    for (const key of Object.keys(full)) {
        delete (full as unknown as Record<string, unknown>)[key];
    }
}

function formatMemorySize(bytes: number) {
    return `${ Math.round(bytes / 1024 / 1024) } MiB`;
}

function releaseNavigraphMemory(reason: string) {
    const gc = (globalThis as typeof globalThis & { gc?: () => void }).gc;
    if (!gc) return;

    const before = process.memoryUsage();
    gc();
    const after = process.memoryUsage();

    console.log(`Navigraph memory release after ${ reason }: heapUsed ${ formatMemorySize(before.heapUsed) } -> ${ formatMemorySize(after.heapUsed) }, rss ${ formatMemorySize(before.rss) } -> ${ formatMemorySize(after.rss) }`);
}

function isCacheReady(path: string) {
    if (!existsSync(join(path, 'ready')) || !existsSync(join(path, 'short.json'))) return false;

    const version = readJsonFile<CacheVersionFile>(join(path, 'cache-version.json'));

    return version?.version === cacheVersion;
}

function readCachedItemFile(path: string) {
    const now = Date.now();
    const cached = itemFileMemoryCache.get(path);

    if (cached) {
        cached.lastUsed = now;

        return cached.data;
    }

    const data = readJsonFile<unknown>(path);

    if (data !== null) {
        pruneUnusedItemMemory(now);
        itemFileMemoryCache.set(path, {
            data,
            lastUsed: now,
        });
    }

    return data;
}

function pruneOldCycleCaches(type: NavigraphCycleType, activeVersion: string) {
    if (!existsSync(navigraphCacheRoot)) return;

    const activeName = `${ type }-${ activeVersion }`;
    for (const entry of readdirSync(navigraphCacheRoot, { withFileTypes: true })) {
        if (!entry.isDirectory() || !entry.name.startsWith(`${ type }-`) || entry.name === activeName) continue;

        const path = join(navigraphCacheRoot, entry.name);
        clearItemMemoryForRoot(path);
        rmSync(path, { recursive: true, force: true });
    }
}

export async function ensureCycleCache({ type, version, db }: { type: NavigraphCycleType; version: string; db: sqlite3.Database }) {
    const path = join(navigraphCacheRoot, `${ type }-${ version }`);

    if (isCacheReady(path)) {
        pruneOldCycleCaches(type, version);

        return {
            path,
            short: readJsonFile<NavigraphNavDataShort>(join(path, 'short.json'))!,
        };
    }

    clearItemMemoryForRoot(path);
    rmSync(path, { recursive: true, force: true });
    mkdirSync(path, { recursive: true });

    const processed = await processDatabase(db, version);
    const short = processed.short;

    try {
        writeItemCache(path, processed.full);
        writeProcedureCache(path, processed.full);
        writeJsonFile(join(path, 'short.json'), short);
        writeJsonFile(join(path, 'cache-version.json'), {
            version: cacheVersion,
        } satisfies CacheVersionFile);
        writeFileSync(join(path, 'ready'), version);
    }
    finally {
        clearFullData(processed.full);
        releaseNavigraphMemory(`${ type } ${ version } cache build`);
    }

    pruneOldCycleCaches(type, version);

    return {
        path,
        short,
    };
}

export function readCachedItem(root: string, data: string, key: string) {
    if (procedureGroups.includes(data as NavigraphProcedureGroup)) {
        const groupDir = join(root, 'procedures', encodeCachePart(key), data);
        if (!existsSync(groupDir)) return null;

        const index = readJsonFile<unknown[]>(join(groupDir, 'index.json'));
        if (!index) return null;

        return index.map((_, procedureIndex) => readJsonFile(join(groupDir, `${ procedureIndex }.json`)));
    }

    const itemFile = readCachedItemFile(join(root, 'item', `${ encodeCachePart(data) }.json`));

    if (Array.isArray(itemFile)) {
        return itemFile[Number(key)] ?? null;
    }

    if (!isObject(itemFile)) return null;

    return itemFile[key] ?? null;
}

export function readCachedItemData(root: string, data: string) {
    return readCachedItemFile(join(root, 'item', `${ encodeCachePart(data) }.json`));
}
