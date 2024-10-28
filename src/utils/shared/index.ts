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
