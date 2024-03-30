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
    longtitude: number;
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

export type VatsimATIS = VatsimController

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

export interface VatsimInfo {
    id: number;
    short: string;
    long_name: string;
}

export interface VatsimData {
    general: VatsimGeneral;
    pilots: VatsimPilot[];
    controllers: VatsimController[];
    atis: VatsimATIS[];
    servers: VatsimServers[];
    prefiles: VatsimPrefile[];
    facilities: VatsimInfo[];
    ratings: VatsimInfo[];
    pilot_ratings: VatsimInfo[];
    military_ratings: VatsimInfo[];
}

export type VatsimDataShort = Pick<VatsimData, 'pilots' | 'controllers' | 'atis' | 'prefiles'>
