import type { CronOptions } from 'croner';
import { Cron } from 'croner';
import type { H3Event } from 'h3';
import { dirname } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

export function defineCronJob(pattern: string, func: () => any, options?: CronOptions & { runOnInit?: true }): Promise<Cron>;
export function defineCronJob(pattern: string, func: () => any, options: CronOptions & { runOnInit: false }): Cron;
export function defineCronJob(pattern: string, func: () => any, options?: CronOptions & { runOnInit?: boolean }): Cron | Promise<Cron> {
    const cron = new Cron(pattern, {
        // protect: true,
        ...options,
    }, async () => {
        await func().catch(console.error);
    });

    if (options?.runOnInit !== false) {
        return new Promise(async resolve => {
            await cron.trigger().catch(console.error);

            resolve(cron);
        });
    }

    return cron;
}

let firstLog = false;

export function getVATSIMIdentHeaders(): Record<string, string> {
    const token = process.env.VATSIM_IDENT_TOKEN;

    if (!token) {
        if (!firstLog) {
            firstLog = true;
            console.log('VATSIM_IDENT_TOKEN is missing');
        }

        return {};
    }

    if (!firstLog) {
        firstLog = true;
        console.log('VATSIM_IDENT_TOKEN is present');
    }

    return {
        'User-Agent': token,
    };
}

export function writeJsonFile(path: string, data: unknown) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(data));
}

export function readJsonFile<T>(path: string): T | null {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export function getRedirectURL(event: H3Event) {
    const config = useRuntimeConfig();
    const query = getQuery(event) as Record<string, string>;

    if (typeof query.state === 'string' && query.state.endsWith('-iframe')) {
        return `efbx://app/open?id=vatsimradar&refresh=1`;
    }

    const redirectCookie = getCookie(event, 'redirect');
    if (redirectCookie) {
        try {
            const redirectUrl = new URL(redirectCookie);
            const domain = new URL(config.public.DOMAIN);

            if (redirectUrl.origin === domain.origin) return redirectCookie;
        }
        catch { /* empty */ }
    }

    return config.public.DOMAIN;
}
