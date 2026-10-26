import type { NavigraphAirportData, NavigraphGate } from '~/types/data/navigraph';
import type { AirportStandData } from '~/types/data/stands';

export interface NavigraphStandGuidanceLineInfo {
    wingspan: number | null;
    status: 'open' | 'closed' | null;
}

export interface NavigraphStandInfo {
    guidanceLines: NavigraphStandGuidanceLineInfo[];
    prohibitedAircraft: string[];
    maximumWingspan?: number | null;
    approvedAircraft?: string[] | null;
    notes?: string | null;
}

/**
 * Parses raw AMDB stand fields (parkingstandarea.restacn, standguidanceline.wingspan/status) for display.
 *
 * - Zero, negative, non-finite or absent wingspans are unknown
 * - AMDB status 0 is closed, 1 is open, anything else is unknown. It is a permanent status: temporary closures come from NOTAMs
 * - restacn is a dot-separated list of prohibited aircraft types
 * - Each guidance line is kept separately; we never pick a min/max across lines
 *
 * Returns null when nothing is known about the stand. Missing restrictions do not mean the stand is unrestricted.
 */
export function parseNavigraphStand({ restacn, guidanceLines }: Pick<NavigraphGate, 'restacn' | 'guidanceLines'>): NavigraphStandInfo | null {
    const prohibitedAircraft = typeof restacn === 'string' ? [...new Set(restacn.split('.').map(aircraft => aircraft.trim()).filter(Boolean))] : [];

    const lines = (Array.isArray(guidanceLines) ? guidanceLines : []).flatMap<NavigraphStandGuidanceLineInfo>(line => {
        const wingspan = Number.isFinite(line?.wingspan) && line.wingspan > 0 ? line.wingspan : null;
        const status = line?.status === 0 ? 'closed' : line?.status === 1 ? 'open' : null;

        if (wingspan === null && status === null) return [];

        return [{ wingspan, status }];
    });

    if (!lines.length && !prohibitedAircraft.length) return null;

    return {
        guidanceLines: lines,
        prohibitedAircraft,
    };
}

export function parseStand(gate: Pick<NavigraphGate, 'restacn' | 'guidanceLines' | 'standInformation'>): NavigraphStandInfo | null {
    const navigraph = parseNavigraphStand(gate);
    if (navigraph) return navigraph;
    const information = gate.standInformation;
    if (!information) return null;
    const maximumWingspan = typeof information.maximumWingspan === 'number' && Number.isFinite(information.maximumWingspan) && information.maximumWingspan > 0 ? information.maximumWingspan : null;
    const prohibitedAircraft = Array.isArray(information.prohibitedAircraft) ? information.prohibitedAircraft.filter(aircraft => typeof aircraft === 'string' && aircraft.trim()) : [];
    const approvedAircraft = Array.isArray(information.approvedAircraft) ? information.approvedAircraft.filter(aircraft => typeof aircraft === 'string' && aircraft.trim()) : null;
    const notes = typeof information.notes === 'string' ? information.notes.trim() : null;
    const hasApprovedList = approvedAircraft && (approvedAircraft.length > 0 || information.approvedAircraft?.length === 0);
    if (!maximumWingspan && !prohibitedAircraft.length && !hasApprovedList && !notes) return null;
    return { maximumWingspan, prohibitedAircraft, approvedAircraft: hasApprovedList ? approvedAircraft : null, notes, guidanceLines: [] };
}

export function mergeAirportStandData(community: AirportStandData, navigraph?: NavigraphAirportData): NavigraphAirportData {
    // Match full published identifiers only; keep each source's rules together rather than mixing limits or configurations.
    const communityNames = new Set(community.gates.map(gate => gate.name.trim().toUpperCase()));
    const navigraphNames = new Set((navigraph?.gates ?? []).filter(gate => parseNavigraphStand(gate)).map(gate => gate.name.trim().toUpperCase()));
    return {
        ...navigraph,
        airport: community.airport,
        gates: [
            ...community.gates.filter(gate => !navigraphNames.has(gate.name.trim().toUpperCase())),
            ...(navigraph?.gates ?? []).filter(gate => !communityNames.has(gate.name.trim().toUpperCase()) || navigraphNames.has(gate.name.trim().toUpperCase())),
        ],
        runways: navigraph?.runways ?? [],
    };
}
