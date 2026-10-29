import sqlite3 from 'better-sqlite3';
import { join } from 'node:path';
import type { Dirent } from 'node:fs';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { $fetch } from 'ofetch';
import { radarStorage } from '~/utils/server/storage';
import { unpack } from '7zip-min';
import { defaultRedis, setRedisSync } from '~/utils/server/redis';

export let navigraphCurrentDb: sqlite3.Database | null = null;
export let navigraphOutdatedDb: sqlite3.Database | null = null;

const cwd = join(process.cwd(), 'app');
const dirPath = join(cwd, 'data');

function isNavigraphDatabaseError(error: unknown) {
    if (!(error instanceof Error)) return false;

    return error.message.includes('file is not a database') ||
        error.message.includes('database disk image is malformed');
}

function isNavigraphIntegrityError(error: unknown) {
    return error instanceof Error && error.message.startsWith('SQLite integrity check failed');
}

function openNavigraphDatabase(file: string) {
    const db = new sqlite3(file, { readonly: true });

    try {
        const result = db.prepare('PRAGMA integrity_check').get() as { integrity_check?: string } | undefined;
        if (result?.integrity_check !== 'ok') {
            throw new Error(`SQLite integrity check failed: ${ result?.integrity_check ?? 'unknown result' }`);
        }

        return db;
    }
    catch (error) {
        db.close();
        throw error;
    }
}

function isNavigraphDatabaseUsable(file: string) {
    try {
        const db = openNavigraphDatabase(file);
        db.close();
        return true;
    }
    catch (error) {
        if (isNavigraphDatabaseError(error) || isNavigraphIntegrityError(error)) {
            console.warn(`Ignoring invalid Navigraph database file: ${ file }`, error);
            return false;
        }

        throw error;
    }
}

export function initNavigraphDB({ type, file }: { type: 'current' | 'outdated'; file: string }) {
    closeNavigraphDB(type);

    try {
        const db = openNavigraphDatabase(file);
        if (type === 'current') {
            navigraphCurrentDb = db;
        }
        else {
            navigraphOutdatedDb = db;
        }
        return true;
    }
    catch (error) {
        if (isNavigraphDatabaseError(error) || isNavigraphIntegrityError(error)) {
            console.warn(`Ignoring invalid Navigraph database file: ${ file }`, error);
            return false;
        }

        throw error;
    }
}

export function closeNavigraphDB(type: 'current' | 'outdated') {
    if (type === 'current') {
        if (navigraphCurrentDb) {
            navigraphCurrentDb.close();
            navigraphCurrentDb = null;
        }
    }

    if (type === 'outdated') {
        if (navigraphOutdatedDb) {
            navigraphOutdatedDb.close();
            navigraphOutdatedDb = null;
        }
    }
}

export const navigraphAccessKey = {
    token: '',
    expires: null as null | number,
};

export const cycles = {
    current: '',
    outdated: '',
};

interface File {
    package_id: string;
    cycle: string;
    files: {
        file_id: string;
        key: string;
        hash: string;
        signed_url: string;
    }[];
    revision: string;
}

async function downloadNavigraphFile({ fileUrl, path, filename }: { fileUrl: string; path: string; filename: string }) {
    mkdirSync(dirPath, { recursive: true });

    const tempDir = mkdtempSync(join(dirPath, 'navigraph-download-'));
    const tempPath = join(tempDir, 'source.7z');
    const unpackPath = join(tempDir, 'unpacked');
    const finalPath = join(path, filename);

    try {
        // @ts-expect-error Types error
        const zip = await $fetch<ArrayBuffer>(fileUrl, { responseType: 'arrayBuffer' });
        writeFileSync(tempPath, Buffer.from(zip));

        mkdirSync(unpackPath);
        await unpack(tempPath, unpackPath);

        const dirList = readdirSync(unpackPath);
        if (!dirList[0]) throw new Error('Navigraph archive unpacked without files');

        if (existsSync(finalPath) && !isNavigraphDatabaseUsable(finalPath)) {
            rmSync(finalPath, { force: true });
        }

        if (existsSync(finalPath)) return;

        renameSync(join(unpackPath, dirList[0]), finalPath);
        if (!isNavigraphDatabaseUsable(finalPath)) {
            rmSync(finalPath, { force: true });
            throw new Error(`Downloaded Navigraph database is invalid: ${ finalPath }`);
        }
    }
    finally {
        rmSync(tempDir, { recursive: true, force: true });
    }
}

function removeOldNavigraphFiles(files: Dirent<string>[], type: 'current' | 'outdated') {
    for (const file of files) {
        if (!file.isFile() || !file.name.includes(type) || !file.name.endsWith('.s3db')) continue;

        rmSync(join(file.parentPath, file.name), { force: true });
    }
}

