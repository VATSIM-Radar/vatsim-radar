import { defineCronJob } from '~/utils/backend';
import { initNavigraph } from '~/utils/backend/navigraph-db';
import { setupRedisDataFetch } from '~/utils/backend/tasks';
import { radarStorage } from '~/utils/backend/storage';
import { getRedis } from '~/utils/backend/redis';

const redisSubscriber = getRedis();

export default defineNitroPlugin(app => {
    setupRedisDataFetch();

    redisSubscriber.subscribe('vatglassesActive');
    redisSubscriber.on('message', (_, message) => {
        radarStorage.vatglasses.activeData = message;
    });

    defineCronJob('15 */2 * * *', initNavigraph);
});
