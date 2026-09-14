import type { Feature as GeoFeature, Point as GeoPoint } from 'geojson';

export const aircraftState: Record<number, Partial<{
    updating: boolean;
    trackMode: 'short' | 'full';
    request: AbortController;
    settingRoute: boolean;
    turnsTimestamp: string;
    turnsFirstGroupTimestamp: string;
    turnsStart: string;
    turnsSecondGroupPoint: GeoFeature<GeoPoint> | null;
    timestamps: Set<string>;
    flightPlanKey: string;
    flightPlan: string;
    previousFlightPlan: string;
    needsFullTurnsUpdate: boolean;
}> | undefined> = {};

const turnsAttempts = new Map<number, number>();
export const TURNS_REQUEST_INTERVAL = 15_000;

// Keep only the small request deadline after a track is hidden. Reopening it must not
// bypass the per-CID limit, and failed/empty responses count as attempts as well.
export function beginTurnsRequest(cid: number, now = Date.now()) {
    for (const [key, date] of turnsAttempts) {
        if (now - date >= TURNS_REQUEST_INTERVAL) turnsAttempts.delete(key);
    }
    if (turnsAttempts.has(cid)) return false;
    turnsAttempts.set(cid, now);
    return true;
}

export function clearAircraftState(cid: number) {
    aircraftState[cid]?.request?.abort();
    delete aircraftState[cid];
}

export function disposeAircraftState(clearAttempts = true) {
    for (const cid in aircraftState) clearAircraftState(+cid);
    if (clearAttempts) turnsAttempts.clear();
}
