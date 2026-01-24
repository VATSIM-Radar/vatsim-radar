import type { Coordinate } from 'ol/coordinate.js';
import { toRadians } from 'ol/math.js';
import type { UserMapSettingsTurns } from '~/utils/server/handlers/map-settings';

export function calculateDistanceInNauticalMiles([lon1, lat1]: Coordinate, [lon2, lat2]: Coordinate): number {
    const earthRadiusInNauticalMiles = 3440.065;

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        (Math.sin(dLat / 2) * Math.sin(dLat / 2)) +
        (
            Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2)
        );

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusInNauticalMiles * c;
}

export function calculateProgressPercentage(current: Coordinate, dep: Coordinate, dest: Coordinate): number {
    const totalDistance = calculateDistanceInNauticalMiles(dep, dest);
    const remainingDistance = calculateDistanceInNauticalMiles(current, dest);

    return ((totalDistance - remainingDistance) / totalDistance) * 100;
}

export function calculateArrivalTime(current: Coordinate, dest: Coordinate, groundSpeed: number): Date {
    const distance = calculateDistanceInNauticalMiles(current, dest);
    const timeInHours = distance / groundSpeed;

    const currentTime = new Date();

    const timeInMillis = timeInHours * 60 * 60 * 1000;

    return new Date(currentTime.getTime() + timeInMillis);
}

export const colorSteps = [2500, 5000, 7500, 10000, 12500, 15000, 17500, 20000, 25000, 30000, 35000, 40000, 45000, 50000, 55000, 60000];
type ColorPreset = [string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string];

export const colorPresets: Record<UserMapSettingsTurns, { dark: ColorPreset; light: ColorPreset }> = {
    magma: {
        light: ['#feae77', '#fe9f6d', '#fd9266', '#fb8560', '#f8765c', '#f4695c', '#ef5d5e', '#e75263', '#d3436e', '#bc3978', '#a5317e', '#8c2981', '#752181', '#5f187f', '#471078', '#2d1161'],
        dark: ['#fddea0', '#fed395', '#fec88c', '#febf84', '#feb47b', '#fea973', '#fe9d6c', '#fd9266', '#fa7d5e', '#f4675c', '#e95462', '#db476a', '#c83e73', '#b5367a', '#a3307e', '#902a81'],
    },
    inferno: {
        light: ['#fcb418', '#fca50a', '#fb9706', '#f98b0b', '#f57d15', '#f1711f', '#eb6628', '#e45a31', '#d44842', '#c03a51', '#ab2f5e', '#932667', '#7c1d6d', '#65156e', '#4d0d6c', '#340a5f'],
        dark: ['#f2e661', '#f5db4c', '#f8cf3a', '#fac62d', '#fbba1f', '#fcae12', '#fca309', '#fb9706', '#f78410', '#f06f20', '#e65d2f', '#da4e3c', '#cb4149', '#ba3655', '#a92e5e', '#972766'],
    },
    rainbow: {
        light: ['#ff8344', '#ff964f', '#ffa85a', '#fbb864', '#edc76f', '#ded579', '#d0e183', '#c1ea8c', '#a4f99f', '#87ffb0', '#6afdc0', '#4df3ce', '#2fe1db', '#12c7e6', '#0ba8ef', '#2883f6'],
        dark: ['#ff361b', '#ff4824', '#ff592d', '#ff6a36', '#ff7a3f', '#ff8a48', '#ff9951', '#ffa759', '#f3c16a', '#dcd77a', '#c5e88a', '#aef599', '#97fca7', '#80ffb4', '#68fcc1', '#51f5cc'],
    },
    viridis: {
        light: ['#8ed645', '#7ad151', '#69cd5b', '#5ac864', '#4ac16d', '#3dbc74', '#32b67a', '#28ae80', '#1fa187', '#20938c', '#24868e', '#2a788e', '#306a8e', '#365c8d', '#3e4c8a', '#443a83'],
        dark: ['#86d549', '#7ad151', '#6ece58', '#63cb5f', '#58c765', '#4ec36b', '#44bf70', '#3bbb75', '#2cb17e', '#22a884', '#1f9f88', '#1f958b', '#228b8d', '#26828e', '#2a788e', '#2e6f8e'],
    },
};

export function getFlightRowGroup(altitude?: number | null): number | null {
    if (!altitude) return 0;

    const alt = (altitude || 0) - 100;

    const index = colorSteps.findIndex(x => alt <= x);
    if (index === -1) return colorSteps.length - 1;
    return index;
}
