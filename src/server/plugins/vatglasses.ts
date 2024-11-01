import { getRedis } from '~/utils/backend/redis';
import { radarStorage } from '~/utils/backend/storage';
import { CronJob } from 'cron';
import { updateVatglassesData } from '~/utils/backend/vatglasses';

const redisSubscriber = getRedis();
export default defineNitroPlugin(app => {
    CronJob.from({
        cronTime: '15 */2 * * *',
        start: true,
        runOnInit: true,
        onTick: async () => {
            await updateVatglassesData();
        },
    });

    redisSubscriber.subscribe('vatglassesActive');
    redisSubscriber.on('message', (_, message) => {
        radarStorage.vatglasses.activeData = message;
    });
});
