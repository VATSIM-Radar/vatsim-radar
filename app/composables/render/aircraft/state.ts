import type { Feature as GeoFeature, Point as GeoPoint } from 'geojson';

export const aircraftState: Record<number, Partial<{
    updating: boolean;
    settingRoute: boolean;
    turnsTimestamp: string;
    turnsFirstGroupTimestamp: string;
    turnsStart: string;
    turnsSecondGroupPoint: GeoFeature<GeoPoint> | null;
    flightPlan: string;
    previousFlightPlan: string;
}> | undefined> = {};
