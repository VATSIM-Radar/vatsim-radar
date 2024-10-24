import IORedis from 'ioredis';

export function getRedis() {
    return new IORedis({
        host: 'localhost',
        password: 'RADAR',
        port: 6379,
        family: 4,
        db: 0,
    });
}
