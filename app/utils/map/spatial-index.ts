import type { Extent } from 'ol/extent.js';

export type SpatialItemExtent = [minX: number, minY: number, maxX: number, maxY: number];

interface SpatialIndexOptions<T> {
    cellSize?: number;
    getExtent: (item: T) => SpatialItemExtent;
}

/**
 * Small longitude/latitude grid index for static AIRAC collections.
 * It intentionally keeps the index simple: data is immutable for the lifetime of a layer,
 * while viewport queries are frequent and must not scan the complete collection.
 */
export function createSpatialGridIndex<T>({ cellSize = 5, getExtent }: SpatialIndexOptions<T>) {
    const buckets = new Map<string, T[]>();
    const items: T[] = [];

    function normalizeLongitude(longitude: number) {
        return ((((longitude + 180) % 360) + 360) % 360) - 180;
    }

    function addRange(item: T, minX: number, maxX: number, minY: number, maxY: number) {
        const xStart = Math.floor((minX + 180) / cellSize);
        const xEnd = Math.floor((maxX + 180) / cellSize);
        const yStart = Math.max(-90, Math.floor((minY + 90) / cellSize));
        const yEnd = Math.min(Math.floor(180 / cellSize), Math.floor((maxY + 90) / cellSize));

        for (let x = xStart; x <= xEnd; x++) {
            for (let y = yStart; y <= yEnd; y++) {
                const key = `${ x }:${ y }`;
                const bucket = buckets.get(key);
                if (bucket) bucket.push(item);
                else buckets.set(key, [item]);
            }
        }
    }

    function add(item: T) {
        const [rawMinX, rawMinY, rawMaxX, rawMaxY] = getExtent(item);
        if (![rawMinX, rawMinY, rawMaxX, rawMaxY].every(Number.isFinite)) return;

        items.push(item);

        const minY = Math.max(-90, rawMinY);
        const maxY = Math.min(90, rawMaxY);
        if (maxY < -90 || minY > 90) return;

        const width = rawMaxX - rawMinX;
        if (width >= 360) {
            addRange(item, -180, 180, minY, maxY);
            return;
        }

        const minX = normalizeLongitude(rawMinX);
        const maxX = minX + Math.max(0, width);
        if (maxX <= 180) addRange(item, minX, maxX, minY, maxY);
        else {
            addRange(item, minX, 180, minY, maxY);
            addRange(item, -180, maxX - 360, minY, maxY);
        }
    }

    function query(extent: Extent) {
        const [rawMinX, rawMinY, rawMaxX, rawMaxY] = extent;
        const width = rawMaxX - rawMinX;
        if (!Number.isFinite(width) || width >= 360) return items;

        const minY = Math.max(-90, rawMinY);
        const maxY = Math.min(90, rawMaxY);
        if (maxY < -90 || minY > 90) return [];

        const result = new Set<T>();
        const minX = normalizeLongitude(rawMinX);
        const normalizedMaxX = minX + Math.max(0, width);
        const ranges: [number, number][] = normalizedMaxX <= 180
            ? [[minX, normalizedMaxX]]
            : [[minX, 180], [-180, normalizedMaxX - 360]];

        for (const [rangeMinX, rangeMaxX] of ranges) {
            const xStart = Math.floor((rangeMinX + 180) / cellSize);
            const xEnd = Math.floor((rangeMaxX + 180) / cellSize);
            const yStart = Math.max(-90, Math.floor((minY + 90) / cellSize));
            const yEnd = Math.min(Math.floor(180 / cellSize), Math.floor((maxY + 90) / cellSize));

            for (let x = xStart; x <= xEnd; x++) {
                for (let y = yStart; y <= yEnd; y++) {
                    for (const item of buckets.get(`${ x }:${ y }`) ?? []) result.add(item);
                }
            }
        }

        return Array.from(result);
    }

    return {
        add,
        query,
        size: () => items.length,
    };
}
