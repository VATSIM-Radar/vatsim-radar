import sqlite3 from 'better-sqlite3';
import { materializeCycleCache } from '~/utils/server/navigraph/cache';
import type { NavigraphCycleType } from '~/utils/server/navigraph/cache';

const [type, version, dbPath] = process.argv.slice(2);

if ((type !== 'current' && type !== 'outdated') || !version || !dbPath) {
    console.error('Usage: navigraph-cache-builder.ts <current|outdated> <version> <dbPath>');
    process.exit(1);
}

const db = new sqlite3(dbPath, { readonly: true });

try {
    await materializeCycleCache({
        type: type as NavigraphCycleType,
        version,
        db,
    });
}
finally {
    db.close();
}
