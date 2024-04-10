import type { Coordinate } from 'ol/coordinate';
import { containsCoordinate  } from 'ol/extent';
import type { Extent } from 'ol/extent';
import { useStore } from '~/store';

export function isPointInExtent(point: Coordinate, extent?: Extent) {
    return containsCoordinate(useStore().extent, point);
}
