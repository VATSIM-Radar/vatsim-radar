import * as v from 'valibot';
import { hexColorRegex } from '~/utils/shared';

export const MAX_DASHBOARD_AIRPORTS = 20;

export const dashboardColumns = ['prefiles', 'departing', 'enroute', 'departed', 'arriving', 'landed'] as const;
export type DashboardColumn = typeof dashboardColumns[number];

export const dashboardMapLocations = ['right', 'left', 'above', 'below'] as const;
export type DashboardMapLocation = typeof dashboardMapLocations[number];

export const dashboardMapSizes = [25, 50, 75, 100] as const;
export type DashboardMapSize = typeof dashboardMapSizes[number];

export const dashboardDisplayModes = ['both', 'map', 'aircraft'] as const;
export type DashboardDisplayMode = typeof dashboardDisplayModes[number];

const icaoSchema = v.pipe(v.string(), v.trim(), v.toUpperCase(), v.regex(/^[A-Z0-9]{2,4}$/));

const enrouteCallsignSchema = v.pipe(v.string(), v.trim(), v.toUpperCase(), v.regex(/^(?=.{2,12}$)[A-Z0-9-]+(?:_[A-Z0-9-]+){0,2}$/));

const colorSchema = v.pipe(v.string(), v.regex(hexColorRegex));

const flightLevelSchema = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(999));

export const DashboardAirportSchema = v.object({
    icao: icaoSchema,
    showInTrafficPrediction: v.optional(v.boolean(), false),
    aircraftColor: v.optional(v.nullable(colorSchema)),
});
export type DashboardAirport = v.InferOutput<typeof DashboardAirportSchema>;

export const DashboardSettingsSchema = v.object({
    airports: v.pipe(
        v.array(DashboardAirportSchema),
        v.minLength(1),
        v.maxLength(MAX_DASHBOARD_AIRPORTS),
        v.check(airports => new Set(airports.map(airport => airport.icao)).size === airports.length, 'Airport ICAOs must be unique'),
    ),
    mapLocation: v.optional(v.picklist(dashboardMapLocations), 'right'),
    enrouteCallsign: v.optional(v.nullable(enrouteCallsignSchema)),
    enrouteFlightLevel: v.optional(v.nullable(v.pipe(
        v.object({
            from: flightLevelSchema,
            to: flightLevelSchema,
        }),
        v.check(({ from, to }) => from <= to, 'Enroute FL "from" must be lower than or equal to "to"'),
    ))),
    mapSize: v.optional(v.picklist(dashboardMapSizes), 100),
    displayMode: v.optional(v.picklist(dashboardDisplayModes), 'both'),
    showMetar: v.optional(v.boolean(), true),
    showArrivalTracks: v.optional(v.boolean(), true),
    openColumns: v.optional(v.array(v.picklist(dashboardColumns)), () => [...dashboardColumns]),
});
export type DashboardSettings = v.InferOutput<typeof DashboardSettingsSchema>;

const dashboardNameSchema = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(50));

export const DashboardSchema = v.object({
    name: dashboardNameSchema,
    public: v.optional(v.boolean(), false),
    json: DashboardSettingsSchema,
});
export type DashboardPayload = v.InferOutput<typeof DashboardSchema>;
