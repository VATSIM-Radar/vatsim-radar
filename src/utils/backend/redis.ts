import IORedis from 'ioredis';

export function getRedis() {
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

export const defaultRedis = getRedis();

export function getRedisSync(key: string) {
    return new Promise<string | null | undefined>((resolve, reject) => defaultRedis.get(key, (err, result) => {
        if (err) return reject(err);
        resolve(result);
    }));
}

export function setRedisSync(key: string, data: string, expiration: number) {
    return new Promise<void>((resolve, reject) => defaultRedis.set(key, data, 'PXAT', expiration, (err, result) => {
        if (err) return reject(err);
        resolve();
    }));
}
