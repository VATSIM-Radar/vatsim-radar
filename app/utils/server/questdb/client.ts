import net from 'node:net';

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

function getQuestDBHost() {
    return process.env.QUESTDB_HOST || 'questdb';
}

function getQuestDBHttpUrl() {
    if (process.env.QUESTDB_HTTP_URL) return process.env.QUESTDB_HTTP_URL;

    const port = process.env.QUESTDB_HTTP_PORT || '9000';
    return `http://${ getQuestDBHost() }:${ port }`;
}

function getQuestDBIlpHost() {
    return process.env.QUESTDB_ILP_HOST || getQuestDBHost();
}

function getQuestDBIlpPort() {
    return Number(process.env.QUESTDB_ILP_PORT || 9009);
}

export function isQuestDBConfigured() {
    return !!(process.env.QUESTDB_HTTP_URL || process.env.QUESTDB_HOST);
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

export async function questDBWrite(lines: string[]) {
    if (!lines.length) return;

    const host = getQuestDBIlpHost();
    const port = getQuestDBIlpPort();
    const timeoutMs = Number(process.env.QUESTDB_WRITE_TIMEOUT || 1000 * 30);
    const payload = `${ lines.join('\n') }\n`;

    await new Promise<void>((resolve, reject) => {
        const socket = net.createConnection({ host, port });
        const timeout = setTimeout(() => {
            socket.destroy(new Error(`QuestDB write timed out after ${ timeoutMs }ms`));
        }, timeoutMs);

        socket.once('connect', () => {
            socket.end(payload);
        });

        socket.once('error', error => {
            clearTimeout(timeout);
            reject(error);
        });

        socket.once('close', hadError => {
            clearTimeout(timeout);
            if (hadError) return;
            resolve();
        });
    });
}
