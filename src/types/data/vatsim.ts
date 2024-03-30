export interface VatsimGeneral {
    version: number;
    update_timestamp: string;
    connected_clients: number;
    unique_users: number;
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
    qnh_i_hb: number;
    qnh_mb: number;
    flight_plan: VatsimPilotFlightPlan;
    logon_time: string;
    last_updated: string;
}

export interface VatsimPilotFlightPlan {
    flight_rules: 'I' | 'V';
    aircraft: string;
    aircraft_faa: string;
    aircraft_short: string;
    departure: string;
    arrival: string;
    alternate: string;
    deptime: string;
    enroute_time: string;
    fuel_time: string;
    remarks: string;
    route: string;
    revision_id: number;
    assigned_transponder: string;
}

export interface VatsimController {
    cid: number;
    name: string;
    callsign: string;
    frequency: string;
    facility: number;
    rating: number;
    server: string;
    visual_range: number;
    text_atis: string[];
    last_updated: string;
    logon_time: string;
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
    short: string;
}

export interface VatsimInfoLong extends VatsimInfoDefault {
    long: string;
}

export interface VatsimInfoLongName extends VatsimInfoDefault {
    long_name: string;
}

export interface VatsimData {
    general: VatsimGeneral;
    pilots: VatsimPilot[];
    controllers: VatsimController[];
    atis: VatsimController[];
    servers: VatsimServers[];
    prefiles: VatsimPrefile[];
    facilities: VatsimInfoLong[];
    ratings: VatsimInfoLong[];
    pilot_ratings: VatsimInfoLongName[];
    military_ratings: VatsimInfoLongName[];
}

export type VatsimRegularData = {
    general: VatsimGeneral;
    pilots: Omit<VatsimPilot, 'server' | 'transponder' | 'qnh_mb' | 'qnh_i_hb' | 'flight_plan' | 'last_updated'>[];
    controllers: Omit<VatsimController, 'server' | 'last_updated'>[];
    atis: Omit<VatsimController, 'server' | 'last_updated'>[];
    prefiles: Omit<VatsimPrefile, 'flight_plan' | 'last_updated'>[];
} & Pick<VatsimData, 'facilities' | 'ratings' | 'pilot_ratings' | 'military_ratings'>

export type VatsimRegularDataShort = Pick<VatsimRegularData, 'pilots' | 'controllers' | 'atis' | 'prefiles'>

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
    VASOPS = 'VASOPS Event'
}

export interface VatsimEvent {
    id: number;
    type: VatsimEventType;
    name: string;
    link: string;
    organisers: {
        region: string | null
        division: string | null
        subdivision: string | null
        organized_by_vatsim: boolean
    }[];
    airports: {
        icao: string
    }[];
    routes: {
        departure: string
        arrival: string
        route: string
    }[];
    start_time: string;
    end_time: string;
    short_description: string;
    description: string;
    banner: string;
}
