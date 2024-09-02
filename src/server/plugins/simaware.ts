import { CronJob } from 'cron';
import { updateSimAware } from '~/utils/backend/vatsim/simaware';

export default defineNitroPlugin(app => {
    CronJob.from({
        cronTime: '15 * * * *',
        runOnInit: true,
        start: true,
        onTick: async () => {
            await updateSimAware();
        },
    });
});
