import IORedis from 'ioredis';
import type { VatSpyData } from '~/types/data/vatspy';
import type { RadarDataAirlinesAllList, SimAwareData, VatglassesData } from '~/utils/backend/storage';
import type { VatsimDivision, VatsimEvent, VatsimSubDivision } from '~/types/data/vatsim';
import type { cycles } from '~/utils/backend/navigraph-db';
import type { PatreonInfo } from '~/types/data/patreon';

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
    'data-divisions': VatsimDivision[];
    'data-subdivisions': VatsimSubDivision[];
    'data-events': VatsimEvent[];
    'data-navigraph': typeof cycles;
    'data-patreon': PatreonInfo;
    'data-airlines': RadarDataAirlinesAllList;
}

export async function getRedisData<K extends keyof RedisData, D extends RedisData[K], T = RedisData[K]>(key: K, defaults: D): Promise<T | D>;
export async function getRedisData<K extends keyof RedisData, T = RedisData[K]>(key: K): Promise<T | null>;
export async function getRedisData<K extends keyof RedisData, T = RedisData[K], D extends T | undefined = T | undefined>(key: K, defaults?: D): Promise<T | null> {
    const data = await getRedisSync(key);
    if (typeof data === 'string') return JSON.parse(data) as T;
    return defaults || data || null;
}

export function setRedisData<K extends keyof RedisData, T = RedisData[K]>(key: K, data: T, expireIn: number) {
    return setRedisSync(key, JSON.stringify(data), expireIn);
}

export function setRedisSync(key: string, data: string, expireIn: number) {
    return new Promise<void>((resolve, reject) => defaultRedis.set(key, data, 'PX', expireIn, (err, result) => {
        if (err) return reject(err);
        resolve();
    }));
}
