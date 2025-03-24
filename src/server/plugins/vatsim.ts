import { radarStorage } from '~/utils/backend/storage';
import { getRedis } from '~/utils/backend/redis';

export default defineNitroPlugin(app => {
    const redisSubscriber = getRedis();
    redisSubscriber.subscribe('data');
    redisSubscriber.on('message', (_, message) => {
        radarStorage.vatsim = JSON.parse(message);
    });
});
