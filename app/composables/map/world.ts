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
    const localCoordinate = modPositive((coordinate[0] + 180), 360) - 180;
    const worldIndex = Math.round((eventCoordinate[0] - localCoordinate) / 360);

    return [localCoordinate + (worldIndex * 360), eventCoordinate[1]];
}

export function getCurrentWorldExtent({ extent, eventCoordinate }: {
    extent: Extent; eventCoordinate: Coordinate;
}): Extent {
    const extentCenter: Coordinate = [
        (extent[0] + extent[2]) / 2,
        (extent[1] + extent[3]) / 2,
    ];
    const currentCenter = getCurrentWorldCoordinate({
        coordinate: extentCenter,
        eventCoordinate,
    });
    const offsetX = currentCenter[0] - extentCenter[0];

    return [extent[0] + offsetX, extent[1], extent[2] + offsetX, extent[3]];
}
