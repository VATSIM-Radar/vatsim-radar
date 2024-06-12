import sqlite3 from 'sqlite3';

export let navigraphCurrentDb: sqlite3.Database | null = null;
export let navigraphOutdatedDb: sqlite3.Database | null = null;

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
