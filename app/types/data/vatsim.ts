import type { AircraftIcon } from '~/utils/icons';
import type { UserMapSettingsColor } from '~/utils/server/handlers/map-settings';
import type { BARSShort } from '~/utils/server/storage';

import type { RadarNotam } from '~/utils/shared/vatsim';

export interface VatsimGeneral {
    version?: number;
    update_timestamp: string;
    connected_clients?: number;
    unique_users: number;
    sups: VatsimController[];
    adm: VatsimController[];
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
    diverted?: boolean;
    diverted_arrival?: string;
    diverted_origin?: string;
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
    booking?: VatsimBookingAtc;
    isBooking?: boolean;
    duplicated?: boolean;
    duplicatedBy?: string;
    frequencies?: string[];
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

export interface VatsimBooking extends Omit<VatsimBookingData, 'division' | 'subdivision' | 'callsign' | 'cid'> {
    division?: VatsimDivision;
    subdivision?: VatsimSubDivision;
    atc: VatsimShortenedController;
    start_local?: string;
    end_local?: string;
    start_z?: string;
    end_z?: string;
}

export interface VatsimNattrak {
    id: number;
    identifier: string;
    active: boolean;
    last_routeing: string;
    valid_from: string | null;
    valid_to: string | null;
    last_active: string;
    concorde: number;
    flight_levels: number[] | null;
    direction: 'west' | 'east' | null;
    odd_or_even: 'even' | 'odd' | 'mixed';
}

export interface VatsimNattrakClient extends Omit<VatsimNattrak, 'valid_to' | 'valid_from'> {
    valid_from: Date | null;
    valid_to: Date | null;
}

export type VatsimBookingAtc = Omit<VatsimBooking, 'atc'>;

export interface VatsimData {
    general: VatsimGeneral;
    pilots: VatsimPilot[];
    controllers: VatsimController[];
    observers: VatsimController[];
    atis: VatsimATIS[];
    servers: VatsimServers[];
    prefiles: VatsimPrefile[];
    facilities: VatsimInfoLong[];
    ratings: VatsimInfoLong[];
    pilot_ratings: VatsimInfoLongName[];
    military_ratings: VatsimInfoLongName[];
}

export interface VatsimBookingData {
    id: number;
    callsign: string;
    cid: number;
    type: 'booking' | 'event' | 'exam' | 'mentoring';
    start: number;
    end: number;
    division: string;
    subdivision: string;
}

export type VatsimShortenedData = {
    general: VatsimGeneral;
    pilots: Array<
        Omit<VatsimPilot, 'server' | 'qnh_i_hg' | 'flight_plan' | 'last_updated' | 'logon_time'> &
        Partial<Pick<NonNullable<VatsimPilot['flight_plan']>, 'aircraft_faa' | 'aircraft_short' | 'departure' | 'arrival' | 'diverted' | 'diverted_arrival' | 'diverted_origin' | 'flight_rules'>> &
        Partial<Pick<VatsimExtendedPilot, 'status' | 'depDist' | 'toGoDist' | 'airport'>> & {
            filteredColor?: UserMapSettingsColor;
            filteredOpacity?: number;
        }
    >;
    controllers: Omit<VatsimController, 'visual_range' | 'server' | 'last_updated'>[];
    observers: Omit<VatsimController, 'frequency' | 'facility' | 'rating' | 'visual_range' | 'text_atis' | 'server' | 'last_updated'>[];
    atis: Omit<VatsimATIS, 'visual_range' | 'server' | 'last_updated'>[];
    prefiles: Array<Omit<VatsimPrefile, 'flight_plan' | 'last_updated'> & Partial<Pick<NonNullable<VatsimPrefile['flight_plan']>, 'aircraft_faa' | 'aircraft_short' | 'departure' | 'arrival' | 'flight_rules'>>>;
    bars: BARSShort;
} & Pick<VatsimData, 'facilities' | 'ratings' | 'pilot_ratings' | 'military_ratings'>;

export type VatsimMandatoryData = {
    timestamp: string;
    timestampNum: number;
    serverTime: number;
    pilots: [cid: VatsimPilot['cid'], longitude: VatsimPilot['longitude'], latitude: VatsimPilot['latitude'], icon: AircraftIcon, heading: number][];
    // controllers: [VatsimController['cid'], VatsimController['callsign'], VatsimController['frequency'], VatsimController['facility']][];
    // atis: VatsimMandatoryData['controllers'];
};

export type VatsimMandatoryConvertedData = {
    pilots: Required<Pick<VatsimPilot, 'cid' | 'longitude' | 'latitude' | 'icon' | 'heading'>>[];
};

export type VatsimShortenedAircraft = VatsimShortenedData['pilots'][0];
export type VatsimShortenedPrefile = VatsimShortenedData['prefiles'][0];
export type VatsimShortenedController = VatsimShortenedData['atis'][0];

export type VatsimMandatoryPilot = VatsimMandatoryConvertedData['pilots'][0];

export type VatsimLiveData = VatsimShortenedData & {
    keyedPilots?: Record<string, VatsimShortenedAircraft>;
    keyedPrefiles?: Record<string, VatsimShortenedPrefile>;
    notam: RadarNotam | null;
};

export type VatsimLiveDataShort = Pick<VatsimLiveData, 'general' | 'pilots' | 'observers' | 'controllers' | 'atis' | 'prefiles' | 'bars' | 'notam'>;

export type VatsimLiveCompactData = Omit<VatsimShortenedData, 'pilots' | 'controllers' | 'observers' | 'atis' | 'prefiles'> & VatsimLiveDataMap & {
    keyedPilots?: Record<string, VatsimShortenedAircraft>;
    keyedPrefiles?: Record<string, VatsimShortenedPrefile>;
    notam: RadarNotam | null;
};

export type VatsimLiveCompactDataShort = Pick<VatsimLiveCompactData, 'general' | 'pilots' | 'observers' | 'controllers' | 'atis' | 'prefiles' | 'bars' | 'notam' | 'map'>;

export type VatsimLiveDataMap = {
    map: {
        aircraft_faa: NonNullable<VatsimPilot['flight_plan']>['aircraft_faa'][];
        aircraft_short: NonNullable<VatsimPilot['flight_plan']>['aircraft_short'][];
        airports: string[];
        frequencies: VatsimPilot['frequencies'];
        status: VatsimExtendedPilot['status'][];
        codes: string[];
    };
    pilots: {
        ci: VatsimPilot['cid'];
        n: VatsimPilot['name'];
        ca: VatsimPilot['callsign'];
        rp: VatsimPilot['pilot_rating'];
        rm: VatsimPilot['military_rating'];
        la: VatsimPilot['latitude'];
        lo: VatsimPilot['longitude'];
        al: VatsimPilot['altitude'];
        gs: VatsimPilot['groundspeed'];
        ts: VatsimPilot['transponder'];
        hd: VatsimPilot['heading'];
        qn: VatsimPilot['qnh_mb'];
        frq: number[];
        sim?: VatsimPilot['sim'];
        // aircraft faa map
        tfa?: number;
        // aircraft short
        tsh?: number;
        // departure
        dep?: number;
        // arrival
        arr?: number;
        // diverted
        dv?: boolean;
        // diverted arrival
        dva?: number;
        // diverted origin
        dvo?: number;
        // status
        s?: number;
        dpd?: VatsimExtendedPilot['depDist'];
        dpg?: VatsimExtendedPilot['toGoDist'];
        // current airport
        ap?: number;
        rl?: VatsimPilotFlightPlan['flight_rules'];
    }[];
    controllers: {
        ci: VatsimShortenedController['cid'];
        n: VatsimShortenedController['name'];
        ca: VatsimShortenedController['callsign'];
        fa: VatsimShortenedController['facility'];
        ra: VatsimShortenedController['rating'];
        atis: VatsimShortenedController['text_atis'];
        lg: VatsimShortenedController['logon_time'];
        bk?: VatsimShortenedController['booking'];
        isBk?: VatsimShortenedController['isBooking'];
        dp?: VatsimShortenedController['duplicated'];
        dpBy?: VatsimShortenedController['duplicatedBy'];
        fr?: number;
        frq?: number[];
    }[];
    observers: Pick<VatsimLiveDataMap['controllers'][0], 'ci' | 'n' | 'ca' | 'frq' | 'lg'>[];
    atis: Array<VatsimLiveDataMap['controllers'][0] & {
        // ATIS code map
        co?: number;
    }>;
    prefiles: {
        ci: VatsimPrefile['cid'];
        n: VatsimPrefile['name'];
        ca: VatsimPrefile['callsign'];
        // aircraft faa map
        tfa?: number;
        // aircraft short
        tsh?: number;
        // departure
        dep?: number;
        // arrival
        arr?: number;
        rl?: VatsimPilotFlightPlan['flight_rules'];
    }[];
};

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

export interface VatsimStationAlias {
    id: string;
    name: string;
    frequency: number;
    frequencyAlias: number;
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

export type VatsimActiveEvent = Pick<VatsimEvent, 'id' | 'type' | 'name' | 'airports' | 'start_time' | 'end_time'>;

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

export interface VatsimTransceiverFrequency {
    id: number;
    frequency: number;
    latDeg: number;
    lonDeg: number;
    heightMslM: number;
    heightAglM: number;
}

export interface VatsimTransceiver {
    callsign: string;
    transceivers: VatsimTransceiverFrequency[];
}

export interface IVatsimTransceiver {
    frequencies: string[];
    groundAlt?: number;
    seaAlt?: number;
}

interface VatsimAchievement {
    provider_name: string;
    provider_url: string;
    name: string;
    course_url: string;
}

export interface VatsimAchievementList extends VatsimAchievement {
    description: string;
    image_url: string;
}

export interface VatsimAchievementUser extends VatsimAchievement {
    badge_name: string;
    badge_image_url: string;
    description?: string;
}

export enum ViffStatus {
    // Flight Suspended due to Not Reported As Airborne.
    FLS_NRA = 'FLS-NRA',
    // Flight Suspended Triggered by CDM.
    FLS_CDM = 'FLS-CDM',
    // Flight Suspended due to Mandatory Route.
    FLS_MR = 'FLS-MR',
    // Flight Suspended due to Ground Stop.
    FLS_GS = 'FLS-GS',
    // Flight is de-suspended
    DES = 'DES',
    // Slot (CTOT) Allocated - Slot Allocation Message.
    SAM = 'SAM',
    // Slot (CTOT) updated - Slot Revision Message.
    SRM = 'SRM',
    // Slot (CTOT) Not applicable anymore - Slot Cancellation.
    SLC = 'SLC',
    // Flight is already in movement. Automatically set when AOBT is set.
    ATC_ACTIV = 'ATC_ACTIV',
    REA = 'REA',
    COMPLY = 'COMPLY',
    AIRB = 'AIRB',
}

export enum ViffRegulationType {
    AD = 'AD',
    ENR = 'ENR',
    ECFMP = 'ECFMP',
}

export interface IpfsUser {
    departure: string;
    eobt: string;
    tobt: string;
    obt: string;
    reqTobt: string;
    taxi: number;
    ctot: string;
    aobt: string;
    atot: string;
    eta: string;
    isCdm: boolean;
    onTime: '0' | '1';
    atfcmStatus: ViffStatus;
    cdmSts: ViffStatus;
    cdmData: {
        tobt: string;
        tsat: string;
        ttot: string;
        ctot: string;
        reason: string;
        asrt: string;
        depInfo: string;
        reqAsrt: string;
        reqTobt: string;
        reqTobtType: string;
        mostPenalisingRegulation: string;
        mostPenalisingRegulationType: ViffRegulationType;
        // Comma-separated
        regulations: string;
    };
}
