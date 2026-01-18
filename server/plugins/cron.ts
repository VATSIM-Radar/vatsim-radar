import { defineCronJob } from '~/utils/server';
import { initNavigraph } from '~/utils/server/navigraph/db';
import { setupRedisDataFetch } from '~/utils/server/tasks';
import { radarStorage } from '~/utils/server/storage';
import { getRedis } from '~/utils/server/redis';

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

    await defineCronJob('45 */2 * * *', initNavigraph);
});
