import sqlite3 from 'sqlite3';
import { join } from 'path';
import { readdirSync } from 'fs';
import { existsSync, mkdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { $fetch } from 'ofetch';
import { radarStorage } from '~/utils/server/storage';
import { unpack } from '7zip-min';

export let navigraphCurrentDb: sqlite3.Database | null = null;
export let navigraphOutdatedDb: sqlite3.Database | null = null;

const cwd = join(process.cwd(), 'app');
const dirPath = join(cwd, 'data');
const tempDir = join(dirPath, 'temp');
const tempPath = join(dirPath, 'navigraph-temp.7z');

export function initNavigraphDB({ type, file }: { type: 'current' | 'outdated'; file: string }) {
    closeNavigraphDB(type);

    if (type === 'current') {
        navigraphCurrentDb = new sqlite3.Database(file, sqlite3.OPEN_READONLY);
    }

    if (type === 'outdated') {
        navigraphOutdatedDb = new sqlite3.Database(file, sqlite3.OPEN_READONLY);
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
    // @ts-expect-error Types error
    const zip = await $fetch<ArrayBuffer>(fileUrl, { responseType: 'arrayBuffer' });
    writeFileSync(tempPath, Buffer.from(zip));

    try {
        if (!existsSync(tempDir)) {
            mkdirSync(tempDir);
        }

        await unpack(tempPath, tempDir);
        const dirList = readdirSync(tempDir);
        renameSync(join(tempDir, dirList[0]), join(path, filename));
    }
    finally {
        if (existsSync(tempPath)) {
            unlinkSync(tempPath);
        }
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

export async function initNavigraph() {
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

    const currentCycle = `${ current.cycle }-${ current.revision }-3`;
    const outdatedCycle = `${ outdated.cycle }-${ outdated.revision }-3`;

    if (currentCycle === cycles.current && outdatedCycle === cycles.outdated) return;

    console.log(`Cycle updated`, cycles.current, currentCycle, cycles.outdated, outdatedCycle);

    cycles.current = currentCycle;
    cycles.outdated = outdatedCycle;

    radarStorage.navigraph = cycles;

    const currentFileName = `current-v2-${ currentCycle }.s3db`;
    const outdatedFileName = `outdated-v2-${ outdatedCycle }.s3db`;

    const currentPath = join(cwd, `data/${ currentFileName }`);
    const outdatedPath = join(cwd, `data/${ outdatedFileName }`);

    const filesInPath = readdirSync(dirPath, { withFileTypes: true });

    if (!existsSync(currentPath)) {
        closeNavigraphDB('current');
        filesInPath.filter(x => x.name.includes('current')).forEach(file => unlinkSync(`${ file.parentPath }/${ file.name }`));

        await downloadNavigraphFile({
            fileUrl: current.files[0].signed_url,
            path: dirPath,
            filename: currentFileName,
        });
    }

    if (!navigraphCurrentDb) initNavigraphDB({ type: 'current', file: currentPath });

    if (!existsSync(outdatedPath)) {
        closeNavigraphDB('outdated');
        filesInPath.filter(x => x.name.includes('outdated')).forEach(file => unlinkSync(`${ file.parentPath }/${ file.name }`));

        await downloadNavigraphFile({
            fileUrl: outdated.files[0].signed_url,
            path: dirPath,
            filename: outdatedFileName,
        });
    }

    if (!navigraphOutdatedDb) initNavigraphDB({ type: 'outdated', file: outdatedPath });
}

interface RequestSettings {
    db: sqlite3.Database;
    sql: string;
    params?: Record<string, any>;
}

export function dbRequest<T extends Record<string, any>>({
    db,
    sql,
    params = {},
}: RequestSettings) {
    return new Promise<T[]>((resolve, reject) => {
        const rows: T[] = [];

        db.each(
            sql,
            params,
            (err, row: any) => {
                if (err) return reject(err);

                rows.push(row);
            },
            err => {
                if (err) return reject(err);
                resolve(rows);
            },
        );
    });
}

export async function dbPartialRequest<T extends Record<string, any>>({ db, sql, params, table, count = 5000 }: RequestSettings & { table: string; count?: number }) {
    const [{ count: totalCount }] = await dbRequest<{ count: number }>({
        db: db,
        sql: `SELECT COUNT(*) as count FROM ${ table }`,
    });

    const rows: T[] = [];

    for (let i = 0; i < totalCount; i += count) {
        rows.push(...await dbRequest<T>({
            db,
            sql: `${ sql } LIMIT ${ count } OFFSET ${ i }`,
            params,
        }));
    }

    return rows;
}
