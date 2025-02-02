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

export function isProductionMode() {
    return typeof process !== 'undefined' ? process.env.DOMAIN === 'https://vatsim-radar.com' : useRuntimeConfig().public.DOMAIN === 'https://vatsim-radar.com';
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

export function isNumber(val: unknown, allowedAfterDot = 0): val is number {
    if (typeof val !== 'number' || Number.isNaN(val)) return false;

    const split = val.toString().split('.')[1];
    if (!split || split.length <= allowedAfterDot) return true;
    return false;
}

export function getVACallsign(remarks: string): { callsign: string; name: string | null } | null {
    const exec = /(CS[\/-=]|CALLSIGN([\/-=]| ))(?<callsign>[A-Z -]+)(([\/-=](?<name>[A-Z -]+)((?= ([- A-Z]+)?[\/-=][A-Z-])|((?= [A-Z-]+[\/-=][A-Z-]))|(?=$)))|((?= ([ A-Z-]+)?[\/-=][A-Z-]))|((?= [A-Z-]+[\/-=][A-Z-]))|(?=$))/.exec(remarks);
    if (exec?.groups && exec?.groups?.callsign) {
        const callsign = exec.groups.callsign?.replace('VATSIMVA', '').split('TCAS')[0].split('SIMBRIEF')[0].trim();
        if (!callsign) return null;

        return {
            callsign,
            name: exec.groups.name ? exec.groups.name.trim() : null,
        };
    }

    return null;
}

export function getVAWebsite(remarks: string) {
    const website = /WEB[\/-=](?<website>.+?)((?= )|(?=$))/.exec(remarks)?.groups?.website?.toLowerCase() ?? null;

    if (!website) return website;

    try {
        if (website.startsWith('http')) {
            new URL(website);
            return website;
        }

        new URL(`https://${ website }`);
        return `https://${ website }`;
    }
    catch {
        console.warn(`Failed to parse VA url from ${ remarks } (result: ${ website })`);
        return null;
    }
}

export function addLeadingZero(str: string | number) {
    return `0${ str }`.slice(-2);
}
