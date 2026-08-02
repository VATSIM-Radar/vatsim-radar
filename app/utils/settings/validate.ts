import * as v from 'valibot';
import { colorsList } from '~/utils/colors';
import { hexColorRegex } from '~/utils/shared';
import type { UserSettingsV2Partial } from '~/utils/settings/types';

const colorNames = Object.keys(colorsList);

const atcVisibilityKeys = ['firs', 'approach', 'ground'] as const;
const groundTrafficModeKeys = ['always', 'lowZoom', 'never'] as const;
const airportsModeKeys = ['staffedOnly', 'staffedAndGroundTraffic', 'all', 'allExisting'] as const;
const airportsDeclutterKeys = ['unstaffed', 'all', 'none'] as const;
const counterModeKeys = ['total', 'totalMoving', 'totalLanded', 'airborne', 'ground', 'groundMoving', 'hide'] as const;
const horizontalCounterModeKeys = ['total', 'prefiles', 'ground', 'groundMoving', 'hide'] as const;
const turnsKeys = ['magma', 'inferno', 'rainbow', 'viridis'] as const;
const tracksModeKeys = ['arrivalsOnly', 'arrivalsAndLanded', 'departures', 'ground', 'allAirborne', 'all'] as const;
const aircraftColorKeys = ['main', 'default', 'ground', 'green', 'active', 'hover', 'neutral', 'arriving', 'departing', 'landed'] as const;
const notamsSortKeys = ['startDesc', 'startAsc', 'endAsc', 'endDesc'] as const;
const favoriteSortKeys = ['newest', 'oldest', 'abcAsc', 'abcDesc', 'cidAsc', 'cidDesc'] as const;
const searchFilterKeys = ['flights', 'airports', 'atc'] as const;
const weatherLayerKeys = ['PR0', 'RE', 'PR0C', 'WND', 'CL', 'rainViewer'] as const;
const mapLayerKeys = [
    'OSM',
    'Satellite',
    'SatelliteEsri',
    'basic',
    'protoData',
    'protoDataGray',
    'protoGeneral',
    'protoDataLabels',
    'protoDataNoLabels',
    'protoDataGrayLabels',
    'protoDataGrayNoLabels',
    'protoGeneralLabels',
    'protoGeneralNoLabels',
] as const;
const unitsKeys = ['degrees', 'imperial', 'nautical', 'metric'] as const;
const natTrakDirectionKeys = ['west', 'east', 'both', 'all'] as const;
const distanceInteractionKeys = ['dblclick', 'ctrlclick'] as const;
const navigraphLevelKeys = ['ifrHigh', 'ifrLow', 'vfr', 'both'] as const;
const sigmetTypeKeys = ['TS', 'VA', 'FZLVL', 'WS', 'WIND', 'ICE', 'TURB', 'MTW', 'IFR', 'OBSC', 'CONV'] as const;

type Schema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

export type SettingsValidationResult =
    | {
        success: true;
        output: UserSettingsV2Partial;
    }
    | {
        success: false;
        error: string;
    };

function partialObject(entries: Record<string, Schema>, message = 'must be an object with known settings keys') {
    const optionalEntries: Record<string, unknown> = {};

    for (const [key, schema] of Object.entries(entries)) {
        optionalEntries[key] = v.optional(schema);
    }

    return v.strictObject(optionalEntries as never, message);
}

function list(values: readonly (string | number | boolean)[], message: string) {
    return v.picklist(values as never, message);
}

function numberValue(message = 'must be a finite number') {
    return v.pipe(
        v.number(message),
        v.check<number, string>(Number.isFinite, message),
    );
}

function rangedNumber(min: number, max: number, message: string, decimals?: number) {
    const schema = v.pipe(
        numberValue(message),
        v.minValue(min, message),
        v.maxValue(max, message),
    );

    if (decimals === undefined) return schema;

    return v.pipe(
        schema,
        v.check<number, string>(value => {
            const fraction = value.toString().split('.')[1];
            return !fraction || fraction.length <= decimals;
        }, `${ message } and have no more than ${ decimals } decimal places`),
    );
}

const booleanSchema = v.boolean('must be true or false');
const transparencySchema = v.pipe(
    rangedNumber(0, 1, 'must be a number between 0 and 1'),
    v.transform(value => Number(value.toFixed(2))),
);
const nullableTransparencySchema = v.nullable(transparencySchema);
const colorNameSchema = v.pipe(
    v.string('must be a color string'),
    v.check(color => hexColorRegex.test(color) || colorNames.includes(color), 'must be a known theme color or a valid hex/rgb color'),
);
const colorSchema = v.nullable(v.strictObject({
    color: colorNameSchema,
    transparency: v.optional(transparencySchema),
}, 'must be a color object'));
const aircraftColorsSchema = partialObject(
    Object.fromEntries(aircraftColorKeys.map(key => [key, colorSchema])) as Record<string, Schema>,
);
const themeColorsSchema = partialObject({
    firs: colorSchema,
    uirs: colorSchema,
    centerText: colorSchema,
    centerBg: colorSchema,
    approach: colorSchema,
    approachText: colorSchema,
    approachBg: colorSchema,
    staffedAirport: transparencySchema,
    defaultAirport: transparencySchema,
    approachBookings: colorSchema,
    centerBookings: colorSchema,
    aircraft: aircraftColorsSchema,
    runways: colorSchema,
    gates: transparencySchema,
});

