import { getRedis } from '~/utils/backend/redis';
import { radarStorage } from '~/utils/backend/storage';
import { updateVatglassesData } from '~/utils/backend/vatglasses';
import { defineCronJob } from '~/utils/backend';

const redisSubscriber = getRedis();
export default defineNitroPlugin(app => {
    defineCronJob('15 */2 * * *', updateVatglassesData);

    redisSubscriber.subscribe('vatglassesActive');
    redisSubscriber.on('message', (_, message) => {
        radarStorage.vatglasses.activeData = message;
    });
});
