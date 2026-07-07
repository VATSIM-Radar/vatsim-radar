import { Sender } from '@questdb/nodejs-client';

type QuestDBExecResponse = {
    columns?: {
        name: string;
        type: string;
    }[];
    dataset?: unknown[][];
    error?: string;
    message?: string;
};

export type QuestDBRow = Record<string, unknown>;
export type QuestDBWriteValue = string | number | boolean;
export type QuestDBWriteRow = {
    table: string;
    symbols?: Record<string, QuestDBWriteValue>;
    columns: Record<string, QuestDBWriteValue>;
    timestampMs: number;
};

function getQuestDBHost() {
    return process.env.QUESTDB_HOST || 'questdb';
}

function getQuestDBHttpUrl() {
    if (process.env.QUESTDB_HTTP_URL) return process.env.QUESTDB_HTTP_URL;

    const port = process.env.QUESTDB_HTTP_PORT || '9000';
    return `http://${ getQuestDBHost() }:${ port }`;
}

export function isQuestDBConfigured() {
    return !!(process.env.QUESTDB_CLIENT_CONF || process.env.QUESTDB_HTTP_URL || process.env.QUESTDB_HOST);
}

export function initQuestDB() {
    if (!isQuestDBConfigured()) return;
}

export async function questDBQuery<T extends QuestDBRow = QuestDBRow>(query: string): Promise<T[]> {
    const url = new URL('/exec', getQuestDBHttpUrl());
    url.searchParams.set('query', query);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(process.env.QUESTDB_QUERY_TIMEOUT || 1000 * 60));

    try {
        const response = await fetch(url, {
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`QuestDB query failed with HTTP ${ response.status }: ${ await response.text() }`);
        }

        const data = await response.json() as QuestDBExecResponse;
        if (data.error || data.message) {
            throw new Error(data.error || data.message);
        }

        const columns = data.columns ?? [];
        return (data.dataset ?? []).map(row => Object.fromEntries(columns.map((column, index) => [column.name, row[index]])) as T);
    }
    finally {
        clearTimeout(timeout);
    }
}

let questDBSender: Promise<Sender> | undefined;

function getQuestDBSenderConfig() {
    if (process.env.QUESTDB_CLIENT_CONF) return process.env.QUESTDB_CLIENT_CONF;

    const url = new URL(getQuestDBHttpUrl());
    const protocol = url.protocol === 'https:' ? 'https' : 'http';
    const options = [
        `${ protocol }::addr=${ url.host }`,
        'auto_flush=off',
        `request_timeout=${ Number(process.env.QUESTDB_WRITE_TIMEOUT || 1000 * 30) }`,
        `retry_timeout=${ Number(process.env.QUESTDB_RETRY_TIMEOUT || 1000 * 10) }`,
    ];

    if (process.env.QUESTDB_USERNAME) options.push(`username=${ process.env.QUESTDB_USERNAME }`);
    if (process.env.QUESTDB_PASSWORD) options.push(`password=${ process.env.QUESTDB_PASSWORD }`);
    if (process.env.QUESTDB_TOKEN) options.push(`token=${ process.env.QUESTDB_TOKEN }`);

    return options.join(';');
}

async function getQuestDBSender() {
    questDBSender ||= Sender.fromConfig(getQuestDBSenderConfig()).catch(error => {
        questDBSender = undefined;
        throw error;
    });

    return questDBSender;
}

function addQuestDBColumn(sender: Sender, key: string, value: QuestDBWriteValue) {
    if (typeof value === 'string') return sender.stringColumn(key, value);
    if (typeof value === 'boolean') return sender.booleanColumn(key, value);
    if (key === 'latitude' || key === 'longitude' || !Number.isInteger(value)) return sender.floatColumn(key, value);
    return sender.intColumn(key, value);
}

export async function questDBWrite(rows: QuestDBWriteRow[]) {
    if (!rows.length) return;

    const sender = await getQuestDBSender();

    for (const row of rows) {
        sender.table(row.table);

        for (const [key, value] of Object.entries(row.symbols ?? {})) {
            sender.symbol(key, value);
        }

        for (const [key, value] of Object.entries(row.columns)) {
            addQuestDBColumn(sender, key, value);
        }

        await sender.at(row.timestampMs, 'ms');
    }

    await sender.flush();
}
