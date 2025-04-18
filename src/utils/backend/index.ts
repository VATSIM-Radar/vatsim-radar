import type { CronOptions } from 'croner';
import { Cron } from 'croner';

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
