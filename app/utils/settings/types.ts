import type {
    NavigraphSettingsLevel,
    UserMapSettingsColors, UserMapSettingsTurns,
    UserMapSettingsVisibilityATC,
} from '~/utils/server/handlers/map-settings';
import type {
    MapLayoutLayerWithOptions,
    MapWeatherLayer,
    NotamsSortBy, SearchFilter,
    SigmetType,
    UserLayersTransparencySettings,
} from '~/types/map';
import type { VatsimNattrak } from '~/types/data/vatsim';
import type { Units } from 'ol/control/ScaleLine.js';
import type { RecursivePartial } from '~/types';
import type { UserPreset } from '#prisma';

export interface UserSettingsV2 {
    version: '2.0';
    appearance: {
        theme?: 'light' | 'default' | null;
        headerName: string;
        timeFormat: '24h' | '12h';
        eventsLocalTimezone: boolean;
        bookingsLocalTimezone: boolean;
        notamsSortBy: NotamsSortBy | null;
        favoriteSort: 'newest' | 'oldest' | 'abcAsc' | 'abcDesc' | 'cidAsc' | 'cidDesc' | null;
    };

    map: {
        preferences: {
            autoFollow: boolean;
            autoZoom: boolean;
            debugMode: boolean;

            featuredDefaultBookmarks: boolean;
            skipBookmarkAnimation: boolean;

            showTotalDeparturesInFeaturedAirports: boolean;

            searchBy: SearchFilter[];
            searchLimit: number;
            enableQueryUpdate: boolean;

            overlaysPositions: 'bottom-left' | 'top-left';
            favoriteLocation: 'header' | 'footer';
            highRatio: boolean;

            aircraft: {
                shortView: boolean;
                scale: number;
                dynamicScale: boolean;
                ownAtcHighlight: boolean;
                tracks: {
                    mode: 'arrivalsOnly' | 'arrivalsAndLanded' | 'departures' | 'allAirborne' | 'ground' | 'all';
                    showOutOfBounds: boolean;
                    limit: number;
                };
                showLimit: number;
            };

            airports: {
                defaultZoomLevel: number;
                shortView: boolean | 'never';
                showMode: 'staffedOnly' | 'staffedAndGroundTraffic' | 'all' | 'allExisting';
                declutterIf: 'unstaffed' | 'all' | 'none';
                ATISAsUnstaffed: boolean;
                voiceButton: boolean;
                groundTraffic: {
                    hide: 'always' | 'lowZoom' | 'never';
                    excludeMyArrival: boolean;
                    excludeMyLocation: boolean;
                };
                departuresCountInOverlay: boolean;
                counters: {
                    enabled: boolean;
                    syncDeparturesArrivals?: boolean;
                    departuresMode?: 'total' | 'totalMoving' | 'totalLanded' | 'airborne' | 'ground' | 'groundMoving' | 'hide';
                    arrivalsMode?: UserSettingsV2['map']['preferences']['airports']['counters']['departuresMode'];
                    horizontalCounter?: 'total' | 'prefiles' | 'ground' | 'groundMoving' | 'hide';
                    disableTraining?: boolean;
                };
                showLimit: number;
            };

            colors: {
                light: Required<UserMapSettingsColors>;
                default: Required<UserMapSettingsColors>;
                turns: UserMapSettingsTurns;
                turnsTransparency: number;
            };
        };

        layers: {
            weather: MapWeatherLayer | null;
            layer: MapLayoutLayerWithOptions;
            layerLabels: boolean;
            relativeIndicator: false | Units;
            terminator: boolean;
            heatmap: boolean;

            transparency: UserLayersTransparencySettings;

            natTrak: {
                enabled: boolean;
                concorde: boolean;
                direction: VatsimNattrak['direction'] | 'both' | 'all';
            };

            distance: {
                enabled: boolean;
                units: Units;
                interaction: 'dblclick' | 'ctrlclick';
            };
        };

        traffic: {
            showFullRoute: boolean;
            showRouteDetails: boolean;
            toggleAircraftOverlays: boolean;
            autoShowAirportTracks: boolean;
            disableFastUpdate: boolean;
            smoothMovement: boolean;
            declutter: boolean | 'always';
            highlightEmergency: boolean;
            showAirlineLogos: boolean;
            showCountryFlags: boolean;
            showRegistrationFlags: boolean;
        };

        vatglasses: {
            active: boolean;
            autoEnable: boolean;
            autoLevel: boolean;
            combined: boolean;
        };

        navigraph: {
            enabled: boolean;

            routeParsing: {
                enabled: boolean;
                // TODO: recheck if working
                enabledOnHover: boolean;

                airportOverlay: {
                    enabled: boolean;
                    dashedLine: boolean;
                    hideLineIfNoProcedure: boolean;
                    sid: boolean;
                    star: boolean;
                    holds: boolean;
                    labels: boolean;
                    waypoints: boolean;
                };
            };

            layers: {
                ndb: boolean;
                vordme: boolean;
                waypoints: boolean;
                terminalWaypoints: boolean;
                holdings: boolean;
                ifrMode: NavigraphSettingsLevel;
                ifrAuto: boolean;
                airways: Partial<{
                    enabled: boolean;
                    showAirwaysLabel: boolean;
                    showWaypointsLabel: boolean;
                }>;
                airspace: {
                    restricted: boolean;
                    controlled: boolean;
                };
            };

            airport: {
                enabled: boolean;
                taxiways?: boolean;
                gateGuidance?: boolean;
                runwayExit?: boolean;
                deicing?: boolean;
            };
        };

        visibility: {
            atc: UserMapSettingsVisibilityATC;
            atcLabels: boolean;
            vatglassesLabels: boolean;
            artccTracons: boolean;
            airports: boolean;
            pilots: boolean;
            gates: boolean;
            runways: boolean;
            pilotsInfo: boolean;
            atcInfo: boolean;
            pilotLabels: boolean;
        };

        bookings: {
            enabled: boolean;
            hours: number;
        };

        events: {
            enabled: boolean;
            hours: number;
        };
    };

    sigmets: {
        showOnMap: boolean;
        enabled: SigmetType[];
        showAirmets: boolean;
        raw: boolean;
    };
}

export type UserSettingsV2Partial = RecursivePartial<UserSettingsV2>;

export type UserSettingsPreset = UserPreset & {
    json: UserSettingsV2Partial;
};

type Primitive = string | number | boolean | null | undefined | symbol | bigint | Date;

export type DeepKeyOfSettings<T = UserSettingsV2> =
    T extends Primitive ? never
        : T extends readonly (infer U)[] // массив
            ? `${ number }` | `${ number }.${ DeepKeyOfSettings<U> }`
            : {
                [K in Extract<keyof T, string>]:
                T[K] extends Primitive
                    ? K
                    : K | `${ K }.${ DeepKeyOfSettings<T[K]> }`
            }[Extract<keyof T, string>];

export type DeepValueOfSetting<T, P extends DeepKeyOfSettings<T>> =
    P extends `${ infer K }.${ infer Rest }`
        ? K extends keyof T
            ? Rest extends DeepKeyOfSettings<T[K]>
                ? DeepValueOfSetting<T[K], Rest>
                : never
            : never
        : P extends keyof T
            ? T[P]
            : never;
