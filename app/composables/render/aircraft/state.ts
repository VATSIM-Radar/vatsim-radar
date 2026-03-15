import type { Feature as GeoFeature, Point as GeoPoint } from 'geojson';
import type { InfluxGeojson } from '~/utils/server/influx/converters';

export const aircraftState: Record<number, Partial<{
    updating: boolean;
    lastTurnsUpdate: number;
    lastTurnsUpdateData: InfluxGeojson;
    settingRoute: boolean;
    turnsTimestamp: string;
    turnsFirstGroupTimestamp: string;
    turnsStart: string;
    turnsSecondGroupPoint: GeoFeature<GeoPoint> | null;
    timestamps: Set<string>;
    flightPlan: string;
    previousFlightPlan: string;
}> | undefined> = {};
