import sqlite3 from 'better-sqlite3';
import { materializeCycleCache } from '~/utils/server/navigraph/cache';
import type { NavigraphCycleType } from '~/utils/server/navigraph/cache';

const [type, version, dbPath] = process.argv.slice(2);

if ((type !== 'current' && type !== 'outdated') || !version || !dbPath) {
    console.error('Usage: navigraph-cache-builder.ts <current|outdated> <version> <dbPath>');
    process.exit(1);
}

let db: sqlite3.Database | undefined;

try {
    db = new sqlite3(dbPath, { readonly: true });
    const result = db.prepare('PRAGMA integrity_check').get() as { integrity_check?: string } | undefined;
    if (result?.integrity_check !== 'ok') {
        throw new Error(`SQLite integrity check failed: ${ result?.integrity_check ?? 'unknown result' }`);
    }

    await materializeCycleCache({
        type: type as NavigraphCycleType,
        version,
        db,
    });
}
catch (e) {
    console.error(e);
    process.exitCode = 1;
}
finally {
    db?.close();
}

process.exit(process.exitCode ?? 0);
