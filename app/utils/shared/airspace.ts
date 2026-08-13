import type { Feature, FeatureCollection, Polygon, Position } from 'geojson';
import greatCircle from '@turf/great-circle';
import { point } from '@turf/helpers';

const EARTH_RADIUS_NM = 3440.065;
const LINE_POINTS = 64;
const ARC_POINTS = 96;
const CIRCLE_POINTS = 144;

export interface AirspaceGeometryOptions {
    linePoints?: number;
    arcPoints?: number;
    circlePoints?: number;
}

const defaultGeometryOptions: Required<AirspaceGeometryOptions> = {
    linePoints: LINE_POINTS,
    arcPoints: ARC_POINTS,
    circlePoints: CIRCLE_POINTS,
};

/**
 * ARINC Boundary Via code. The current record defines how to draw from its point to the next record point.
 */
export type AirspaceBoundaryVia = 'A' | 'C' | 'E' | 'G' | 'H' | 'L' | 'R' | string;
export type AirspaceCoordinate = [longitude: number, latitude: number];

export interface AirspaceBoundaryPoint {
    /**
     * Boundary vertex. For Navigraph restrictive airspace this comes from `longitude`/`latitude`,
     * not from the arc origin fields.
     */
    coordinate: AirspaceCoordinate;
    /**
     * Arc center used by A/C/L/R Boundary Via records.
     */
    arcOrigin?: AirspaceCoordinate | null;
    /**
     * Bearing from arc origin to the arc start, mostly useful for full-circle records.
     */
    arcBearing?: number | null;
    /**
     * Radius from arc origin in nautical miles. Prefer geometry-derived radius when possible,
     * because DB sources may differ in field scaling/precision.
     */
    arcDistance?: number | null;
}

export interface RestrictiveAirspaceRecord {
    arc_bearing?: number | null;
    arc_distance?: number | null;
    arc_origin_latitude?: number | null;
    arc_origin_longitude?: number | null;
    area_code?: string | null;
    boundary_via: AirspaceBoundaryVia;
    flightlevel?: string | null;
    icao_code?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    lower_limit?: string | null;
    multiple_code?: string | null;
    restrictive_airspace_designation?: string | null;
    restrictive_airspace_name?: string | null;
    restrictive_type?: string | null;
    seqno: number;
    unit_indicator_lower_limit?: string | null;
    unit_indicator_upper_limit?: string | null;
    upper_limit?: string | null;
}

export interface RestrictiveAirspaceProperties {
    areaCode: string | null;
    designation: string | null;
    flightLevel: string | null;
    icaoCode: string | null;
    lowerLimit: string | null;
    lowerLimitUnit: string | null;
    multipleCode: string | null;
    name: string | null;
    type: string | null;
    upperLimit: string | null;
    upperLimitUnit: string | null;
}

export interface RestrictiveAirspacePoint {
    arcBearing?: number | null;
    arcDistance?: number | null;
    arcOrigin?: AirspaceCoordinate | null;
    boundaryVia: AirspaceBoundaryVia;
    coordinate: AirspaceCoordinate | null;
    seqno?: number;
}

export interface RestrictiveAirspaceFeatureData {
    airspace: RestrictiveAirspaceProperties;
    points: RestrictiveAirspacePoint[];
}

function toRadians(degrees: number) {
    return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number) {
    return (radians * 180) / Math.PI;
}

function normalizeBearing(degrees: number) {
    return (((degrees % 360) + 360) % 360);
}

function normalizeLongitude(longitude: number) {
    return (((((longitude + 180) % 360) + 360) % 360) - 180);
}

function normalizeBoundaryVia(boundaryVia: AirspaceBoundaryVia) {
    return String(boundaryVia).trim().toUpperCase()[0] ?? '';
}

function isCoordinate(coordinate?: AirspaceCoordinate | null): coordinate is AirspaceCoordinate {
    return !!coordinate && Number.isFinite(coordinate[0]) && Number.isFinite(coordinate[1]);
}

function sameCoordinate(a: Position, b: Position) {
    return Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
}

/**
 * Lightweight haversine distance in nautical miles. Kept local so this shared helper can run
 * on both client and server without adding another Turf dependency.
 */
