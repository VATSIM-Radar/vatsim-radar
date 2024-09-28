import type { UserMapSettingsColor, UserMapSettingsColors } from '~/utils/backend/map-settings';
import { getCurrentThemeRgbColor } from '~/composables/index';
import { useStore } from '~/store';
import { useMapStore } from '~/store/map';

export function shortHexToLong(hex: string) {
    return hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });
}

export function hexToRgb(hex: string): string {
    // Remove the hash at the start if it's there
    hex = shortHexToLong(hex).replace(/^#/, '');

    // Parse the r, g, b values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Return the RGB color
    return `${ r },${ g },${ b }`;
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

export function getSelectedColorFromSettings(color: Exclude<keyof UserMapSettingsColors, 'aircraft'>, raw?: boolean) {
    const store = useStore();
    const themeKey = store.getCurrentTheme;

    const setting = store.mapSettings.colors?.[themeKey]?.[color];

    return setting ? getColorFromSettings(setting, raw) : null;
}
