import type { Coordinate } from 'ol/coordinate.js';
import type { Extent } from 'ol/extent.js';

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

export function getCurrentWorldExtent({ extent, eventCoordinate }: {
    extent: Extent; eventCoordinate: Coordinate;
}): Extent {
    const currentMin = getCurrentWorldCoordinate({
        coordinate: [extent[0], extent[1]],
        eventCoordinate: [eventCoordinate[0], extent[1]],
    });

    return [currentMin[0], extent[1], currentMin[0] + (extent[2] - extent[0]), extent[3]];
}
