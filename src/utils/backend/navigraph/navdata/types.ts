import type { Coordinate } from 'ol/coordinate';
import type sqlite3 from 'sqlite3';

export interface NavigraphNavDataVHF {
    elevation: number;
    ident: string | null;
    coordinates: Coordinate;
    magneticVariation: number;
    frequency: number;
    navaid: {
        name: string;
        ident: string;
    };
    range: number;
}

export type NavigraphNavDataNDB = Pick<NavigraphNavDataVHF, 'magneticVariation' | 'navaid' | 'frequency' | 'range' | 'coordinates'>;

export interface NavigraphNavDataHolding {
    name: string;
    speed: number;
    inboundCourse: number;
    legLength: number | null;
    legTime: number | null;
    maxAlt: number | null;
    minAlt: number | null;
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

export interface NavigraphNavDataEnrouteWaypointPartial extends Partial<NavigraphNavDataAirportWaypointConstraints> {
    identifier: string;
    coordinate?: Coordinate;
    title?: string;
    type?: string;
    usage?: string;
    kind: 'sids' | 'stars' | 'approaches' | 'missedApproach' | 'airway' | 'enroute' | 'vhf' | 'ndb';
    airway?: {
        key: string;
        value: ShortAirway;
    };
}

export type NavDataFlightLevel = 'H' | 'L' | 'B' | null;
export type NavigraphNavDataAirwayWaypoint = NavigraphNavDataWaypoint & {
    maxAlt: number | null;
    minAlt: number | null;
    inbound: number | null;
    outbound: number;
    seqno: number;
    direction: 'F' | 'B' | null;
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

export interface NavigraphNavDataAirportWaypointConstraints {
    altitude: 'between' | 'equals' | 'above' | 'below' | null;
    altitude1: number | null;
    altitude2: number | null;

    speed: NavigraphNavDataAirportWaypoint['altitude'] | null;
    speedLimit: number | null;
}

export interface NavigraphNavDataAirportWaypoint extends NavigraphNavDataWaypoint, NavigraphNavDataAirportWaypointConstraints {

}

export interface NavigraphNavDataApproach {
    airport: string;
    procedureName: string;
    runway: string;
    transition: string | null;
    waypoints: NavigraphNavDataAirportWaypoint[];
    missedApproach: NavigraphNavDataAirportWaypoint[];
}

export type NavigraphNavDataStarShort = {
    identifier: string;
    runways: Array<string | null> | null;
    transitions: {
        runway: string[];
        enroute: string[];
    };
};

export type NavigraphNavDataApproachShort = {
    name: string;
    runway: string;
    transitions: string[];
};

export type NavigraphNavDataShortProcedures = {
    stars: NavigraphNavDataStarShort[];
    sids: NavigraphNavDataStarShort[];
    approaches: NavigraphNavDataApproachShort[];
};

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
export type ShortAirway = [identifier: string, type: string, waypoints: [identifier: string, inbound: number, outbound: number, longitude: number, latitude: number, flightLevel: NavDataFlightLevel, type?: string][]];

export interface NavigraphNavDataShort {
    vhf: Record<string, [name: string, identifier: string, frequency: number, longitude: number, latitude: number]>;
    ndb: Record<string, [name: string, identifier: string, frequency: number, longitude: number, latitude: number]>;
    holdings: Record<string, [waypoint: string, course: number, time: number | null, turns: NavigraphNavDataHolding['turns'], longitude: number, latitude: number, speed: number | null, regionCode: string, minLat: number | null, maxLat: number | null]>;
    airways: Record<string, ShortAirway>;
    waypoints: Record<string, [identifier: string, longitude: number, latitude: number, type: string]>;

    parsedVHF?: Record<string, NavigraphNavDataShort['vhf']>;
    parsedNDB?: Record<string, NavigraphNavDataShort['ndb']>;
    parsedAirways?: Record<string, NavigraphNavDataShort['airways']>;
    parsedWaypoints?: Record<string, NavigraphNavDataShort['waypoints']>;
}

export type NavdataProcessFunction = (settings: {
    db: sqlite3.Database;
    fullData: Partial<NavigraphNavData>;
    shortData: Partial<NavigraphNavDataShort>;
    runwaysByAirport: NavdataRunwaysByAirport;
}) => PromiseLike<any>;
export type NavdataRunwaysByAirport = Record<string, { identifier: string; coordinate: Coordinate }[]>;
