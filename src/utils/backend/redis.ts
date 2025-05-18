import IORedis from 'ioredis';
import type { VatsimBooking, VatsimDivision, VatsimEvent, VatsimSubDivision } from '~/types/data/vatsim';
import type { cycles } from '~/utils/backend/navigraph/db';
import type { PatreonInfo } from '~/types/data/patreon';
import type { RadarDataAirlinesAllList, SimAwareData, VatglassesData, VatglassesDynamicAPIData } from '~/utils/backend/storage';
import type { VatSpyData } from '~/types/data/vatspy';

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

export type RedisDataGet<T extends Record<string, any> | any[], D extends T | null = null> = () => Promise<T | D>;

export interface RedisData {
    'data-vatspy': {
        version: string;
        data: VatSpyData;
    };
    'data-simaware': {
        version: string;
        data: SimAwareData;
    };
    'data-vatglasses': {
        version: string;
        data: VatglassesData;
    };
    'data-vatglasses-dynamic': VatglassesDynamicAPIData;
    'data-divisions': VatsimDivision[];
    'data-subdivisions': VatsimSubDivision[];
    'data-events': VatsimEvent[];
    'data-navigraph': typeof cycles;
    'data-patreon': PatreonInfo;
    'data-bookings': VatsimBooking[];
    'data-airlines': RadarDataAirlinesAllList;
}

export async function getRedisData<K extends keyof RedisData, D extends RedisData[K], T = RedisData[K]>(key: K, defaults: D): Promise<T | D>;
export async function getRedisData<K extends keyof RedisData>(key: K): Promise<RedisData[K] | null>;
export async function getRedisData<K extends keyof RedisData, D extends RedisData[K] | undefined = RedisData[K] | undefined>(key: K, defaults?: D): Promise<RedisData[K] | null> {
    const data = await getRedisSync(key);
    if (typeof data === 'string') return JSON.parse(data) as RedisData[K];
    return defaults || data || null;
}

export async function setRedisData<K extends keyof RedisData>(key: K, data: RedisData[K], expireIn: number) {
    await setRedisSync(key, JSON.stringify(data), expireIn);
    await defaultRedis.publish('update', key);
}

export function setRedisSync(key: string, data: string, expireIn: number) {
    return new Promise<void>((resolve, reject) => defaultRedis.set(key, data, 'PX', expireIn, (err, result) => {
        if (err) return reject(err);
        resolve();
    }));
}

export function unsetRedisSync(key: string) {
    return new Promise<void>((resolve, reject) => defaultRedis.del(key, (err, result) => {
        if (err) return reject(err);
        resolve();
    }));
}
