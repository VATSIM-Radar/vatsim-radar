import IORedis from 'ioredis';

export function getRedis() {
    console.log(`Initializing Redis on ${ process.env.REDIS_HOST }`);

    return new IORedis({
        host: process.env.REDIS_HOST,
        password: 'RADAR',
        port: 6379,
        family: 4,
        db: 0,
        maxRetriesPerRequest: null,
        autoResubscribe: true,
    });
}
