import type { Coordinate } from 'ol/coordinate';
import type sqlite3 from 'sqlite3';

export interface NavigraphNavDataVHF {
    airport: string | null;
    country: string;
    datum: string;
    elevation: number;
    ident: string | null;
    coordinates: Coordinate;
    icaoCode: string;
    bias: number | null;
    magneticVariation: number;
    class: string;
    frequency: number;
    navaid: {
        ident: string;
        coordinates: Coordinate;
        name: string;
    };
    range: number;
    declination: number;
}

export type NavigraphNavDataNDB = Pick<NavigraphNavDataVHF, 'country' | 'datum' | 'icaoCode' | 'magneticVariation' | 'class' | 'frequency' | 'navaid' | 'range' | 'airport' | 'coordinates'>;

export interface NavigraphNavDataHolding {
    name: string;
    speed: number;
    icaoCode: string;
    inboundCourse: number;
    legLength: number | null;
    legTime: number | null;
    maxAlt: number;
    minAlt: number;
    region: string;
    turns: 'R' | 'L';
    waypoint: NavigraphNavDataWaypoint;
}

export interface NavigraphNavDataWaypoint {
    identifier: string;
    coordinate: Coordinate;
    ref: string;
}

export interface NavigraphNavDataEnrouteWaypoint {
    identifier: string;
    coordinate: Coordinate;
    type: string;
    usage: string;
}

export type NavDataFlightLevel = 'H' | 'L' | 'B';
export type NavigraphNavDataAirwayWaypoint = NavigraphNavDataWaypoint & {
    maxAlt: number;
    minAlt: number;
    inbound: number;
    outbound: number;
    seqno: number;
    flightLevel: NavDataFlightLevel;
};

export interface NavigraphNavDataAirway {
    icaoCode: string;
    // Control, IFR, VFR
    type: 'C' | 'R' | 'O' | string;
    identifier: string;
    waypoints: NavigraphNavDataAirwayWaypoint;
    areaCode: string;
}

export interface NavigraphNavDataAirportWaypoint extends NavigraphNavDataWaypoint {
    altitude: 'between' | 'equals' | 'above' | 'below' | null;
    altitude1: number | null;
    altitude2: number | null;

    speed: NavigraphNavDataAirportWaypoint['altitude'] | null;
    speedLimit: number | null;
}

export interface NavigraphNavDataApproach {
    airport: string;
    procedureName: string;
    runway: string;
    transition: string | null;
    waypoints: NavigraphNavDataAirportWaypoint[];
    missedApproach: NavigraphNavDataAirportWaypoint[];
}

export interface NavigraphNavDataStar {
    airport: string;
    identifier: string;
    /**
     * @note null means show for all
     */
    runways: Array<string | null> | null;
    waypoints: NavigraphNavDataAirportWaypoint[];
}

export type NavigraphNavDataSid = NavigraphNavDataStar;

export interface NavigraphNavDataControlledAirspace {
    center: string;
    classification: string;
    type: string;
    coordinates: AirspaceCoordinateObj[];
    multipleCode: string;
    icaoCode: string;
    areaCode: string;
    lowerLimit: string | null;
    upperLimit: string | null;
    name: string;
    flightLevel: NavDataFlightLevel;
}

export interface NavigraphNavDataRestrictedAirspace {
    coordinates: AirspaceCoordinateObj[];
    type: string;
    icaoCode: string;
    areaCode: string;
    designation: string;
    lowerLimit: string | null;
    upperLimit: string | null;
    name: string;
    flightLevel: NavDataFlightLevel;
}

export type NavDataProcedure<T extends NavigraphNavDataApproach | NavigraphNavDataStar | NavigraphNavDataSid> = {
    procedure: Omit<T, 'waypoints'>;
    transitions: T extends NavigraphNavDataApproach ? {
        name: string;
        waypoints: T['waypoints'];
    }[] : {
        runway: {
            name: string;
            waypoints: T['waypoints'];
        }[];
        enroute: {
            name: string;
            waypoints: T['waypoints'];
        }[];
    };
    waypoints: T['waypoints'];
};

export interface NavigraphNavData {
    vhf: Record<string, NavigraphNavDataVHF>;
    ndb: Record<string, NavigraphNavDataNDB>;
    holdings: Record<string, NavigraphNavDataHolding>;
    airways: Record<string, {
        airway: Omit<NavigraphNavDataAirway, 'waypoints'>;
        waypoints: NavigraphNavDataAirwayWaypoint[];
    }>;
    waypoints: NavigraphNavDataEnrouteWaypoint[];
    approaches: Record<string, NavDataProcedure<NavigraphNavDataApproach>[]>;
    stars: Record<string, NavDataProcedure<NavigraphNavDataStar>[]>;
    sids: Record<string, NavDataProcedure<NavigraphNavDataSid>[]>;
    // restrictedAirspace: NavigraphNavDataRestrictedAirspace[];
    // controlledAirspace: NavigraphNavDataControlledAirspace[];
}

export type NavigraphGetData<K extends keyof NavigraphNavData> = NavigraphNavData[K] extends Array<any> ? NavigraphNavData[K][0] : NavigraphNavData[K] extends object ? NavigraphNavData[K][keyof NavigraphNavData[K]] : never;
export type NavigraphNavItems = {
    [K in keyof NavigraphNavData]: NavigraphNavData[K] extends Array<any> ? NavigraphNavData[K][0] : NavigraphNavData[K] extends object ? NavigraphNavData[K][keyof NavigraphNavData[K]] : never
};
export type AirspaceCoordinateObj = {
    coordinate: Coordinate;
    bearing?: number;
    distance?: number;
    boundaryVia: string;
};
export type AirspaceCoordinate = [coordinate: Coordinate, boundaryVia: string, bearing?: number, distance?: number];

export interface NavigraphNavDataShort {
    vhf: Record<string, [name: string, code: string, frequency: number, longitude: number, latitude: number]>;
    ndb: Record<string, [name: string, code: string, frequency: number, longitude: number, latitude: number]>;
    holdings: Record<string, [course: number, time: number | null, turns: NavigraphNavDataHolding['turns'], longitude: number, latitude: number, speed: number | null, regionCode: string]>;
    airways: Record<string, [identifier: string, type: string, waypoints: [identifier: string, inbound: number, outbound: number, longitude: number, latitude: number, flightLevel: NavigraphNavDataAirwayWaypoint['flightLevel'], type?: string][]]>;
    parsedAirways?: Record<string, NavigraphNavDataShort['airways']>;
    waypoints: Record<string, [identifier: string, longitude: number, latitude: number, type: string]>;
}

export type NavdataProcessFunction = (settings: {
    db: sqlite3.Database;
    fullData: Partial<NavigraphNavData>;
    shortData: Partial<NavigraphNavDataShort>;
    runwaysByAirport: NavdataRunwaysByAirport;
}) => PromiseLike<any>;
export type NavdataRunwaysByAirport = Record<string, { identifier: string; coordinate: Coordinate }[]>;
