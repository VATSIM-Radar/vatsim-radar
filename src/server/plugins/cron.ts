import { defineCronJob } from '~/utils/backend';
import { initNavigraph, navigraphCurrentDb } from '~/utils/backend/navigraph/db';
import { setupRedisDataFetch } from '~/utils/backend/tasks';
import { radarStorage } from '~/utils/backend/storage';
import { getRedis } from '~/utils/backend/redis';
import { processDatabase } from '~/utils/backend/navigraph/navdata';

const redisSubscriber = getRedis();

export default defineNitroPlugin(async app => {
    setupRedisDataFetch();

    redisSubscriber.subscribe('vatglassesActive');
    redisSubscriber.on('message', (_, message) => {
        radarStorage.vatglasses.activeData = message;
    });

    await defineCronJob('15 */2 * * *', initNavigraph);
});
