import { featureCollection, lineString, polygon } from '@turf/helpers';
import { flattenEach } from '@turf/meta';
import union from '@turf/union';
import difference from '@turf/difference';
import intersect from '@turf/intersect';
import kinks from '@turf/kinks';
import mergeRanges from 'merge-ranges';
import type { Feature as TurfFeature, Polygon as TurfPolygon, MultiPolygon as TurfMultiPolygon, LineString, Point } from 'geojson';
import type { VatglassesSectorProperties } from './vatglasses';

import lineIntersect from '@turf/line-intersect';

/**
 * Rounds the coordinates of a Turf polygon feature to the specified number of decimal places.
 * @param feature The Turf polygon feature to round.
 * @param decimals The number of decimal places to round to.
 * @returns The modified Turf polygon feature with rounded coordinates.
 */
export function roundPolygonCoordinates(feature: TurfFeature<TurfPolygon | TurfMultiPolygon>, decimals: number = 0): TurfFeature<TurfPolygon | TurfMultiPolygon> {
    const factor = Math.pow(10, decimals);

    const roundCoordinates = (coordinates: number[][]) => {
        for (let i = 0; i < coordinates.length; i++) {
            coordinates[i][0] = Math.round(coordinates[i][0] * factor) / factor;
            coordinates[i][1] = Math.round(coordinates[i][1] * factor) / factor;
        }
        return coordinates;
    };

    if (feature.geometry.type === 'Polygon') {
        for (let i = 0; i < feature.geometry.coordinates.length; i++) {
            feature.geometry.coordinates[i] = roundCoordinates(feature.geometry.coordinates[i]);
        }
    }
    else if (feature.geometry.type === 'MultiPolygon') {
        for (let i = 0; i < feature.geometry.coordinates.length; i++) {
            for (let j = 0; j < feature.geometry.coordinates[i].length; j++) {
                feature.geometry.coordinates[i][j] = roundCoordinates(feature.geometry.coordinates[i][j]);
            }
        }
    }

    return feature;
}


function removeDuplicateCoords(feature: TurfFeature<TurfPolygon | TurfMultiPolygon>): TurfFeature<TurfPolygon | TurfMultiPolygon> {
    const removeDuplicates = (coordinates: number[][]) => {
        return coordinates.filter((coord, index, self) => {
            if (index === 0) return true;
            const prevCoord = self[index - 1];
            return coord[0] !== prevCoord[0] || coord[1] !== prevCoord[1];
        });
    };

    if (feature.geometry.type === 'Polygon') {
        for (let i = 0; i < feature.geometry.coordinates.length; i++) {
            feature.geometry.coordinates[i] = removeDuplicates(feature.geometry.coordinates[i]);
        }
    }
    else if (feature.geometry.type === 'MultiPolygon') {
        for (let i = 0; i < feature.geometry.coordinates.length; i++) {
            for (let j = 0; j < feature.geometry.coordinates[i].length; j++) {
                feature.geometry.coordinates[i][j] = removeDuplicates(feature.geometry.coordinates[i][j]);
            }
        }
    }

    return feature;
}


/**
 * Finds the intersection points of two LineStrings.
 * @param line1 The first LineString.
 * @param line2 The second LineString.
 * @returns An array of intersection points.
 */
function findIntersectionPoints(line1: TurfFeature<LineString>, line2: TurfFeature<LineString>): TurfFeature<Point>[] {
    const intersections = lineIntersect(line1, line2);
    return intersections.features;
}

/**
 * Adds intersection points to a LineString.
 * @param line The LineString to add points to.
 * @param points The intersection points to add.
 * @returns The modified LineString with the intersection points added.
 */
function addPointsToLine(line: TurfFeature<LineString>, points: TurfFeature<Point>[]): TurfFeature<LineString> {
    const coordinates = line.geometry.coordinates;
    // Remove duplicate coordinates that are next to each other
    for (let i = coordinates.length - 1; i > 0; i--) {
        if (coordinates[i][0] === coordinates[i - 1][0] && coordinates[i][1] === coordinates[i - 1][1]) {
            coordinates.splice(i, 1);
        }
    }

    points.forEach(point => {
        const [x, y] = point.geometry.coordinates;

        // Check if the point is already part of the line
        if (coordinates.some(coord => coord[0] === x && coord[1] === y)) {
            return;
        }

        for (let i = 0; i < coordinates.length - 1; i++) {
            const [x1, y1] = coordinates[i];
            const [x2, y2] = coordinates[i + 1];

            // Check if the intersection point lies on the segment between coordinates[i] and coordinates[i + 1]
            if (isPointOnSegment([x1, y1], [x2, y2], [x, y])) {
                coordinates.splice(i + 1, 0, [x, y]);
                break;
            }
        }
    });

    return lineString(coordinates);
}

