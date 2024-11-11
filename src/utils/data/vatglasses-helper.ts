import { featureCollection } from '@turf/helpers';
import { flattenEach } from '@turf/meta';
import union from '@turf/union';
import difference from '@turf/difference';
import intersect from '@turf/intersect';
import truncate from '@turf/truncate';
import mergeRanges from 'merge-ranges';
import type { Feature as TurfFeature, Polygon as TurfPolygon, MultiPolygon as TurfMultiPolygon } from 'geojson';


export function splitSectors(sectors: TurfFeature<TurfPolygon>[]) {
    let resultPolygons: TurfFeature<TurfPolygon>[] = [];


    try {
        for (let i = 0; i < sectors.length; i++) {
            const currentPolygon = sectors[i];
            truncate(currentPolygon, { mutate: true, precision: 1 });
            let offset = 0;
            if (currentPolygon.properties?.max % 10 !== 0 && currentPolygon.properties?.max % 10 !== 5 && currentPolygon.properties?.max <= 999) {
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
                const intersection = intersect(featureCollection([remainingOfCurrentPolygon, resultPolygon]));

                if (intersection) {
                    const difference1 = difference(featureCollection([remainingOfCurrentPolygon, resultPolygon]));
                    const difference2 = difference(featureCollection([resultPolygon, remainingOfCurrentPolygon]));

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
    catch (e) {
        console.log(e);
        console.error('Vatglasses sector split failed');
    }

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
            if (combined.properties) combined.properties.countryGroupId = sectors[0].properties?.countryGroupId;
            if (combined.properties) combined.properties.vatglassesPositionId = sectors[0].properties?.vatglassesPositionId;
            if (combined.properties) combined.properties.colour = sectors[0].properties?.colour;
            if (combined.properties) combined.properties.type = 'vatglasses';
            if (combined.properties) [combined.properties.altrangeMin, combined.properties.altrangeMax] = altrange.split('-').map(Number);
            combinedGroupSectors.push(combined);
            continue;
        }
        try {
            // const combined = union(truncate(featureCollection(sectors), { mutate: true }));
            const combined = union((featureCollection(sectors)));
            if (combined) {
                flattenEach(combined, function(currentFeature) {
                    currentFeature.properties = structuredClone(combined.properties);
                    if (currentFeature.properties) currentFeature.properties.countryGroupId = sectors[0].properties?.countryGroupId;
                    if (currentFeature.properties) currentFeature.properties.vatglassesPositionId = sectors[0].properties?.vatglassesPositionId;
                    if (currentFeature.properties) currentFeature.properties.colour = sectors[0].properties?.colour;
                    if (currentFeature.properties) currentFeature.properties.type = 'vatglasses';
                    if (currentFeature.properties) [currentFeature.properties.altrangeMin, currentFeature.properties.altrangeMax] = altrange.split('-').map(Number);
                    combinedGroupSectors.push(currentFeature as TurfFeature<TurfPolygon>);
                });
            }
        }
        catch (e) {
            console.error('Error combining sectors ' + sectors[0].properties?.countryGroupId + ' ' + sectors[0].properties?.vatglassesPositionId);
            console.log(e);
        }
    }
    return combinedGroupSectors;
}

