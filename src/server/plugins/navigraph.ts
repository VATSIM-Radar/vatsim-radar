import { CronJob } from 'cron';
import {
    initNavigraph,
} from '~/utils/backend/navigraph-db';

export default defineNitroPlugin(app => {
    CronJob.from({
        cronTime: '15 */2 * * *',
        start: true,
        runOnInit: true,
        onTick: async () => {
            await initNavigraph();
        },
    });
});
