import type { MapAircraftStatus } from '~/composables/vatsim/pilots';
import type { PartialRecord } from '~/types';

export type UserMapSettingsColor = {
    color: string;
    transparency?: number;
} | null;

export interface UserMapSettingsColors {
    firs?: UserMapSettingsColor;
    uirs?: UserMapSettingsColor;
    centerText?: UserMapSettingsColor;
    centerBg?: UserMapSettingsColor;
    approach?: UserMapSettingsColor;
    staffedAirport?: number;
    defaultAirport?: number;
    approachBookings?: UserMapSettingsColor;
    centerBookings?: UserMapSettingsColor;
    aircraft?: PartialRecord<MapAircraftStatus, UserMapSettingsColor> & {
        main?: UserMapSettingsColor;
    };
    runways?: UserMapSettingsColor;
    gates?: number;
}

export interface UserMapSettingsVisibilityATC {
    firs: boolean;
    approach: boolean;
    ground: boolean;
}

export type UserMapSettingsTurns = 'magma' | 'inferno' | 'rainbow' | 'viridis';
export type NavigraphSettingsLevel = 'ifrHigh' | 'ifrLow' | 'vfr' | 'both';

export interface IUserLegacyMapSettings {
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
    navigraphLayers: Partial<{
        disable: boolean;
        gatesFallback?: boolean;
        hideTaxiways?: boolean;
        hideGateGuidance?: boolean;
        hideRunwayExit?: boolean;
        hideDeicing?: boolean;
    }>;
    navigraphData: Partial<{
        ndb: boolean;
        vordme: boolean;
        waypoints: boolean;
        terminalWaypoints: boolean;
        holdings: boolean;
        mode: NavigraphSettingsLevel;
        isModeAuto: boolean;
        airways: Partial<{
            enabled: boolean;
            showAirwaysLabel: boolean;
            showWaypointsLabel: boolean;
        }>;
    }>;
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
        arrivalsMode?: IUserLegacyMapSettings['airportsCounters']['departuresMode'];
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

export type UserMapLegacySettings = Partial<IUserLegacyMapSettings>;
