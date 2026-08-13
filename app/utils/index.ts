import type {
    Feature,
    LineString as GeoLineString,
    MultiLineString as GeoMultiLineString,
    MultiPolygon as GeoMultiPolygon,
    Polygon as GeoPolygon,
    Point as GeoPoint,
    Position,
} from 'geojson';
import greatCircle from '@turf/great-circle';
import { point } from '@turf/helpers';
import { LineString, MultiLineString, MultiPolygon, Point } from 'ol/geom.js';
import type { Coordinate } from 'ol/coordinate.js';
import Polygon from 'ol/geom/Polygon.js';

type GreatCircleOptions = NonNullable<Parameters<typeof greatCircle>[2]>;

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function getHoursAndMinutes(date: number) {
    const diff = Math.abs(useDataStore().time.value - date) / (1000 * 60);

    return `${ (`0${ Math.floor(diff / 60) }`).slice(-2) }:${ (`0${ Math.floor(diff % 60) }`).slice(-2) }`;
}

export async function copyText(text: string): Promise<void> {
    if (typeof window === 'undefined') throw new Error('You are not allowed to call copyText on SSR');

    if (typeof navigator?.permissions?.query !== 'undefined' && typeof navigator?.clipboard?.writeText !== 'undefined') {
        try {
            const { state } = await navigator.permissions.query({ name: 'clipboard-write' as PermissionName });
            if (state === 'granted' || state === 'prompt') {
                await navigator.clipboard.writeText(text);
                return;
            }
        }
        catch (e) {
            console.warn('copyText using navigator.permissions.query failed, falling back to legacy method', e);
        }
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const success = document.execCommand('copy');
    if (!success) throw new Error('Was not able to copy text');

    document.body.removeChild(textArea);
}

export function serializeClass<T extends string | null | undefined>(className: T): T {
    if (typeof className === 'string') return className.replaceAll(':', '\\:') as T;
    return className;
}

export function turfGeometryToOl(feature: Feature<GeoMultiPolygon>): MultiPolygon;
export function turfGeometryToOl(feature: Feature<GeoPolygon>): Polygon;
export function turfGeometryToOl(feature: Feature<GeoPoint>): Point;
export function turfGeometryToOl(feature: Feature<GeoLineString | GeoMultiLineString>): LineString | MultiLineString;
export function turfGeometryToOl(feature: Feature<GeoMultiLineString>): MultiLineString;
export function turfGeometryToOl(feature: Feature<GeoLineString>): LineString;
export function turfGeometryToOl(feature: Feature<GeoLineString | GeoMultiLineString | GeoPoint | GeoPolygon | GeoMultiPolygon>) {
    if (feature.geometry.type === 'LineString') return new LineString(feature.geometry.coordinates);
    if (feature.geometry.type === 'MultiLineString') return new MultiLineString(feature.geometry.coordinates);
    if (feature.geometry.type === 'Point') return new Point(feature.geometry.coordinates);
    if (feature.geometry.type === 'Polygon') return new Polygon(feature.geometry.coordinates);
    if (feature.geometry.type === 'MultiPolygon') return new MultiPolygon(feature.geometry.coordinates);

    throw new Error('Invalid geometry');
}

function splitAtAntimeridian(coordinates: Position[]) {
    const parts: Position[][] = [[]];

    for (const coordinate of coordinates) {
        const currentPart = parts.at(-1)!;
        const previous = currentPart.at(-1);

        if (!previous || Math.abs(coordinate[0] - previous[0]) <= 180) {
            currentPart.push(coordinate);
            continue;
        }

        const boundaryLongitude = previous[0] > 0 ? 180 : -180;
        // Unwrap the next longitude so the crossing can be interpolated on the short segment.
        const unwrappedLongitude = coordinate[0] + (boundaryLongitude > 0 ? 360 : -360);
        const crossingFraction = (boundaryLongitude - previous[0]) / (unwrappedLongitude - previous[0]);
        const crossingLatitude = previous[1] + ((coordinate[1] - previous[1]) * crossingFraction);

        if (previous[0] !== boundaryLongitude) currentPart.push([boundaryLongitude, crossingLatitude]);

        const nextPart: Position[] = [[-boundaryLongitude, crossingLatitude]];
        if (coordinate[0] !== -boundaryLongitude) nextPart.push(coordinate);
        parts.push(nextPart);
    }

    return parts;
}

/**
 * Builds a great-circle geometry and splits it exactly at the antimeridian.
 * Turf's own splitting depends on sampling and can leave a gap or return a world-spanning LineString.
 */
export function greatCircleToOl(start: Coordinate, end: Coordinate, options?: GreatCircleOptions) {
    const feature = greatCircle(point(start), point(end), options);
    const coordinates = feature.geometry.type === 'LineString'
        ? feature.geometry.coordinates
        : feature.geometry.coordinates.flat();
    const parts = splitAtAntimeridian(coordinates);

    return parts.length === 1 ? new LineString(parts[0]) : new MultiLineString(parts);
}

export function createCircle(center: Coordinate, radius: number, numPoints = 64) {
    const coords = [];
    const [lon, lat] = center;

    const latRadius = (radius / 111320);
    const lonRadius = radius / (111320 * Math.cos(lat * Math.PI / 180));

    for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * 2 * Math.PI;
        const x = lon + (lonRadius * Math.cos(angle));
        const y = lat + (latRadius * Math.sin(angle));
        coords.push([x, y]);
    }

    coords.push(coords[0]);

    return new Polygon([coords]);
}
