import type { VatSpyDataFeature, VatSpyDataLocalATC } from '~/types/data/vatspy';
import type { MapAirport } from '~/types/map';
import type { AircraftIcon } from '~/utils/icons';
import type { UserMapSettingsColor } from '~/utils/backend/handlers/map-settings';

export interface VatsimGeneral {
    version: number;
    update_timestamp: string;
    connected_clients: number;
    unique_users: number;
    sups: VatsimController[];
    supsCount: number;
    admCount: number;
    onlineWSUsers: number;
}

export interface VatsimPilot {
    cid: number;
    name: string;
    callsign: string;
    server: string;
    pilot_rating: number;
    military_rating: number;
    latitude: number;
    longitude: number;
    altitude: number;
    groundspeed: number;
    transponder: string;
    heading: number;
    qnh_i_hg: number;
    qnh_mb: number;
    flight_plan?: VatsimPilotFlightPlan;
    logon_time: string;
    last_updated: string;
    frequencies: string[];
    sim?: string;
    icon?: AircraftIcon;
}

export interface VatsimExtendedPilot extends VatsimPilot {
    status?: 'depGate' | 'depTaxi' | 'departed' | 'climbing' | 'cruising' | 'enroute' | 'descending' | 'arriving' | 'arrTaxi' | 'arrGate';
    isOnGround?: boolean;
    depDist?: number;
    toGoDist?: number;
    toGoPercent?: number;
    toGoTime?: number;
    firs?: string[];
    airport?: string;
    stepclimbs?: {
        waypoint: string;
        measurement: 'FT' | 'M';
        level: number;
        ft: number;
    }[];
}

export type VatsimPilotFlightPlan = Partial<{
    flight_rules: 'I' | 'V' | 'S';
    aircraft: string;
    aircraft_faa: string;
    aircraft_short: string;
    departure: string;
    cruise_tas: string;
    altitude: string;
    arrival: string;
    alternate: string;
    deptime: string;
    enroute_time: string;
    fuel_time: string;
    remarks: string;
    route: string;
    revision_id: number;
    assigned_transponder: string;
    locked?: boolean;
}>;

export interface VatsimController {
    cid: number;
    name: string;
    callsign: string;
    frequency: string;
    facility: number;
    rating: number;
    server: string;
    visual_range: number;
    text_atis: string[] | null;
    last_updated: string;
    logon_time: string;
}

export interface VatsimATIS extends VatsimController {
    isATIS?: boolean;
    atis_code?: string;
}

export interface VatsimServers {
    ident: string;
    hostname_or_ip: string;
    location: string;
    name: string;
    client_connections_allowed: boolean;
    is_sweatbox: boolean;
}

export interface VatsimPrefile {
    cid: number;
    name: string;
    callsign: string;
    flight_plan: VatsimPilotFlightPlan;
    last_updated: string;
}

export interface VatsimInfoDefault {
    id: number;
}

export interface VatsimInfoLong extends VatsimInfoDefault {
    short: string;
    long: string;
}

export interface VatsimInfoLongName extends VatsimInfoDefault {
    short_name: string;
    long_name: string;
}

export interface VatsimData {
    general: VatsimGeneral;
    pilots: VatsimPilot[];
    controllers: VatsimController[];
    atis: VatsimATIS[];
    servers: VatsimServers[];
    prefiles: VatsimPrefile[];
    facilities: VatsimInfoLong[];
    ratings: VatsimInfoLong[];
    pilot_ratings: VatsimInfoLongName[];
    military_ratings: VatsimInfoLongName[];
}

