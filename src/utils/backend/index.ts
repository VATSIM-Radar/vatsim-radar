import type { CronOptions } from 'croner';
import { Cron } from 'croner';

export function defineCronJob(pattern: string, func: () => any, options?: CronOptions & { runOnInit?: true }): Promise<Cron>;
export function defineCronJob(pattern: string, func: () => any, options: CronOptions & { runOnInit: false }): Cron;
export function defineCronJob(pattern: string, func: () => any, options?: CronOptions & { runOnInit?: boolean }): Cron | Promise<Cron> {
    const cron = new Cron(pattern, {
        // protect: true,
        ...options,
    }, func);

    if (options?.runOnInit !== false) {
        return new Promise(async (resolve, reject) => {
            try {
                await cron.trigger();

                resolve(cron);
            }
            catch (e) {
                reject(e);
            }
        });
    }

    return cron;
}
