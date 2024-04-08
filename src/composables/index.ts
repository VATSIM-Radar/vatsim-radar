import type { Coordinate } from 'ol/coordinate';
import { containsCoordinate } from 'ol/extent';
import { useStore } from '~/store';

export function isPointInExtent(point: Coordinate) {
    return containsCoordinate(useStore().extent, point);
}