const settingsSchema = partialObject({
    version: v.pipe(v.string('must be a string'), list(['2.0'], 'must contain version number')),

    appearance: partialObject({
        headerName: v.pipe(v.string('must be a string'), v.maxLength(30, 'must be 30 characters or shorter')),
        theme: v.nullable(list(['default', 'light'], 'must be either default, light or null')),
        timeFormat: list(['24h', '12h'], 'must be either 24h or 12h'),
        eventsLocalTimezone: booleanSchema,
        bookingsLocalTimezone: booleanSchema,
        notamsSortBy: v.nullable(list(notamsSortKeys, `must be one of: ${ notamsSortKeys.join(', ') }`)),
        favoriteSort: v.nullable(list(favoriteSortKeys, `must be one of: ${ favoriteSortKeys.join(', ') }`)),
    }),

    map: partialObject({
        preferences: partialObject({
            autoFollow: booleanSchema,
            autoZoom: booleanSchema,
            debugMode: booleanSchema,
            featuredDefaultBookmarks: booleanSchema,
            skipBookmarkAnimation: booleanSchema,
            showTotalDeparturesInFeaturedAirports: booleanSchema,
            searchBy: v.array(list(searchFilterKeys, `must be one of: ${ searchFilterKeys.join(', ') }`), 'must be an array of search categories'),
            searchLimit: list([5, 10, 20, 50, 75], 'must be one of: 5, 10, 20, 50, 75'),
            enableQueryUpdate: booleanSchema,
            overlaysPositions: list(['bottom-left', 'top-left'], 'must be either bottom-left or top-left'),
            favoriteLocation: list(['footer', 'header'], 'must be either footer or header'),
            highRatio: list([true, false, 'low'], 'must be either true, false or low'),

            aircraft: partialObject({
                shortView: booleanSchema,
                scale: rangedNumber(0.5, 1.5, 'must be a number between 0.5 and 1.5', 2),
                dynamicScale: booleanSchema,
                tracks: partialObject({
                    mode: list(tracksModeKeys, `must be one of: ${ tracksModeKeys.join(', ') }`),
                    showOutOfBounds: booleanSchema,
                    limit: rangedNumber(1, 100, 'must be a number between 1 and 100', 0),
                }),
                ownAtcHighlight: booleanSchema,
                showLimit: rangedNumber(0, 1000, 'must be a number between 0 and 1000', 0),
            }),

            airports: partialObject({
                defaultZoomLevel: rangedNumber(1, 50, 'must be a number between 1 and 50', 1),
                shortView: list([false, true, 'never'], `must be one of: false, true, never`),
                showMode: list(airportsModeKeys, `must be one of: ${ airportsModeKeys.join(', ') }`),
                declutterIf: list(airportsDeclutterKeys, `must be one of: ${ airportsDeclutterKeys.join(', ') }`),
                ATISAsUnstaffed: booleanSchema,
                voiceButton: booleanSchema,
                groundTraffic: partialObject({
                    hide: list(groundTrafficModeKeys, `must be one of: ${ groundTrafficModeKeys.join(', ') }`),
                    excludeMyArrival: booleanSchema,
                    excludeMyLocation: booleanSchema,
                }),
                departuresCountInOverlay: booleanSchema,
                counters: partialObject({
                    enabled: booleanSchema,
                    syncDeparturesArrivals: booleanSchema,
                    departuresMode: list(counterModeKeys, `must be one of: ${ counterModeKeys.join(', ') }`),
                    arrivalsMode: list(counterModeKeys, `must be one of: ${ counterModeKeys.join(', ') }`),
                    horizontalCounter: list(horizontalCounterModeKeys, `must be one of: ${ horizontalCounterModeKeys.join(', ') }`),
                    disableTraining: booleanSchema,
                }),
                showLimit: rangedNumber(0, 1000, 'must be a number between 0 and 1000', 0),
            }),

            colors: partialObject({
                light: themeColorsSchema,
                default: themeColorsSchema,
                turns: list(turnsKeys, `must be one of: ${ turnsKeys.join(', ') }`),
                turnsTransparency: transparencySchema,
            }),
        }),

        layers: partialObject({
            weather: v.nullable(list(weatherLayerKeys, `must be one of: ${ weatherLayerKeys.join(', ') }`)),
            layer: list(mapLayerKeys, `must be one of: ${ mapLayerKeys.join(', ') }`),
            layerLabels: booleanSchema,
            relativeIndicator: v.union([v.literal(false), list(unitsKeys, `must be false or one of: ${ unitsKeys.join(', ') }`)], `must be false or one of: ${ unitsKeys.join(', ') }`),
            terminator: booleanSchema,
            heatmap: booleanSchema,
            transparency: partialObject({
                osm: transparencySchema,
                satellite: transparencySchema,
                weatherDark: nullableTransparencySchema,
                weatherLight: nullableTransparencySchema,
                sigmets: transparencySchema,
            }),
            natTrak: partialObject({
                enabled: booleanSchema,
                concorde: booleanSchema,
                direction: v.nullable(list(natTrakDirectionKeys, `must be one of: ${ natTrakDirectionKeys.join(', ') }`)),
            }),
            distance: partialObject({
                enabled: booleanSchema,
                units: list(unitsKeys, `must be one of: ${ unitsKeys.join(', ') }`),
                interaction: list(distanceInteractionKeys, `must be one of: ${ distanceInteractionKeys.join(', ') }`),
            }),
        }),

        traffic: partialObject({
            showFullRoute: booleanSchema,
            showRouteDetails: booleanSchema,
            toggleAircraftOverlays: booleanSchema,
            autoShowAirportTracks: booleanSchema,
            disableFastUpdate: booleanSchema,
            smoothMovement: booleanSchema,
            declutter: v.union([booleanSchema, v.literal('always')], 'must be true, false or always'),
            highlightEmergency: booleanSchema,
            showAirlineLogos: booleanSchema,
            showCountryFlags: booleanSchema,
        }),

        vatglasses: partialObject({
            active: booleanSchema,
            autoEnable: booleanSchema,
            autoLevel: booleanSchema,
            combineBands: booleanSchema,
            combined: booleanSchema,
        }),

        navigraph: partialObject({
            enabled: booleanSchema,
            routeParsing: partialObject({
                enabled: booleanSchema,
                enabledOnHover: booleanSchema,
                airportOverlay: partialObject({
                    enabled: booleanSchema,
                    dashedLine: booleanSchema,
                    hideLineIfNoProcedure: booleanSchema,
                    sid: booleanSchema,
                    star: booleanSchema,
                    holds: booleanSchema,
                    labels: booleanSchema,
                    waypoints: booleanSchema,
                }),
            }),
            layers: partialObject({
                ndb: booleanSchema,
                vordme: booleanSchema,
                waypoints: booleanSchema,
                terminalWaypoints: booleanSchema,
                holdings: booleanSchema,
                ifrMode: list(navigraphLevelKeys, `must be one of: ${ navigraphLevelKeys.join(', ') }`),
                ifrAuto: booleanSchema,
                airways: partialObject({
                    enabled: booleanSchema,
                    showAirwaysLabel: booleanSchema,
                    showWaypointsLabel: booleanSchema,
                }),
                airspace: partialObject({
                    restricted: booleanSchema,
                    controlled: booleanSchema,
                }),
            }),
            airport: partialObject({
                enabled: booleanSchema,
                taxiways: booleanSchema,
                gateGuidance: booleanSchema,
                runwayExit: booleanSchema,
                deicing: booleanSchema,
            }),
        }),

        visibility: partialObject({
            atc: partialObject(Object.fromEntries(atcVisibilityKeys.map(key => [key, booleanSchema])) as Record<string, Schema>),
            atcLabels: booleanSchema,
            vatglassesLabels: booleanSchema,
            artccTracons: booleanSchema,
            airports: booleanSchema,
            pilots: booleanSchema,
            gates: booleanSchema,
            runways: booleanSchema,
            pilotsInfo: booleanSchema,
            atcInfo: booleanSchema,
            pilotLabels: booleanSchema,
        }),

        bookings: partialObject({
            enabled: booleanSchema,
            hours: rangedNumber(0.01, 4, 'must be a number greater than 0 and no more than 4', 2),
        }),

        events: partialObject({
            enabled: booleanSchema,
            hours: rangedNumber(0.01, 24, 'must be a number greater than 0 and no more than 24', 2),
        }),
    }),

    sigmets: partialObject({
        showOnMap: booleanSchema,
        enabled: v.array(list(sigmetTypeKeys, `must be one of: ${ sigmetTypeKeys.join(', ') }`), 'must be an array of SIGMET types'),
        showAirmets: booleanSchema,
        raw: booleanSchema,
    }),
});

function formatIssue(issue: v.GenericIssue) {
    const path = v.getDotPath(issue);
    const pathText = path ? ` at "${ path }"` : '';

    if (issue.type === 'strict_object') {
        if (issue.expected !== 'never') {
            return `Missing required settings key${ pathText }`;
        }

        return `Unknown settings key${ pathText }`;
    }

    return `Invalid settings value${ pathText }: ${ issue.message }`;
}

export function validateSettings(settings: unknown): SettingsValidationResult {
    const result = v.safeParse(settingsSchema, settings);

    if (result.success) {
        return {
            success: true,
            output: result.output as UserSettingsV2Partial,
        };
    }

    const [firstIssue] = result.issues;

    return {
        success: false,
        error: firstIssue ? formatIssue(firstIssue) : 'Settings validation failed',
    };
}
