import IORedis from 'ioredis';

export const redis = new IORedis({
    host: process.env.REDIS_HOST,
    password: 'RADAR',
    port: 6379,
    family: 4,
    db: 0,
    maxRetriesPerRequest: null,
    autoResubscribe: true,
});