export async function checkNavigraphToken() {
    if (!navigraphAccessKey.token || !navigraphAccessKey.expires || navigraphAccessKey.expires < Date.now()) {
        const form = new URLSearchParams();
        form.set('client_id', process.env.NAVIGRAPH_SERVER_ID!);
        form.set('client_secret', process.env.NAVIGRAPH_SERVER_SECRET!);
        form.set('scope', 'fmsdata amdb');
        form.set('grant_type', 'client_credentials');

        const { access_token, expires_in } = await $fetch<{ access_token: string; expires_in: number; token_type: 'Bearer' }>('https://identity.api.navigraph.com/connect/token', {
            method: 'POST',
            body: form.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 1000 * 60,
        });

        navigraphAccessKey.token = access_token;
        navigraphAccessKey.expires = Date.now() + (expires_in * 1000);
    }
}

function markNavigraphReady() {
    setRedisSync('navigraph-ready', '1', 1000 * 60 * 60 * 24);
    defaultRedis.publish('update', 'navigraph-data');
}

async function updateNavigraph() {
    await checkNavigraphToken();

    const [current] = await $fetch<File[]>('https://api.navigraph.com/v1/navdata/packages?package_status=current', {
        headers: {
            Authorization: `Bearer ${ navigraphAccessKey.token }`,
        },
        timeout: 1000 * 60,
        retry: 3,
    });

    const [outdated] = await $fetch<File[]>('https://api.navigraph.com/v1/navdata/packages?package_status=outdated', {
        headers: {
            Authorization: `Bearer ${ navigraphAccessKey.token }`,
        },
        timeout: 1000 * 60,
        retry: 3,
    });

    const currentCycle = `${ current.cycle }-${ current.revision }-13`;
    const outdatedCycle = `${ outdated.cycle }-${ outdated.revision }-13`;

    if (currentCycle === cycles.current && outdatedCycle === cycles.outdated && navigraphCurrentDb && navigraphOutdatedDb) return;

    console.log(`Cycle updated`, cycles.current, currentCycle, cycles.outdated, outdatedCycle);

    const currentFileName = `current-v2-${ currentCycle }.s3db`;
    const outdatedFileName = `outdated-v2-${ outdatedCycle }.s3db`;

    const currentPath = join(cwd, `data/${ currentFileName }`);
    const outdatedPath = join(cwd, `data/${ outdatedFileName }`);

    for (const [path, type] of [[currentPath, 'current'], [outdatedPath, 'outdated']] as const) {
        if (existsSync(path) && !isNavigraphDatabaseUsable(path)) {
            rmSync(path, { force: true });
            console.warn(`Removed invalid ${ type } Navigraph database candidate: ${ path }`);
        }
    }

    if (!existsSync(currentPath)) {
        await downloadNavigraphFile({
            fileUrl: current.files[0].signed_url,
            path: dirPath,
            filename: currentFileName,
        });
    }

    if (!initNavigraphDB({ type: 'current', file: currentPath })) return;

    if (!existsSync(outdatedPath)) {
        await downloadNavigraphFile({
            fileUrl: outdated.files[0].signed_url,
            path: dirPath,
            filename: outdatedFileName,
        });
    }

    if (!initNavigraphDB({ type: 'outdated', file: outdatedPath })) return;

    cycles.current = currentCycle;
    cycles.outdated = outdatedCycle;
    radarStorage.navigraph = cycles;

    removeOldNavigraphFiles(readdirSync(dirPath, { withFileTypes: true }), 'current');
    removeOldNavigraphFiles(readdirSync(dirPath, { withFileTypes: true }), 'outdated');
}

export async function initNavigraph() {
    try {
        await updateNavigraph();
        markNavigraphReady();
    }
    catch (error) {
        console.error('Navigraph initialization failed; continuing without Navigraph data', error);
        markNavigraphReady();
    }
}

interface RequestSettings {
    db: sqlite3.Database;
    sql: string;
}

export function dbRequest<T extends Record<string, any>>({
    db,
    sql,
}: RequestSettings) {
    const req = db.prepare(sql);
    return req.all() as T[];
}

export async function dbPartialRequest<T extends Record<string, any>>({ db, sql, table, count = 5000 }: RequestSettings & { table: string; count?: number }) {
    const [{ count: totalCount }] = await dbRequest<{ count: number }>({
        db: db,
        sql: `SELECT COUNT(*) as count FROM ${ table }`,
    });

    const rows: T[] = [];

    for (let i = 0; i < totalCount; i += count) {
        rows.push(...await dbRequest<T>({
            db,
            sql: `${ sql } LIMIT ${ count } OFFSET ${ i }`,
        }));
    }

    return rows;
}
