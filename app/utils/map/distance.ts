import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import type { Options as TextOptions } from 'ol/style/Text';
import type { Coordinate } from 'ol/coordinate.js';
import { LineString, Point } from 'ol/geom.js';
import greatCircle from '@turf/great-circle';
import { point } from '@turf/helpers';
import { transform } from 'ol/proj.js';
import { Fill, Text, Style } from 'ol/style.js';
import { getCurrentThemeRgbColor } from '~/composables';
import type { GeometryFunction } from 'ol/interaction/Draw';

export type HeadingPair = {
    from: string | null;
    to: string | null;
};

export const GREAT_CIRCLE_POINTS = 128;
export const HEADING_SAMPLE_STEP = 0.01;
export const HEADING_LABEL_FRACTION = 0.02;
export const HEADING_LABEL_MIN_PIXELS = 12;

/**
 * we normalize the angle for the label, so if it's more than 90 degrees, we flip it
 * this way the label is always readable otherwise if could be upside down if we measure anything over 90 deg
 */

export function normalizeAngle(angleRad: number) {
    let angle = angleRad;

    if (angle > Math.PI / 2) angle -= Math.PI;
    if (angle < -Math.PI / 2) angle += Math.PI;

    return angle;
}

export function headingToString(value: number | null) {
    if (value == null || Number.isNaN(value)) return '---';
    return String(((Math.round(value) % 360) + 360) % 360).padStart(3, '0');
}

export function projectForOrientation(map: ShallowRef<Map | null>, coord?: Coordinate | null): Coordinate | null {
    if (!coord) return null;

    const projection = map.value?.getView().getProjection();

    if (!projection) return coord;

    if (projection.getCode() !== 'EPSG:4326') {
        return transform(coord.slice() as Coordinate, 'EPSG:4326', projection);
    }

    return coord;
}

export function unprojectFromOrientation(map: ShallowRef<Map | null>, coord?: Coordinate | null): Coordinate | null {
    if (!coord) return null;

    const projection = map.value?.getView().getProjection();

    if (!projection) return coord;

    if (projection.getCode() !== 'EPSG:4326') {
        return transform(coord.slice() as Coordinate, projection, 'EPSG:4326');
    }

    return coord;
}

export function sampleEndpointInfo(
    map: ShallowRef<Map | null>,
    line: LineString,
    position: 'start' | 'end',
) {
    const fraction = position === 'start' ? 0 : 1;
    const neighborFraction = position === 'start'
        ? Math.min(1, fraction + HEADING_SAMPLE_STEP)
        : Math.max(0, fraction - HEADING_SAMPLE_STEP);

    const anchor = line.getCoordinateAt(fraction);
    const neighbor = line.getCoordinateAt(neighborFraction);

    if (!anchor || !neighbor) return null;

    const anchorProjected = projectForOrientation(map, anchor);
    const neighborProjected = projectForOrientation(map, neighbor);

    if (!anchorProjected || !neighborProjected) return null;

    const dx = neighborProjected[0] - anchorProjected[0];
    const dy = neighborProjected[1] - anchorProjected[1];

    if (!dx && !dy) return null;

    const rawAngle = Math.atan2(dy, dx);
    const segmentLength = Math.hypot(dx, dy);

    const directionX = dx / segmentLength;
    const directionY = dy / segmentLength;
    const offsetSign = position === 'start' ? -1 : 1;
    const resolution = map.value?.getView().getResolution() ?? 1;
    const offsetBase = Math.max(
        segmentLength * HEADING_LABEL_FRACTION,
        resolution * HEADING_LABEL_MIN_PIXELS,
    );
    const offsetMagnitude = offsetBase * offsetSign;
    const labelProjected: Coordinate = [
        anchorProjected[0] + (directionX * offsetMagnitude * (position === 'start' ? 1 : -1)),
        anchorProjected[1] + (directionY * offsetMagnitude * (position === 'start' ? 1 : -1)),
    ];
    const labelCoordinate = unprojectFromOrientation(map, labelProjected) ?? anchor;

    return {
        coordinate: anchor,
        labelCoordinate,
        rotation: normalizeAngle(rawAngle),
        direction: rawAngle,
        heading: ((Math.atan2(dx, dy) * (180 / Math.PI)) + 360) % 360,
    };
}

export function calculateHeadingPair(map: ShallowRef<Map | null>, line: LineString): HeadingPair {
    const start = sampleEndpointInfo(map, line, 'start');
    const end = sampleEndpointInfo(map, line, 'end');

    return {
        from: headingToString(start?.heading ?? null),
        to: headingToString(end?.heading ?? null),
    };
}

