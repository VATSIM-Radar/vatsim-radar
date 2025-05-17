import { defineCronJob } from '~/utils/backend';
import { initNavigraph } from '~/utils/backend/navigraph/db';
import { setupRedisDataFetch } from '~/utils/backend/tasks';
import { radarStorage } from '~/utils/backend/storage';
import { getRedis } from '~/utils/backend/redis';

const redisSubscriber = getRedis();

export default defineNitroPlugin(async app => {
    setupRedisDataFetch();

    redisSubscriber.subscribe('vatglassesActive', 'vatglassesDynamic');
    redisSubscriber.on('message', async (channel, message) => {
        if (channel === 'vatglassesActive') {
            radarStorage.vatglasses.activeData = message;
        }
        else if (channel === 'vatglassesDynamic') {
            radarStorage.vatglasses.dynamicData = JSON.parse(message);
        }
    });

    await defineCronJob('15 */2 * * *', initNavigraph);
});
