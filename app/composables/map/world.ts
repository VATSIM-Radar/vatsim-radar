import type { Coordinate } from 'ol/coordinate.js';

function modPositive(x: number, m: number) {
    return ((x % m) + m) % m;
}

export function getOriginalWorldCoordinate({ eventCoordinate }: {
    eventCoordinate: Coordinate;
}) {
    const originalX = modPositive(eventCoordinate[0] + 180, 360) - 180;

    return [originalX, eventCoordinate[1]];
}

export function getCurrentWorldCoordinate({ coordinate, eventCoordinate }: {
    coordinate: Coordinate; eventCoordinate: Coordinate;
}): Coordinate {
    const worldIndex = Math.floor((eventCoordinate[0] + 180) / 360);
    const localCoordinate = modPositive((coordinate[0] + 180), 360) - 180;

    return [localCoordinate + (worldIndex * 360), eventCoordinate[1]];
}