/**
 * Checks if a point lies on a segment with a given tolerance.
 * @param p1 The first point of the segment.
 * @param p2 The second point of the segment.
 * @param p The point to check.
 * @param tolerance The tolerance for the check.
 * @returns True if the point lies on the segment, false otherwise.
 */
const isPointOnSegment = (p1: number[], p2: number[], p: number[], tolerance: number = 0.01) => { // 1e-6, Number.EPSILON
    const [x1, y1] = p1;
    const [x2, y2] = p2;
    const [x, y] = p;

    const crossProduct = ((y - y1) * (x2 - x1)) - ((x - x1) * (y2 - y1));
    if (Math.abs(crossProduct) > tolerance) return false;

    const dotProduct = ((x - x1) * (x2 - x1)) + ((y - y1) * (y2 - y1));
    if (dotProduct < 0) return false;

    const squaredLengthBA = ((x2 - x1) * (x2 - x1)) + ((y2 - y1) * (y2 - y1));
    if (dotProduct > squaredLengthBA) return false;

    return true;
};

/**
 * Modifies an array of Turf polygon features by finding and adding intersection points.
 * @param polygons The array of Turf polygon features to modify.
 * @returns The modified array of Turf polygon features.
 */
function modifyPolygonsWithIntersections(polygons: TurfFeature<TurfPolygon>[]): TurfFeature<TurfPolygon>[] {
    const modifiedPolygons: TurfFeature<TurfPolygon>[] = [];
    const intersectionPointsMap: { [key: string]: TurfFeature<Point>[] } = {};


    for (let i = 0; i < polygons.length; i++) {
        if (insertfailed) break;
        const polygon1 = removeDuplicateCoords(polygons[i]);
        const line1 = polygonToLineString(structuredClone(polygon1));
        let intersectionPoints: TurfFeature<Point>[] = [];

        for (let j = 0; j < polygons.length; j++) {
            if (i === j) continue;

            const polygon2 = polygons[j];
            const line2 = polygonToLineString(polygon2);

            // Check if intersection points are already in the map
            let points: TurfFeature<Point>[];


            const mapKey1 = `${ i }-${ j }`;
            const mapKey2 = `${ j }-${ i }`;
            if (intersectionPointsMap[mapKey1]) {
                points = intersectionPointsMap[mapKey1];
            }
            else if (intersectionPointsMap[mapKey2]) {
                points = intersectionPointsMap[mapKey2];
            }
            else {
                // Find intersection points between the current polygon and all other polygons
                points = findIntersectionPoints(line1, line2);
                intersectionPointsMap[mapKey1] = points;
                intersectionPointsMap[mapKey2] = points;
            }

            intersectionPoints = intersectionPoints.concat(points);
        }

        // Ensure intersection points are unique
        intersectionPoints = intersectionPoints.filter((point, index, self) => index === self.findIndex(p => p.geometry.coordinates[0] === point.geometry.coordinates[0] && p.geometry.coordinates[1] === point.geometry.coordinates[1]));

        // Add all collected intersection points to the current polygon
        const modifiedLine1 = addPointsToLine(line1, intersectionPoints);
        const modifiedPolygon1 = lineStringToPolygon(modifiedLine1);
        modifiedPolygon1.properties = structuredClone(polygon1.properties);

        modifiedPolygons.push(modifiedPolygon1);
    }

    return modifiedPolygons;
}

/**
 * Converts a Turf polygon feature to a LineString feature.
 * @param polygon The Turf polygon feature to convert.
 * @returns The converted LineString feature.
 */
function polygonToLineString(polygon: TurfFeature<TurfPolygon | TurfMultiPolygon>): TurfFeature<LineString> {
    const coordinates = polygon.geometry.type === 'Polygon'
        ? polygon.geometry.coordinates[0]
        : polygon.geometry.coordinates[0][0];
    return lineString(coordinates);
}

/**
 * Converts a Turf LineString feature to a polygon feature.
 * @param line The Turf LineString feature to convert.
 * @returns The converted polygon feature.
 */
function lineStringToPolygon(line: TurfFeature<LineString>): TurfFeature<TurfPolygon> {
    const coordinates = [line.geometry.coordinates];
    return polygon(coordinates);
}


