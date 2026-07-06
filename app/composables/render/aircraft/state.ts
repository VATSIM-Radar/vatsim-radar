import type { Feature as GeoFeature, Point as GeoPoint } from 'geojson';
import type { QuestDBGeojson } from '~/utils/server/questdb/converters';

export const aircraftState: Record<number, Partial<{
    updating: boolean;
    lastTurnsUpdate: number;
    lastTurnsUpdateData: QuestDBGeojson;
    settingRoute: boolean;
    turnsTimestamp: string;
    turnsFirstGroupTimestamp: string;
    turnsStart: string;
    turnsSecondGroupPoint: GeoFeature<GeoPoint> | null;
    timestamps: Set<string>;
    flightPlan: string;
    previousFlightPlan: string;
    needsFullTurnsUpdate: boolean;
}> | undefined> = {};