export type VatsimShortenedData = {
    general: VatsimGeneral;
    pilots: Array<
        Omit<VatsimPilot, 'server' | 'qnh_i_hg' | 'flight_plan' | 'last_updated'> &
        Partial<Pick<NonNullable<VatsimPilot['flight_plan']>, 'aircraft_faa' | 'aircraft_short' | 'departure' | 'arrival'>> &
        Partial<Pick<VatsimExtendedPilot, 'status' | 'depDist' | 'toGoDist'>> & {
            filteredColor?: UserMapSettingsColor;
            filteredOpacity?: number;
        }
    >;
    controllers: Omit<VatsimController, 'server' | 'last_updated'>[];
    atis: Omit<VatsimATIS, 'server' | 'last_updated'>[];
    prefiles: Array<Omit<VatsimPrefile, 'flight_plan' | 'last_updated'> & Partial<Pick<NonNullable<VatsimPrefile['flight_plan']>, 'aircraft_faa' | 'aircraft_short' | 'departure' | 'arrival'>>>;
} & Pick<VatsimData, 'facilities' | 'ratings' | 'pilot_ratings' | 'military_ratings'>;

export type VatsimMandatoryData = {
    timestamp: string;
    timestampNum: number;
    serverTime: number;
    pilots: [cid: VatsimPilot['cid'], longitude: VatsimPilot['longitude'], latitude: VatsimPilot['latitude'], icon: AircraftIcon, heading: number][];
    controllers: [VatsimController['cid'], VatsimController['callsign'], VatsimController['frequency'], VatsimController['facility']][];
    atis: VatsimMandatoryData['controllers'];
};

export type VatsimMandatoryConvertedData = {
    pilots: Required<Pick<VatsimPilot, 'cid' | 'longitude' | 'latitude' | 'icon' | 'heading'>>[];
    controllers: Pick<VatsimController, 'cid' | 'callsign' | 'frequency' | 'facility'>[];
    atis: VatsimMandatoryConvertedData['controllers'];
};

export type VatsimShortenedAircraft = VatsimShortenedData['pilots'][0];
export type VatsimShortenedPrefile = VatsimShortenedData['prefiles'][0];
export type VatsimShortenedController = VatsimShortenedData['atis'][0];

export type VatsimMandatoryPilot = VatsimMandatoryConvertedData['pilots'][0];
export type VatsimMandatoryController = VatsimMandatoryConvertedData['controllers'][0];

export type VatsimLiveData = Omit<VatsimShortenedData, 'controllers' | 'atis'> & {
    locals: VatSpyDataLocalATC[];
    firs: VatSpyDataFeature[];
    airports: MapAirport[];
    keyedPilots?: Record<number, VatsimShortenedData['pilots'][0]>;
};

export type VatsimLiveDataShort = Pick<VatsimLiveData, 'general' | 'pilots' | 'locals' | 'firs' | 'prefiles' | 'airports'>;

export interface VatsimDivision {
    id: string;
    name: string;
    parentregion: string;
    subdivisionallowed: number;
}

export interface VatsimSubDivision {
    code: string;
    fullname: string;
    parentdivision: string;
}

export enum VatsimEventType {
    Event = 'Event',
    Exam = 'Controller Examination',
    VASOPS = 'VASOPS Event',
}

export interface VatsimEvent {
    id: number;
    type: VatsimEventType;
    name: string;
    link: string;
    organisers: {
        region: string | null;
        division: string | null;
        subdivision: string | null;
        organised_by_vatsim: boolean;
    }[];
    airports: {
        icao: string;
    }[];
    routes: {
        departure: string;
        arrival: string;
        route: string;
    }[];
    start_time: string;
    end_time: string;
    short_description: string;
    description: string;
    banner: string;
}

export type VatsimMemberStats = Record<
    | 'id'
    | 'atc'
    | 'pilot'
    | 's1'
    | 's2'
    | 's3'
    | 'c1'
    | 'c2'
    | 'c3'
    | 'i1'
    | 'i2'
    | 'i3'
    | 'sup'
    | 'adm',
    number
>;

export interface VatsimTransceiver {
    callsign: string;
    transceivers: {
        id: number;
        frequency: number;
        latDeg: number;
        lonDeg: number;
        heightMslM: number;
        heightAglM: number;
    }[];
}

export interface IVatsimTransceiver {
    frequencies: string[];
    groundAlt?: number;
    seaAlt?: number;
}
