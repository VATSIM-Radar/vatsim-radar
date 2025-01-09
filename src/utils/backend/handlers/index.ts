import { colorsList } from '~/utils/backend/styles';
import { hexColorRegex, isObject } from '~/utils/shared';

const colors = Object.keys(colorsList);

export function validateTransparency(transparency: unknown) {
    if (typeof transparency !== 'number' || transparency > 1 || transparency < 0) return false;
    return Number(transparency.toFixed(2));
}

export function validateColor(color: unknown, asString = false): boolean {
    if (!isObject(color)) {
        if (asString && typeof color === 'string') {
            if (!hexColorRegex.test(color) && !colors.includes(color)) return false;
            return true;
        }

        return false;
    }

    if (typeof color.color !== 'string' || (!hexColorRegex.test(color.color) && !colors.includes(color.color))) return false;

    if ('transparency' in color) {
        const transparency = validateTransparency(color.transparency);
        if (transparency !== false) {
            color.transparency = transparency;
        }
        else {
            return false;
        }
    }

    return true;
}

export function validateRandomObjectKeys(object: Record<string, unknown>, allowedKeys: string[]): boolean {
    for (const key in object) {
        if (!allowedKeys.includes(key)) return false;
    }

    return true;
}

