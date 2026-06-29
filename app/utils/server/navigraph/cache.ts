import type sqlite3 from 'better-sqlite3';
import { join } from 'node:path';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { encodeCachePart } from '~/utils/shared';
import { readJsonFile, writeJsonFile } from '~/utils/server';
import { processDatabase } from '~/utils/server/navigraph/navdata';
import type {
    NavDataProcedure,
    NavigraphNavData,
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

export async function ensureCycleCache({ type, version, db }: { type: NavigraphCycleType; version: string; db: sqlite3.Database }) {
    const path = join(navigraphCacheRoot, `${ type }-${ version }`);

    if (existsSync(join(path, 'ready')) && existsSync(join(path, 'short.json'))) {
        pruneOldCycleCaches(type, version);

        return {
            path,
            short: readJsonFile<NavigraphNavDataShort>(join(path, 'short.json'))!,
        };
    }

    rmSync(path, { recursive: true, force: true });
    mkdirSync(path, { recursive: true });

    const processed = await processDatabase(db, version);

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

export function readCachedItem(root: string, data: string, key: string) {
    if (procedureGroups.includes(data as NavigraphProcedureGroup)) {
        const groupDir = join(root, 'procedures', encodeCachePart(key), data);
        if (!existsSync(groupDir)) return null;

        const index = readJsonFile<unknown[]>(join(groupDir, 'index.json'));
        if (!index) return null;

        return index.map((_, procedureIndex) => readJsonFile(join(groupDir, `${ procedureIndex }.json`)));
    }

    return readJsonFile(join(root, 'item', encodeCachePart(data), `${ encodeCachePart(key) }.json`));
}
