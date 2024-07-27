import { CronJob } from 'cron';
import { updateVatSpy } from '~/utils/backend/vatsim/vatspy';

export default defineNitroPlugin(app => {
    CronJob.from({
        cronTime: '15 * * * *',
        runOnInit: true,
        start: true,
        onTick: async () => {
            await updateVatSpy();
        },
    });
});
