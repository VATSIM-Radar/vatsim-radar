import type { Coordinate } from 'ol/coordinate.js';
import type Map from 'ol/Map.js';


export function getOriginalCoordinate(coordinate: Coordinate, eventCoordinate: Coordinate) {

}

function modPositive(x: number, m: number) {
    return ((x % m) + m) % m;
}

export function getCurrentWorldCoordinate({ coordinate, eventCoordinate, map}: {
    coordinate: Coordinate; eventCoordinate: Coordinate; map: Map;
}) {
    const size = map.getSize()![0];
    const worldIndex = Math.floor(eventCoordinate[0] / size);
    const localCoordinate = modPositive(coordinate[0], size);

    return localCoordinate + (worldIndex * size);
}
