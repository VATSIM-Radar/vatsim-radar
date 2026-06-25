import type { VatsimPilot, VatsimShortenedAircraft } from '~/types/data/vatsim';
import type { NavigraphGate } from '~/types/data/navigraph';
import type { Coordinate } from 'ol/coordinate.js';
import type { AmdbLayerName } from '@navigraph/amdb';
import type { SimAwareDataFeature } from '~/utils/server/storage';

export function adjustPilotLonLat(pilot: VatsimShortenedAircraft | VatsimPilot): Coordinate {
    let lonAdjustment: number;
    let latAdjustment: number;
    let direction = pilot.heading;

    if (direction >= 0 && direction < 90) {
        lonAdjustment = (direction / 90) * 0.0002;
        latAdjustment = (1 - (direction / 90)) * 0.0002;
    }
    else if (direction >= 90 && direction < 180) {
        direction -= 90;
        lonAdjustment = (1 - (direction / 90)) * 0.0002;
        latAdjustment = (direction / 90) * -0.0002;
    }
    else if (direction >= 180 && direction < 270) {
        direction -= 180;
        lonAdjustment = (direction / 90) * -0.0002;
        latAdjustment = (1 - (direction / 90)) * -0.0002;
    }
    else {
        direction -= 270;
        lonAdjustment = (1 - (direction / 90)) * -0.0002;
        latAdjustment = (direction / 90) * 0.0002;
    }

    return [pilot.longitude + lonAdjustment, pilot.latitude + latAdjustment];
}

function getMatchedGateIds(
    gates: NavigraphGate[],
    lon: number,
    lat: number,
    threshold: number,
): Set<string> {
    const matched = new Set<string>();

    for (const gate of gates) {
        if (
            Math.abs(gate.gate_longitude - lon) < threshold &&
            Math.abs(gate.gate_latitude - lat) < threshold
        ) {
            matched.add(gate.gate_identifier);
        }
    }

    return matched;
}

export interface GateMatchResult {
    truly: Set<string>;
    maybe: Set<string>;
}

export function getPilotGateMatch(
    pilot: VatsimShortenedAircraft | VatsimPilot,
    gates: NavigraphGate[],
): GateMatchResult {
    const empty: GateMatchResult = {
        truly: new Set(),
        maybe: new Set(),
    };

    if (pilot.groundspeed > 3) {
        return empty;
    }

    const originalLon = pilot.longitude;
    const originalLat = pilot.latitude;
    const [adjustedLon, adjustedLat] = adjustPilotLonLat(pilot);

    const trulyOriginal = getMatchedGateIds(gates, originalLon, originalLat, 0.00015);
    const truly = trulyOriginal.size > 0
        ? trulyOriginal
        : getMatchedGateIds(gates, adjustedLon, adjustedLat, 0.00015);

    const maybeOriginal = getMatchedGateIds(gates, originalLon, originalLat, 0.0003);
    const maybe = maybeOriginal.size > 0
        ? maybeOriginal
        : getMatchedGateIds(gates, adjustedLon, adjustedLat, 0.0003);

    return {
        truly,
        maybe,
    };
}

export function getGatesMatch(
    gates: NavigraphGate[],
    pilots: Array<VatsimShortenedAircraft | VatsimPilot>,
): NavigraphGate[] {
    const trulyOccupied = new Set<string>();
    const maybeOccupied = new Set<string>();

    for (const pilot of pilots) {
        if (!pilot) continue;
        const match = getPilotGateMatch(pilot, gates);

        for (const gateId of match.truly) {
            trulyOccupied.add(gateId);
        }

        for (const gateId of match.maybe) {
            maybeOccupied.add(gateId);
        }
    }

    return gates.map(gate => ({
        ...gate,
        trulyOccupied: trulyOccupied.has(gate.gate_identifier),
        maybeOccupied: maybeOccupied.has(gate.gate_identifier),
    }));
}

export function getPilotTrueAltitude(pilot: Pick<VatsimShortenedAircraft, 'altitude' | 'qnh_mb'> & unknown): number {
    const altitude = Number.isFinite(pilot.altitude) ? pilot.altitude : 0;
    if (altitude < 9500) return altitude;
    if (!Number.isFinite(pilot.qnh_mb)) return altitude;
    return Math.round(altitude - ((pilot.qnh_mb - 1013) * 28.9));
}

export function getTraconPrefixes(tracon: SimAwareDataFeature): string[] {
    if (typeof tracon.properties?.prefix === 'object' && Array.isArray(tracon.properties.prefix)) return tracon.properties.prefix;

    return [];
}

export function getTraconSuffix(tracon: SimAwareDataFeature): string | null {
    if (typeof tracon.properties?.suffix === 'string') return tracon.properties.suffix;

    return null;
}

export const supportedNavigraphLayouts: AmdbLayerName[] = [
    'parkingstandarea',
    'apronelement',
    'arrestinggearlocation',
    'blastpad',
    'constructionarea',
    'finalapproachandtakeoffarea',
    'runwaythreshold',
    'runwaydisplacedarea',
    'runwayelement',
    'runwayintersection',
    'runwaymarking',
    'runwayshoulder',
    'serviceroad',
    'taxiwayshoulder',
    'verticallinestructure',
    'verticalpolygonalstructure',
    'hotspot',
    'paintedcenterline',
    'verticalpointstructure',
];

export enum NotamType {
    ERROR = 'ERROR',
    WARNING = 'WARNING',
    ANNOUNCEMENT = 'ANNOUNCEMENT',
}

export interface RadarNotam {
    id: number;
    type: NotamType;
    text: string;
    active: boolean;
    activeFrom: string | null;
    activeTo: string | null;
    dismissable: boolean;
}

const facilitiesMap = {
    OBS: 0,
    FSS: 1,
    DEL: 2,
    GND: 3,
    TWR: 4,
    APP: 5,
    CTR: 6,
};

export function getFacilityByCallsign(callsign: string): number {
    let postfix = callsign.split('_').at(-1);
    if (postfix === 'DEP') postfix = 'APP';
    if (postfix === 'RMP') postfix = 'GND';
    return facilitiesMap[postfix as keyof typeof facilitiesMap] ?? -1;
}

export function getFlightPlanParam(remarks: string | null | undefined, param: string) {
    if (!remarks) return null;

    const result = new RegExp(`( |^)${ param }\/(?<val>.+?)( [A-Z]+\/.*|$)`).exec(remarks);
    return result?.groups?.val || null;
}