const insertfailed = false;
export function splitSectors(sectors: TurfFeature<TurfPolygon>[]) {
    for (let i = sectors.length - 1; i >= 0; i--) {
        const currentPolygon = sectors[i];
        removeDuplicateCoords(roundPolygonCoordinates(currentPolygon));

        const kinksResult = kinks(currentPolygon);
        if (kinksResult.features.length > 0) {
            // console.log('kink removing id; ' + i);
            sectors.splice(i, 1);
        }
    }

    // ADD INTERSECTIONS
    const sectorsWithIntersections = modifyPolygonsWithIntersections(sectors);
    sectorsWithIntersections.map(polygon => removeDuplicateCoords(roundPolygonCoordinates(polygon, 0)));


    let resultPolygons: TurfFeature<TurfPolygon>[] = [];

    try {
        for (let i = 0; i < sectorsWithIntersections.length; i++) {
            const currentPolygon = sectorsWithIntersections[i];
            // roundPolygonCoordinates(currentPolygon);
            let offset = 0;
            if (currentPolygon.properties?.max % 10 !== 0 && currentPolygon.properties?.max % 10 !== 5 && currentPolygon.properties?.max !== 999) {
                offset = 1;
            }
            // currentPolygon.properties.altrange = [[currentPolygon.properties?.min, currentPolygon.properties?.max % 10 === 4 ? currentPolygon.properties?.max + 1 : currentPolygon.properties?.max]];
            if (currentPolygon.properties) currentPolygon.properties.altrange = [[currentPolygon.properties?.min, currentPolygon.properties?.max + offset]];
            // We do the +1, because often the maximum is ending with 4, for sectors which go to FL315. But we need to have a matching min and max value for the mergeRanges to be working.
            if (!resultPolygons.length) {
                resultPolygons.push(currentPolygon);
                continue;
            }
            const newResultPolygons: TurfFeature<TurfPolygon>[] = [];

            let remainingOfCurrentPolygon: TurfFeature<TurfPolygon | TurfMultiPolygon> | null = currentPolygon;
            for (const resultPolygon of resultPolygons) {
                if (!remainingOfCurrentPolygon) {
                    newResultPolygons.push(resultPolygon);
                    continue;
                }

                const intersection = (intersect(featureCollection([remainingOfCurrentPolygon, resultPolygon])));

                if (intersection) {
                    const difference1 = (difference(featureCollection([remainingOfCurrentPolygon, resultPolygon])));
                    const difference2 = (difference(featureCollection([resultPolygon, remainingOfCurrentPolygon])));

                    if (difference1) {
                        difference1.properties = structuredClone(difference1.properties);
                        remainingOfCurrentPolygon = difference1;
                    }
                    else {
                        remainingOfCurrentPolygon = null;
                    }

                    if (difference2) {
                        flattenEach(difference2, function(currentFeature) {
                            currentFeature.properties = structuredClone(resultPolygon.properties);
                            newResultPolygons.push(currentFeature as TurfFeature<TurfPolygon>);
                        });
                    }

                    flattenEach(intersection, function(currentFeature) {
                        currentFeature.properties = structuredClone(resultPolygon.properties);
                        if (currentFeature.properties) currentFeature.properties.altrange = mergeRanges([...structuredClone(resultPolygon.properties?.altrange) ?? [], ...structuredClone(currentPolygon.properties?.altrange) ?? []]);

                        newResultPolygons.push(currentFeature as TurfFeature<TurfPolygon>);
                    });
                }
                else {
                    newResultPolygons.push(resultPolygon);
                }
            }

            if (remainingOfCurrentPolygon) {
                flattenEach(remainingOfCurrentPolygon, function(currentFeature) {
                    currentFeature.properties = structuredClone(currentPolygon.properties);
                    newResultPolygons.push(currentFeature as TurfFeature<TurfPolygon>);
                });
            }

            resultPolygons = newResultPolygons;
        }
    }
    catch { /* empty */ }

    return resultPolygons;
}

export function combineSectors(sectors: TurfFeature<TurfPolygon>[]) {
    const groupedSectors: { [index: string]: TurfFeature<TurfPolygon>[] } = {};

    for (const sector of sectors) {
        if (sector.properties) {
            for (const altrange of sector.properties.altrange) {
                const joinedAltrange = altrange.join('-');
                if (groupedSectors[joinedAltrange]) {
                    groupedSectors[joinedAltrange].push(sector);
                }
                else {
                    groupedSectors[joinedAltrange] = [sector];
                }
            }
        }
    }

    const combinedGroupSectors = [];
    for (const altrange in groupedSectors) {
        const sectors = groupedSectors[altrange];
        if (sectors.length === 0) {
            continue;
        }
        if (sectors.length === 1) {
            const combined = sectors[0];
            const properties = combined.properties as VatglassesSectorProperties;
            [properties.min, properties.max] = altrange.split('-').map(Number);

            combinedGroupSectors.push(combined);
            continue;
        }
        try {
            // const combined = union(truncate(featureCollection(sectors), { mutate: true }));
            const combined = union((featureCollection(sectors)));
            if (combined) {
                flattenEach(combined, function(currentFeature) {
                    currentFeature.properties = structuredClone(sectors[0].properties);
                    const properties = currentFeature.properties as VatglassesSectorProperties;
                    [properties.min, properties.max] = altrange.split('-').map(Number);

                    combinedGroupSectors.push(currentFeature as TurfFeature<TurfPolygon>);
                });
            }
        }
        catch { /* empty */ }
    }
    return combinedGroupSectors;
}
