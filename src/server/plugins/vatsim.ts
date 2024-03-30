import { CronJob } from 'cron';
import { ofetch } from 'ofetch';
import type { VatsimData } from '~/types/data/vatsim';
import { radarStorage } from '~/utils/backend/storage';

let abort: AbortController | null = null;

export default defineNitroPlugin((app) => {
    CronJob.from({
        cronTime: '*/5 * * * * *',
        runOnInit: true,
        onTick: async () => {
            try {
                abort?.abort();
                abort = new AbortController();
                radarStorage.vatsim.data = await ofetch<VatsimData>('https://data.vatsim.net/v3/vatsim-data.json', { signal: abort.signal });
            }
            catch (e) {
                console.error(e);
            }
            finally {
                abort = null;
            }
        },
    });
});
