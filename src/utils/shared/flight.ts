import type { Coordinate } from 'ol/coordinate';
import { toRadians } from 'ol/math';

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

export const colorPresets = {
    light: ['#feae77', '#fe9f6d', '#fd9266', '#fb8560', '#f8765c', '#f4695c', '#ef5d5e', '#e75263', '#d3436e', '#bc3978', '#a5317e', '#8c2981', '#752181', '#5f187f', '#471078', '#2d1161'],
    dark: ['#fddea0', '#fed395', '#fec88c', '#febf84', '#feb47b', '#fea973', '#fe9d6c', '#fd9266', '#fa7d5e', '#f4675c', '#e95462', '#db476a', '#c83e73', '#b5367a', '#a3307e', '#902a81'],
} satisfies Record<string, ColorPreset>;


export function getFlightRowGroup(altitude?: number | null): number | null {
    const rowGroup: number | null = null;

    if (!altitude) return rowGroup;

    const alt = altitude - 100;

    const index = colorSteps.findIndex(x => alt <= x);
    if (index === -1) return colorSteps[colorSteps.length - 1];
    return index;
}
