import type { VatsimPilot, VatsimShortenedAircraft } from '~/types/data/vatsim';
import type { NavigraphGate } from '~/types/data/navigraph';
import type { Coordinate } from 'ol/coordinate';

export function adjustPilotLonLat(pilot: VatsimShortenedAircraft | VatsimPilot): Coordinate {
    let lonAdjustment = 0;
    let latAdjustment = 0;
    let direction = pilot.heading;

    if (direction >= 0 && direction < 90) {
        lonAdjustment = (direction / 90) * 30;
        latAdjustment = (1 - direction / 90) * 30;
    }
    else if (direction >= 90 && direction < 180) {
        direction -= 90;
        lonAdjustment = (1 - direction / 90) * 30;
        latAdjustment = (direction / 90) * -30;
    }
    else if (direction >= 180 && direction < 270) {
        direction -= 180;
        lonAdjustment = (direction / 90) * -30;
        latAdjustment = (1 - direction / 90) * -30;
    }
    else {
        direction -= 270;
        lonAdjustment = (1 - direction / 90) * -30;
        latAdjustment = (direction / 90) * 30;
    }

    return [pilot.longitude + lonAdjustment, pilot.latitude + latAdjustment];
}

export function checkIsPilotInGate(pilot: VatsimShortenedAircraft | VatsimPilot, gates: NavigraphGate[]): {
    truly: boolean
    maybe: boolean
} {
    const result = {
        truly: false,
        maybe: false,
    };

    let pilotLon = pilot.longitude;
    let pilotLat = pilot.latitude;

    for (const gate of gates.filter(x => Math.abs(x.gate_longitude - pilotLon) < 25 && Math.abs(x.gate_latitude - pilotLat) < 25)) {
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
        for (const gate of gates.filter(x => Math.abs(x.gate_longitude - pilotLon) < 25 && Math.abs(x.gate_latitude - pilotLat) < 25)) {
            const index = gates.findIndex(x => x.gate_identifier === gate.gate_identifier);
            if (index === -1) continue;
            gates[index] = {
                ...gates[index],
                trulyOccupied: true,
            };
            result.truly = true;
        }
    }

    for (const gate of gates.filter(x => Math.abs(x.gate_longitude - pilot.longitude) < 50 && Math.abs(x.gate_latitude - pilot.latitude) < 50)) {
        const index = gates.findIndex(x => x.gate_identifier === gate.gate_identifier);
        if (index === -1) continue;
        gates[index] = {
            ...gates[index],
            maybeOccupied: true,
        };
        result.maybe = true;
    }

    if (!result.maybe) {
        for (const gate of gates.filter(x => Math.abs(x.gate_longitude - pilotLon) < 50 && Math.abs(x.gate_latitude - pilotLat) < 50)) {
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
    return Math.round(pilot.altitude - (pilot.qnh_mb - 1013) * 28.9);
}
