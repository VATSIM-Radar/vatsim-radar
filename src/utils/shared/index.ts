import type { FetchError } from 'ofetch';

export function isArray(val: unknown) {
    return Array.isArray(val);
}

export function isObject(val: any): val is Record<string, unknown> {
    return val && typeof val === 'object' && !isArray(val);
}

// I wrote this myself and very proud tbh
// #123faa, #123, rgba(1,12,123,1), rgb(1,12,123), 1,2,3
export const hexColorRegex = /^((#([0-9A-Z]{3}|[0-9A-Z]{6}))|(rgb(a?)\(\d{1,3},( ?)\d{1,3},( ?)\d{1,3}(\)|,( ?)[0-9.]{1,4}\)))|(\d{1,3},\d{1,3},\d{1,3}))$/i;

export const MAX_MAP_PRESETS = 5;
export const MAX_USER_LISTS = 5;
export const MAX_LISTS_PILOTS = 50;

export function isFetchError<T>(error: unknown): error is FetchError<T> {
    return !!error && typeof error === 'object' && 'request' in error && 'response' in error;
}

export function isRunwayEast(runway: string | number) {
    if (typeof runway === 'string') runway = parseInt(runway, 10);

    return runway > 16;
}
