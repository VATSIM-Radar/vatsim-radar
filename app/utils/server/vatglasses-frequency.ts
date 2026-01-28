import { radarStorage } from '~/utils/server/storage';
import type { VatglassesActivePositions } from '~/utils/data/vatglasses';

interface PilotFrequencyResult {
    frequency: string;
    callsign: string;
    positionId: string;
    controllerName?: string;
}

// 300 IQ perfomance optimization. We cache bounding boxes of sectors
// so we don't try to calculate points being outside the sector box every time
// on the update cache will be purged if no sector is found thanks WeakMap

const sectorBBoxCache = new WeakMap<object, [number, number, number, number]>();

function getBBox(points: number[][]): [number, number, number, number] {
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
    for (const p of points) {
        if (p[0] < minX) minX = p[0];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1];
        if (p[1] > maxY) maxY = p[1];
    }
    return [minX, minY, maxX, maxY];
}

function parseAltitude(alt: number): number {
    // dolban zashita: if altitude is given in feet we keep it, otherwise multiply it by 100
    if (alt < 1000) return alt * 100;
    return alt;
}

function isPointInPolygon(point: [number, number], vs: number[][]): boolean {
    let bbox = sectorBBoxCache.get(vs);
    if (!bbox) {
        bbox = getBBox(vs);
        sectorBBoxCache.set(vs, bbox);
    }

    if (point[0] < bbox[0] || point[0] > bbox[2] || point[1] < bbox[1] || point[1] > bbox[3]) {
        return false;
    }

    const x = point[0];
    const y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i][0];
        const yi = vs[i][1];
        const xj = vs[j][0];
        const yj = vs[j][1];

        const intersect = ((yi > y) !== (yj > y)) &&
            (x < ((xj - xi) * (y - yi) / (yj - yi)) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

export function findFrequencyForPilot(cid: string): PilotFrequencyResult | null {
    if (!radarStorage.vatsim.extendedPilotsMap) return null;
    const pilot = radarStorage.vatsim.extendedPilotsMap[cid];
    if (!pilot) return null;

    const activeDataStr = radarStorage.vatglasses.activeData;
    if (!activeDataStr) return null;

    let activePositions: VatglassesActivePositions;
    try {
        const parsed = JSON.parse(activeDataStr);
        activePositions = parsed.vatglassesActivePositions;
    }
    catch {
        return null;
    }

    if (!activePositions) return null;

    const pilotPos: [number, number] = [pilot.longitude, pilot.latitude];
    const pilotAlt = pilot.altitude;

    const definitions = radarStorage.vatglasses.data.data;
    if (!definitions) return null;

    const matches: { result: PilotFrequencyResult; minAlt: number; maxAlt: number }[] = [];

    for (const countryGroupId in activePositions) {
        const positions = activePositions[countryGroupId];
        const definitionGroup = definitions[countryGroupId];

        if (!definitionGroup) continue;

        for (const positionId in positions) {
            const posData = positions[positionId];
            if (!posData.atc || posData.atc.length === 0) continue;
            if (!posData.airspaceKeys) continue;

            const airspaceKeys = posData.airspaceKeys.split(',');

            for (const key of airspaceKeys) {
                const airspaceIndex = parseInt(key);
                if (isNaN(airspaceIndex)) continue;

                const airspace = definitionGroup.airspace[airspaceIndex];

                if (!airspace) continue;

                for (const sector of airspace.sectors) {
                    const min = sector.min !== undefined ? parseAltitude(sector.min) : -1000; // undefined min GND
                    const max = sector.max !== undefined ? parseAltitude(sector.max) : 100000; // undefined max UNL

                    if (pilotAlt < min || pilotAlt > max) continue;

                    // string[][] -> number[][]
                    const points = sector.points as unknown as number[][];

                    if (isPointInPolygon(pilotPos, points)) {
                        const controller = posData.atc[0];

                        // Facility > 4 anything higher than TWR
                        if ((controller as any).facility <= 4) continue;

                        matches.push({
                            result: {
                                frequency: controller.frequency,
                                callsign: controller.callsign,
                                positionId: positionId,
                                controllerName: controller.name || controller.callsign,
                            },
                            minAlt: min,
                            maxAlt: max,
                        });
                    }
                }
            }
        }
    }

    if (matches.length === 0) return null;

    // Prioritize matches
    // TODO consider route of flight for better prioritization
    matches.sort((a, b) => {
        const rangeA = a.maxAlt - a.minAlt;
        const rangeB = b.maxAlt - b.minAlt;
        return rangeA - rangeB;
    });

    return matches[0].result;
}
