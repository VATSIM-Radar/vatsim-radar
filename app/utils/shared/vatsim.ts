import type { VatsimPilot, VatsimShortenedAircraft } from '~/types/data/vatsim';
import type { NavigraphGate } from '~/types/data/navigraph';
import type { Coordinate } from 'ol/coordinate';
import type { GeoJSONFeature } from 'ol/format/GeoJSON';
import type { AmdbLayerName } from '@navigraph/amdb';

export function adjustPilotLonLat(pilot: VatsimShortenedAircraft | VatsimPilot): Coordinate {
    let lonAdjustment = 0;
    let latAdjustment = 0;
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

export function checkIsPilotInGate(pilot: VatsimShortenedAircraft | VatsimPilot, gates: NavigraphGate[]): {
    truly: boolean;
    maybe: boolean;
} {
    const result = {
        truly: false,
        maybe: false,
    };

    if (pilot.groundspeed > 1) return result;

    let pilotLon = pilot.longitude;
    let pilotLat = pilot.latitude;

    for (const gate of gates.filter(x => Math.abs(x.gate_longitude - pilotLon) < 0.00015 && Math.abs(x.gate_latitude - pilotLat) < 0.00015)) {
        const index = gates.findIndex(x => x.gate_identifier === gate.gate_identifier);
        if (index === -1) continue;
        gates[index] = {
            ...gates[index],
            trulyOccupied: true,
        };
        result.truly = true;
    }

    const adjusted = adjustPilotLonLat(pilot);

    pilotLon = adjusted[0];
    pilotLat = adjusted[1];

    if (!result.truly) {
        for (const gate of gates.filter(x => Math.abs(x.gate_longitude - pilotLon) < 0.00015 && Math.abs(x.gate_latitude - pilotLat) < 0.00015)) {
            const index = gates.findIndex(x => x.gate_identifier === gate.gate_identifier);
            if (index === -1) continue;
            gates[index] = {
                ...gates[index],
                trulyOccupied: true,
            };
            result.truly = true;
        }
    }

    for (const gate of gates.filter(x => Math.abs(x.gate_longitude - pilot.longitude) < 0.0003 && Math.abs(x.gate_latitude - pilot.latitude) < 0.0003)) {
        const index = gates.findIndex(x => x.gate_identifier === gate.gate_identifier);
        if (index === -1) continue;
        gates[index] = {
            ...gates[index],
            maybeOccupied: true,
        };
        result.maybe = true;
    }

    if (!result.maybe) {
        for (const gate of gates.filter(x => Math.abs(x.gate_longitude - pilotLon) < 0.0003 && Math.abs(x.gate_latitude - pilotLat) < 0.0003)) {
            const index = gates.findIndex(x => x.gate_identifier === gate.gate_identifier);
            if (index === -1) continue;
            gates[index] = {
                ...gates[index],
                maybeOccupied: true,
            };
            result.maybe = true;
        }
    }

    return result;
}

export function getPilotTrueAltitude(pilot: VatsimShortenedAircraft): number {
    if (pilot.altitude < 9500) return pilot.altitude;
    return Math.round(pilot.altitude - ((pilot.qnh_mb - 1013) * 28.9));
}

export function getTraconPrefixes(tracon: GeoJSONFeature): string[] {
    if (typeof tracon.properties?.prefix === 'string') return [tracon.properties.prefix];

    if (typeof tracon.properties?.prefix === 'object' && Array.isArray(tracon.properties.prefix)) return tracon.properties.prefix;

    return [];
}

export function getTraconSuffix(tracon: GeoJSONFeature): string | null {
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
