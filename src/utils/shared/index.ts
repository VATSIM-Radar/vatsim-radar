import type { FetchError } from 'ofetch';

export function isArray(val: unknown): val is unknown[] {
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
export const MAX_FILTERS = 5;
export const MAX_BOOKMARKS = 20;
export const MAX_FILTER_ARRAY_VALUE = 30;

export function isFetchError<T>(error: unknown): error is FetchError<T> {
    return !!error && typeof error === 'object' && 'request' in error && 'response' in error;
}

export function isRunwayEast(runway: string | number) {
    if (typeof runway === 'string') runway = parseInt(runway, 10);

    return runway > 16;
}

export interface FilterAltitudeConfig {
    strategy: 'below' | 'above';
    altitude: number;
}

export function parseFilterAltitude(altitude: string): FilterAltitudeConfig[] {
    const altitudes = altitude.split('/').slice(0, 2);

    if (!altitudes.length) return [];

    const config: FilterAltitudeConfig[] = [];

    for (let altitude of altitudes) {
        let strategy: FilterAltitudeConfig['strategy'];

        if (altitude.startsWith('+')) strategy = 'above';
        else if (altitude.startsWith('-')) strategy = 'below';
        else return [];

        altitude = altitude.slice(1, altitude.length);

        if (altitude.startsWith('FL')) altitude = `${ altitude.replace('FL', '') }00`;
        const number = Number(altitude);
        if (isNaN(number)) return [];
        if (number < 1 || number > 99999) return [];

        config.push({
            strategy,
            altitude: number,
        });
    }

    if (config.length === 2) {
        if (config[0].strategy === config[1].strategy) return [];
        if (config[0].strategy === 'below' && config[0].altitude < config[1].altitude) return [];
        if (config[0].strategy === 'above' && config[1].altitude < config[0].altitude) return [];
    }

    return config;
}
