import { radarStorage } from '~/utils/server/storage';
import { getRedis } from '~/utils/server/redis';

export default defineNitroPlugin(app => {
    const redisSubscriber = getRedis();
    redisSubscriber.subscribe('data');
    redisSubscriber.on('message', (_, message) => {
        radarStorage.vatsim = JSON.parse(message);
    });
});
