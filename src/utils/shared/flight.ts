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
