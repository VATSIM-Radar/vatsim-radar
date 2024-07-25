export enum KafkaClientType {
    Pilot = 1,
    Atc = 2,
}

export interface KafkaAddClient {
    Cid: string;
    Server: string;
    Callsign: string;
    Type: KafkaClientType;
    Rating: number;
    ProtocolRevision: number;
    RealName: string;
    SimType: number;
    Hidden: number;
}

export interface KafkaRmClient {
    Callsign: string;
}

export interface KafkaAD {
    Callsign: string;
    Frequency: string;
    FacilityType: number;
    VisualRange: number;
    Rating: number;
    Latitude: number;
    Longitude: number;
}

export interface KafkaPD {
    IdentFlag: string;
    Callsign: string;
    Transponder: number;
    Rating: number;
    Latitude: number;
    Longitude: number;
    Altitude: number;
    Groundspeed: number;
    Heading: number;
    PressureDifference: number;
}

export interface KafkaPlan {
    Callsign: string;
    Revision: string;
    Type: string;
    Aircraft: string;
    Cruisespeed: string;
    DepartureAirport: string;
    EstimatedDepartureTime: string;
    ActualDepartureTime: string;
    Altitude: string;
    DestinationAirport: string;
    HoursEnroute: string;
    MinutesEnroute: string;
    HoursFuel: string;
    MinutesFuel: string;
    AlternateAirport: string;
    Remarks: string;
    Route: string;
    Cid: string;
    ModifiedByCid: string;
    AssignedTransponder: string;
    HardLocked: number;
    RealName: string | null;
    Prefile: boolean;
}

export interface KafkaDelPlan {
    Callsign: string;
}