export function makeHeadingStyles(type: 'start' | 'end', heading: string | null, info?: ReturnType<typeof sampleEndpointInfo> | null, drawing = false) {
    if (!info || !heading || heading === '---') {
        return [] as Style[];
    }

    const fill = new Fill({
        color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.9)`,
    });

    const baseText = {
        textAlign: 'center' satisfies CanvasTextAlign,
        textBaseline: 'middle' satisfies CanvasTextBaseline,
        font: '10px LibreFranklin',
        fill,
        rotation: -info.rotation,
        offsetX: drawing && type === 'end'
            ? info.heading > 180 ? 10 : -10
            : 0,
    } satisfies TextOptions;

    const arrowText = '>';

    const arrowStyle = new Style({
        geometry: new Point(info.coordinate),
        text: new Text({
            ...baseText,
            text: arrowText,
            rotation: -info.direction,
        }),
    });

    const labelCoordinate = info.labelCoordinate ?? info.coordinate;

    const headingStyle = new Style({
        geometry: new Point(labelCoordinate),
        text: new Text({
            ...baseText,
            text: heading,
        }),
    });

    return type === 'start' ? [headingStyle, arrowStyle] : [arrowStyle, headingStyle];
}

export function buildHeadingStyles({ map, headings, geometry: line, drawing}: {
    map: ShallowRef<Map | null>;
    geometry: LineString;
    headings?: HeadingPair | null;
    drawing?: boolean;
}) {
    const resolvedHeadings = headings ?? calculateHeadingPair(map, line);
    const styles: Style[] = [];

    const startInfo = sampleEndpointInfo(map, line, 'start');
    const endInfo = sampleEndpointInfo(map, line, 'end');

    styles.push(...makeHeadingStyles('start', resolvedHeadings.from, startInfo, drawing));
    styles.push(...makeHeadingStyles('end', resolvedHeadings.to, endInfo, drawing));

    return styles;
}

export function getMidpointOrientation(map: ShallowRef<Map | null>, line: LineString) {
    if (!line.getCoordinates().length) {
        return {
            coordinate: null,
            angleRad: 0,
        };
    }

    const center = line.getCoordinateAt(0.5);
    const delta = Math.min(0.01, 1 / Math.max(line.getLength(), 1));

    const before = line.getCoordinateAt(Math.max(0, 0.5 - delta));
    const after = line.getCoordinateAt(Math.min(1, 0.5 + delta));

    if (!center || !before || !after) {
        return {
            coordinate: center ?? null,
            angleRad: 0,
        };
    }

    const beforeProjected = projectForOrientation(map, before);
    const afterProjected = projectForOrientation(map, after);

    if (!beforeProjected || !afterProjected) {
        return {
            coordinate: center,
            angleRad: 0,
        };
    }

    const dx = afterProjected[0] - beforeProjected[0];
    const dy = afterProjected[1] - beforeProjected[1];

    if (dx === 0 && dy === 0) {
        return {
            coordinate: center,
            angleRad: 0,
        };
    }

    const angleRad = normalizeAngle(Math.atan2(dy, dx));

    return {
        coordinate: center,
        angleRad,
    };
}

export function toGeodesicLine(start?: Coordinate, end?: Coordinate) {
    if (!start || !end) return null;

    try {
        const circle = greatCircle(point(start), point(end), { npoints: GREAT_CIRCLE_POINTS });
        const coordinates = circle.geometry.type === 'LineString'
            ? circle.geometry.coordinates as Coordinate[]
            : (circle.geometry.type === 'MultiLineString'
                ? (circle.geometry.coordinates as Coordinate[][]).flat()
                : null);

        if (!coordinates?.length) return null;

        return new LineString(coordinates);
    }
    catch {
        return new LineString([start, end]);
    }
}


type DrawCoordinates = number[] | Coordinate[] | Coordinate[][];

export const createGeodesicGeometry: GeometryFunction = (coordinates: DrawCoordinates, geometry) => {
    let coords: Coordinate[] = [];

    const first = coordinates[0];

    if (Array.isArray(first)) {
        const firstEntry = first[0];

        if (Array.isArray(firstEntry)) {
            coords = (coordinates).flat() as Coordinate[];
        }
        else {
            coords = coordinates as Coordinate[];
        }
    }
    else if (typeof first === 'number') {
        coords = [coordinates as Coordinate];
    }

    const line = geometry instanceof LineString ? geometry : new LineString(coords);

    if (coords.length < 2) {
        line.setCoordinates(coords);
        return line;
    }

    const geodesic = toGeodesicLine(coords[0], coords[coords.length - 1]);

    if (geodesic) {
        line.setCoordinates(geodesic.getCoordinates());
    }
    else {
        line.setCoordinates(coords);
    }

    return line;
};