function distanceNm(from: AirspaceCoordinate, to: AirspaceCoordinate) {
    const fromLat = toRadians(from[1]);
    const toLat = toRadians(to[1]);
    const latDelta = toRadians(to[1] - from[1]);
    const lonDelta = toRadians(to[0] - from[0]);
    const latHaversine = Math.sin(latDelta / 2) ** 2;
    const lonHaversine = Math.sin(lonDelta / 2) ** 2;
    const haversine = latHaversine + (Math.cos(fromLat) * Math.cos(toLat) * lonHaversine);

    return 2 * EARTH_RADIUS_NM * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

/**
 * Initial true bearing from one WGS84 coordinate to another.
 */
function bearingBetween(from: AirspaceCoordinate, to: AirspaceCoordinate) {
    const fromLat = toRadians(from[1]);
    const toLat = toRadians(to[1]);
    const lonDelta = toRadians(to[0] - from[0]);
    const y = Math.sin(lonDelta) * Math.cos(toLat);
    const x = (Math.cos(fromLat) * Math.sin(toLat)) - (Math.sin(fromLat) * Math.cos(toLat) * Math.cos(lonDelta));

    return normalizeBearing(toDegrees(Math.atan2(y, x)));
}

/**
 * Destination point on a sphere from origin, true bearing, and nautical-mile distance.
 */
function destinationPoint(origin: AirspaceCoordinate, bearing: number, distance: number): AirspaceCoordinate {
    const angularDistance = distance / EARTH_RADIUS_NM;
    const bearingRad = toRadians(bearing);
    const originLat = toRadians(origin[1]);
    const originLon = toRadians(origin[0]);
    const lat = Math.asin(
        (Math.sin(originLat) * Math.cos(angularDistance)) +
        (Math.cos(originLat) * Math.sin(angularDistance) * Math.cos(bearingRad)),
    );
    const lon = originLon + Math.atan2(
        Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(originLat),
        Math.cos(angularDistance) - (Math.sin(originLat) * Math.sin(lat)),
    );

    return [normalizeLongitude(toDegrees(lon)), toDegrees(lat)];
}

/**
 * Resolve the arc radius. The center-to-boundary distance is usually the safest source because it
 * uses the actual decoded coordinates. `arcDistance` is only a fallback for incomplete records.
 */
function normalizeArcRadius(start: AirspaceBoundaryPoint, end?: AirspaceBoundaryPoint | null) {
    if (isCoordinate(start.arcOrigin)) {
        const startRadius = distanceNm(start.arcOrigin, start.coordinate);
        if (startRadius > 0) return startRadius;
    }

    if (end && isCoordinate(end.arcOrigin)) {
        const endRadius = distanceNm(end.arcOrigin, end.coordinate);
        if (endRadius > 0) return endRadius;
    }

    return start.arcDistance && start.arcDistance > 0 ? start.arcDistance : null;
}

/**
 * Boundary Via G. Government sources normally use this for straight geodesic segments.
 */
function getGreatCircleCoordinates(start: AirspaceCoordinate, end: AirspaceCoordinate, options: Required<AirspaceGeometryOptions>) {
    try {
        const line = greatCircle(point(start), point(end), { npoints: options.linePoints });
        if (line.geometry.type === 'LineString') return line.geometry.coordinates as AirspaceCoordinate[];
        if (line.geometry.type === 'MultiLineString') return (line.geometry.coordinates as AirspaceCoordinate[][]).flat();
    }
    catch {
        return [start, end];
    }

    return [start, end];
}

/**
 * Boundary Via H. A rhumb line keeps a constant bearing, so interpolation is done in Mercator space.
 */
function getRhumbLineCoordinates(start: AirspaceCoordinate, end: AirspaceCoordinate, options: Required<AirspaceGeometryOptions>) {
    const startLat = Math.max(Math.min(toRadians(start[1]), (Math.PI / 2) - 1e-12), (-Math.PI / 2) + 1e-12);
    const endLat = Math.max(Math.min(toRadians(end[1]), (Math.PI / 2) - 1e-12), (-Math.PI / 2) + 1e-12);
    const startMercator = Math.log(Math.tan((Math.PI / 4) + (startLat / 2)));
    const endMercator = Math.log(Math.tan((Math.PI / 4) + (endLat / 2)));
    let endLon = end[0];

    if (endLon - start[0] > 180) endLon -= 360;
    else if (endLon - start[0] < -180) endLon += 360;

    const coordinates: AirspaceCoordinate[] = [];

    for (let i = 0; i <= options.linePoints; i++) {
        const fraction = i / options.linePoints;
        const mercator = startMercator + ((endMercator - startMercator) * fraction);
        const lat = toDegrees((2 * Math.atan(Math.exp(mercator))) - (Math.PI / 2));
        const lon = normalizeLongitude(start[0] + ((endLon - start[0]) * fraction));

        coordinates.push([lon, lat]);
    }

    return coordinates;
}

function getArcCoordinates(start: AirspaceBoundaryPoint, end: AirspaceBoundaryPoint, clockwise: boolean | null, options: Required<AirspaceGeometryOptions>) {
    const center = start.arcOrigin ?? end.arcOrigin;

    // If arc metadata is incomplete, preserve the boundary by falling back to a geodesic segment.
    if (!isCoordinate(center)) return getGreatCircleCoordinates(start.coordinate, end.coordinate, options);

    const radius = normalizeArcRadius(start, end);

    if (!radius) return getGreatCircleCoordinates(start.coordinate, end.coordinate, options);

    const startBearing = bearingBetween(center, start.coordinate);
    const endBearing = bearingBetween(center, end.coordinate);
    const clockwiseDelta = normalizeBearing(endBearing - startBearing);
    const counterClockwiseDelta = clockwiseDelta - 360;
    // A means "arc by edge"; without a direction flag, choose the shorter arc between endpoints.
    const delta = clockwise === null
        ? (clockwiseDelta <= 180 ? clockwiseDelta : counterClockwiseDelta)
        : (clockwise ? clockwiseDelta : counterClockwiseDelta);
    const steps = Math.max(2, Math.ceil((Math.abs(delta) / 360) * options.arcPoints));
    const coordinates: AirspaceCoordinate[] = [];

    for (let i = 0; i <= steps; i++) {
        coordinates.push(destinationPoint(center, startBearing + ((delta * i) / steps), radius));
    }

    return coordinates;
}

/**
 * Boundary Via C. A circle record may have only one boundary point, so the arc bearing defines where
 * the generated ring starts when the source provides it.
 */
function getCircleCoordinates(airspacePoint: AirspaceBoundaryPoint, options: Required<AirspaceGeometryOptions>) {
    const center = airspacePoint.arcOrigin;

    if (!isCoordinate(center)) return [airspacePoint.coordinate];

    const radius = normalizeArcRadius(airspacePoint);

    if (!radius) return [airspacePoint.coordinate];

    const startBearing = typeof airspacePoint.arcBearing === 'number' && Number.isFinite(airspacePoint.arcBearing) ? airspacePoint.arcBearing : bearingBetween(center, airspacePoint.coordinate);
    const coordinates: AirspaceCoordinate[] = [];

    for (let i = 0; i <= options.circlePoints; i++) {
        coordinates.push(destinationPoint(center, startBearing + ((360 * i) / options.circlePoints), radius));
    }

    return coordinates;
}

/**
 * Connect two already-decoded boundary points according to ARINC Boundary Via.
 */
export function connectAirspaceBoundaryPoints(start: AirspaceBoundaryPoint, end: AirspaceBoundaryPoint, boundaryVia: AirspaceBoundaryVia, geometryOptions: AirspaceGeometryOptions = defaultGeometryOptions): AirspaceCoordinate[] {
    const options = { ...defaultGeometryOptions, ...geometryOptions };

    switch (normalizeBoundaryVia(boundaryVia)) {
        case 'A':
            return getArcCoordinates(start, end, null, options);
        case 'C':
            return getCircleCoordinates(start, options);
        case 'H':
            return getRhumbLineCoordinates(start.coordinate, end.coordinate, options);
        case 'L':
            return getArcCoordinates(start, end, false, options);
        case 'R':
            return getArcCoordinates(start, end, true, options);
        case 'E':
        case 'G':
        default:
            return getGreatCircleCoordinates(start.coordinate, end.coordinate, options);
    }
}

/**
 * Convert a flat Navigraph restrictive airspace row into the point shape used by the geometry helpers.
 */
function recordToRestrictiveAirspacePoint(record: RestrictiveAirspaceRecord): RestrictiveAirspacePoint {
    return {
        coordinate: record.longitude == null || record.latitude == null
            ? null
            : [record.longitude, record.latitude],
        arcOrigin: record.arc_origin_longitude == null || record.arc_origin_latitude == null
            ? null
            : [record.arc_origin_longitude, record.arc_origin_latitude],
        arcBearing: record.arc_bearing,
        arcDistance: record.arc_distance,
        boundaryVia: record.boundary_via,
        seqno: record.seqno,
    };
}

function getRestrictiveAirspaceProperties(record: RestrictiveAirspaceRecord): RestrictiveAirspaceProperties {
    return {
        type: record.restrictive_type ?? null,
        icaoCode: record.icao_code ?? null,
        areaCode: record.area_code ?? null,
        designation: record.restrictive_airspace_designation ?? null,
        multipleCode: record.multiple_code ?? null,
        lowerLimit: record.lower_limit ?? null,
        lowerLimitUnit: record.unit_indicator_lower_limit ?? null,
        upperLimit: record.upper_limit ?? null,
        upperLimitUnit: record.unit_indicator_upper_limit ?? null,
        name: record.restrictive_airspace_name ?? null,
        flightLevel: record.flightlevel ?? null,
    };
}

function buildRestrictiveAirspacePolygon(points: RestrictiveAirspacePoint[], geometryOptions: AirspaceGeometryOptions = defaultGeometryOptions): Polygon | null {
    const options = { ...defaultGeometryOptions, ...geometryOptions };
    const boundaryPoints: { point: RestrictiveAirspacePoint; boundaryPoint: AirspaceBoundaryPoint }[] = [];

    for (const point of points) {
        let coordinate = point.coordinate;

        if (!coordinate) {
            if (normalizeBoundaryVia(point.boundaryVia) !== 'C' || !isCoordinate(point.arcOrigin) || !point.arcDistance) continue;
            coordinate = destinationPoint(point.arcOrigin, point.arcBearing ?? 0, point.arcDistance);
        }

        boundaryPoints.push({
            point,
            boundaryPoint: {
                coordinate,
                arcOrigin: point.arcOrigin,
                arcBearing: point.arcBearing,
                arcDistance: point.arcDistance,
            },
        });
    }

    if (!boundaryPoints.length) return null;

    if (boundaryPoints.length === 1 && normalizeBoundaryVia(boundaryPoints[0].point.boundaryVia) === 'C') {
        const ring = getCircleCoordinates(boundaryPoints[0].boundaryPoint, options);

        return ring.length >= 4 ? { type: 'Polygon', coordinates: [ring] } : null;
    }

    if (boundaryPoints.length < 2) return null;

    const ring: AirspaceCoordinate[] = [];

    // Boundary Via belongs to the current record and describes how to draw from it to the next point.
    for (let i = 0; i < boundaryPoints.length; i++) {
        const start = boundaryPoints[i];
        const end = boundaryPoints[i + 1] ?? boundaryPoints[0];
        const segment = connectAirspaceBoundaryPoints(start.boundaryPoint, end.boundaryPoint, start.point.boundaryVia, options);

        for (const coordinate of segment) {
            if (ring.length && sameCoordinate(ring[ring.length - 1], coordinate)) continue;

            ring.push(coordinate);
        }

        if (String(start.point.boundaryVia).trim().toUpperCase().includes('E')) break;
    }

    if (ring.length && !sameCoordinate(ring[0], ring[ring.length - 1])) ring.push([...ring[0]]);

    return ring.length >= 4 ? { type: 'Polygon', coordinates: [ring] } : null;
}

/**
 * Convert one grouped restrictive airspace into one GeoJSON feature. This is the preferred helper
 * when data already comes from the Navigraph worker as `{ airspace, points }`.
 */
export function restrictiveAirspaceFeatureToGeoJSON(feature: RestrictiveAirspaceFeatureData, geometryOptions: AirspaceGeometryOptions = defaultGeometryOptions): Feature<Polygon, RestrictiveAirspaceProperties> | null {
    const geometry = buildRestrictiveAirspacePolygon(feature.points, geometryOptions);

    if (!geometry) return null;

    return {
        type: 'Feature',
        geometry,
        properties: feature.airspace,
    };
}

/**
 * Convenience converter for callers that want ready-to-render GeoJSON. The Navigraph worker does not
 * call this during cache generation, because large AIRAC cycles should defer geometry work to clients.
 */
export function restrictiveAirspaceToGeoJSON(records: RestrictiveAirspaceRecord[]): FeatureCollection<Polygon, RestrictiveAirspaceProperties> {
    const groups = new Map<string, RestrictiveAirspaceRecord[]>();

    for (const record of records) {
        const key = [
            record.area_code,
            record.icao_code,
            record.restrictive_type,
            record.restrictive_airspace_designation,
            record.multiple_code,
        ].join('|');
        const group = groups.get(key);

        if (group) group.push(record);
        else groups.set(key, [record]);
    }

    const features: Array<Feature<Polygon, RestrictiveAirspaceProperties>> = [];

    for (const group of groups.values()) {
        group.sort((a, b) => a.seqno - b.seqno);

        const feature = restrictiveAirspaceFeatureToGeoJSON({
            airspace: getRestrictiveAirspaceProperties(group[0]),
            points: group.map(recordToRestrictiveAirspacePoint),
        });

        if (feature) features.push(feature);
    }

    return {
        type: 'FeatureCollection',
        features,
    };
}
