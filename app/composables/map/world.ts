import type { Coordinate } from 'ol/coordinate.js';

function modPositive(x: number, m: number) {
    return ((x % m) + m) % m;
}

export function getOriginalWorldCoordinate({ eventCoordinate }: {
    eventCoordinate: Coordinate;
}) {
    const originalX = modPositive(eventCoordinate[0], 360);

    return [originalX, eventCoordinate[1]];
}

export function getCurrentWorldCoordinate({ coordinate, eventCoordinate }: {
    coordinate: Coordinate; eventCoordinate: Coordinate;
}) {
    const worldIndex = Math.floor(eventCoordinate[0] / 360);
    const localCoordinate = modPositive(coordinate[0], 360);

    return localCoordinate + (worldIndex * 360);
}
