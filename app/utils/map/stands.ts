import type { NavigraphGate } from '~/types/data/navigraph';

export interface NavigraphStandGuidanceLineInfo {
    wingspan: number | null;
    status: 'open' | 'closed' | null;
}

export interface NavigraphStandInfo {
    guidanceLines: NavigraphStandGuidanceLineInfo[];
    prohibitedAircraft: string[];
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

    const lines = (guidanceLines ?? []).flatMap<NavigraphStandGuidanceLineInfo>(line => {
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
