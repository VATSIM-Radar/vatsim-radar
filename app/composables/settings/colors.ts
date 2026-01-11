import type { UserMapSettingsColor, UserMapSettingsColors } from '~/utils/backend/handlers/map-settings';
import { getCurrentThemeRgbColor } from '~/composables';
import { useStore } from '~/store';

export function shortHexToLong(hex: string) {
    return hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });
}

export function hexToRgb(hex: string): string {
    if (hex.startsWith('rgb')) {
        return `${ hex.split('(')[1].split(')')[0].split(',').slice(0, 3) }`;
    }

    if (!hex.startsWith('#')) return hex;

    // Remove the hash at the start if it's there
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(shortHexToLong(hex.slice(0, 7)));
    if (!result) throw new Error(`Failed to convert color ${ hex } from hex to rgb`);

    // Return the RGB color
    return `${ parseInt(result[1], 16) },${ parseInt(result[2], 16) },${ parseInt(result[3], 16) }`;
}

export function componentToHex(component: number) {
    const hex = component.toString(16);
    return hex.length === 1 ? `0${ hex }` : hex;
}

export function rgbToHex(...colors: number[]): `#${ string }`;
export function rgbToHex(r: number, g: number, b: number): `#${ string }`;
export function rgbToHex(r: number, g: number, b: number): `#${ string }` {
    return `#${ componentToHex(r) }${ componentToHex(g) }${ componentToHex(b) }`;
}

export function getColorFromSettings(setting: UserMapSettingsColor, raw?: boolean) {
    if (!setting.color) return '#000';
    const rgb = getCurrentThemeRgbColor(setting.color as any) ?? setting.color.split(',').map(x => +x) as [number, number, number];
    if (rgb.length !== 3 || rgb.some(x => isNaN(x))) throw new Error(`Color ${ setting.color } contains invalid rgb`);

    if (raw) return rgb.join(',');

    return `rgba(${ rgb.join(',') }, ${ setting.transparency ?? 1 })`;
}

export function getStringColorFromSettings(setting: string | null | undefined, raw?: boolean) {
    if (!setting) return '#000';
    const rgb = getCurrentThemeRgbColor(setting as any) ?? setting.split(',').map(x => +x) as [number, number, number];
    if (rgb.length !== 3 || rgb.some(x => isNaN(x))) throw new Error(`Color ${ setting } contains invalid rgb`);

    if (raw) return rgb.join(',');

    return `rgb(${ rgb.join(',') })`;
}

export function getSelectedColorFromSettings(color: Exclude<keyof UserMapSettingsColors, 'aircraft' | 'staffedAirport' | 'defaultAirport' | 'gates'>, raw?: boolean) {
    const store = useStore();
    const themeKey = store.getCurrentTheme;

    const setting = store.mapSettings.colors?.[themeKey]?.[color];

    return setting ? getColorFromSettings(setting, raw) : null;
}
