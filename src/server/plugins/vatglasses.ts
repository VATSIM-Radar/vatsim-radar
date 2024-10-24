import { getRedis } from '~/utils/backend/redis';
import { radarStorage } from '~/utils/backend/storage';

const redisSubscriber = getRedis();
export default defineNitroPlugin(app => {
    redisSubscriber.subscribe('vatglassesActive');
    redisSubscriber.on('message', (_, message) => {
        radarStorage.vatglasses.activeData = message;
    });
});
