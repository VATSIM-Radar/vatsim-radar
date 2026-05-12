import type {
    NavigraphSettingsLevel,
    UserMapSettingsColors, UserMapSettingsTurns,
    UserMapSettingsVisibilityATC,
} from '~/utils/server/handlers/map-settings';
import type { SigmetType } from '~/types/map';

export interface UserSettingsV2 {
    user: {
        headerName: string;
    };

    appearance: {
        theme: 'light' | 'dark' | null;
        timeFormat: '24h' | '12h';
        favoriteSort: 'newest' | 'oldest' | 'abcAsc' | 'abcDesc' | 'cidAsc' | 'cidDesc';
    };

    map: {
        preferences: {
            autoFollow: boolean;
            autoZoom: boolean;
        };

        traffic: {
            showFullRoute: boolean;
            toggleAircraftOverlays: boolean;
            autoShowAirportTracks: boolean;
        };

        navigraph: {
            routeParsing: {
                enabled: boolean;
                // TODO: recheck if working
                enabledOnHover: boolean;
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
            };

            airport: {
                disable: boolean;
                gatesFallback?: boolean;
                hideTaxiways?: boolean;
                hideGateGuidance?: boolean;
                hideRunwayExit?: boolean;
                hideDeicing?: boolean;
            };
        };
    };

    sigmets: {
        showOnMap: boolean;
        disabled: SigmetType[];
        showAirmets: boolean;
        raw: boolean;
    };

    // stopped here

    visibility: {
        atc?: Partial<UserMapSettingsVisibilityATC> | boolean;
        atcLabels?: boolean;
        airports?: boolean;
        pilots?: boolean;
        gates?: boolean;
        runways?: boolean;
        pilotsInfo?: boolean;
        atcInfo?: boolean;
        bookings?: boolean;
        events?: boolean;
        pilotLabels?: boolean;
    };
    bookingHours: number;
    eventsHours: number;
    bookingsLocalTimezone?: boolean;
    disableQueryUpdate?: boolean;
    shortAircraftView?: boolean;
    shortAirportView?: boolean;
    overlaysPositions?: 'bottom-left' | 'top-left';
    aircraftDeclutter?: boolean | 'always';
    aircraftHoverDelay?: number | boolean;
    defaultAirportZoomLevel: number;
    heatmapLayer: boolean;
    highlightEmergency: boolean;
    vatglasses: {
        active?: boolean;
        autoEnable?: boolean;
        autoLevel?: boolean;
        combined?: boolean;
    };
    groundTraffic: {
        hide?: 'always' | 'lowZoom' | 'never';
        excludeMyArrival?: boolean;
        excludeMyLocation?: boolean;
    };
    aircraftScale: number;
    dynamicAircraftScale?: boolean;
    airportsMode: 'staffedOnly' | 'staffedAndGroundTraffic' | 'all';
    airportsHide: 'unstaffed' | 'all' | 'none';
    tracks: {
        mode?: 'arrivalsOnly' | 'arrivalsAndLanded' | 'departures' | 'allAirborne' | 'ground' | 'all';
        showOutOfBounds?: boolean;
        limit?: number;
    };
    hideATISOnly: boolean;
    airportsCounters: {
        showCounters?: boolean;
        syncDeparturesArrivals?: boolean;
        departuresMode?: 'total' | 'totalMoving' | 'totalLanded' | 'airborne' | 'ground' | 'groundMoving' | 'hide';
        arrivalsMode?: IUserMapSettings['airportsCounters']['departuresMode'];
        horizontalCounter?: 'total' | 'prefiles' | 'ground' | 'groundMoving' | 'hide';
        disableTraining?: boolean;
        syncWithOverlay?: boolean;
    };
    colors: {
        light?: UserMapSettingsColors;
        default?: UserMapSettingsColors;
        turns?: UserMapSettingsTurns;
        turnsTransparency?: number;
    };
    pilotLabelLimit: number;
    airportCounterLimit: number;
}
