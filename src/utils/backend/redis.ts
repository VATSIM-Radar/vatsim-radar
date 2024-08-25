import IORedis from 'ioredis';

export const redis = new IORedis({
    host: 'redis',
    password: 'RADAR',
    port: 6379,
    family: 4,
    db: 0,
});
