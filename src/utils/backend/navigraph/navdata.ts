import type { Coordinate } from 'ol/coordinate';
import type sqlite3 from 'sqlite3';
import { dbPartialRequest } from '~/utils/backend/navigraph/db';

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

export type NavigraphNavDataNDB = Pick<NavigraphNavDataVHF, 'country' | 'datum' | 'icaoCode' | 'magneticVariation' | 'class' | 'frequency' | 'navaid' | 'range' | 'airport'>;

export interface NavigraphNavDataHolding {
    name: string;
    speed: number;
    icaoCode: string;
    inboundCourse: number;
    legLength: number | null;
    letTime: number | null;
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

export type NavigraphNavDataAirwayWaypoint = NavigraphNavDataWaypoint & {
    maxAlt: number;
    minAlt: number;
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
    procedure: string;
    transition: string | null;
    waypoints: NavigraphNavDataAirportWaypoint[];
    turn: 'R' | 'L' | null;
}

export interface NavigraphNavDataStar {
    airport: string;
    identifier: string;
    transition: 'ALL' | string | null;
    waypoints: NavigraphNavDataAirportWaypoint[];
    turn: 'R' | 'L' | null;
}

export type NavigraphNavDataSid = NavigraphNavDataStar;

export interface NavigraphNavDataControlledAirspace {
    center: string;
    classification: string;
    type: string;
    coordinates: Coordinate[];
    multipleCode: string;
    icaoCode: string;
    areaCode: string;
    lowerLimit: string | null;
    upperLimit: string | null;
    name: string;
    flightLevel: 'L' | 'B' | null;
}

export interface NavigraphNavDataRestrictedAirspace {
    coordinates: Coordinate[];
    type: string;
    icaoCode: string;
    areaCode: string;
    designation: string;
    lowerLimit: string | null;
    upperLimit: string | null;
    name: string;
    flightLevel: 'L' | 'B' | null;
}

export type NavDataProcedure<T extends NavigraphNavDataApproach | NavigraphNavDataStar | NavigraphNavDataSid> = {
    procedure: Omit<T, 'waypoints'>;
    waypoints: T['waypoints'][];
}[];

export interface NavigraphNavData {
    ndb: Record<string, NavigraphNavDataNDB>;
    holdings: Record<string, NavigraphNavDataHolding>;
    airways: Record<string, {
        airway: Omit<NavigraphNavDataAirway, 'waypoints'>;
        waypoints: NavigraphNavDataAirwayWaypoint[];
    }>;
    waypoints: NavigraphNavDataEnrouteWaypoint[];
    approaches: NavDataProcedure<NavigraphNavDataApproach>;
    stars: NavDataProcedure<NavigraphNavDataStar>;
    sids: NavDataProcedure<NavigraphNavDataSid>;
    restrictedAirspace: NavigraphNavDataRestrictedAirspace[];
    controlledAirspace: NavigraphNavDataControlledAirspace[];
}

export type NavigraphNavItems = {
    [K in keyof NavigraphNavData]: NavigraphNavData[K] extends Array<any> ? NavigraphNavData[K][0] : NavigraphNavData[K] extends object ? NavigraphNavData[K][keyof NavigraphNavData[K]] : never
};

export interface NavigraphNavDataShort {
    ndb: Record<string, [name: string, code: string, frequency: number, longitude: number, latitude: number]>;
    holdings: Record<string, [course: number, time: number | null, turns: NavigraphNavDataHolding['turns'], longitude: number, latitude: number]>;
    airways: Record<string, [identifier: string, waypoints: [identifier: string, longitude: number, latitude: number][]]>;
    waypoints: Record<string, [identifier: string, longitude: number, latitude: number]>;
    approaches: NavDataProcedure<NavigraphNavDataApproach>;
    stars: NavDataProcedure<NavigraphNavDataStar>;
    sids: NavDataProcedure<NavigraphNavDataSid>;
    restrictedAirspace: [type: string, designation: string, low: string, up: string, Coordinate[]][];
    controlledAirspace: [classification: string, low: string, up: string, Coordinate[]][];
}

export async function processDatabase(db: sqlite3.Database) {
    console.time('navigraph get');

    const fullData: Partial<NavigraphNavData> = {};
    const shortData: Partial<NavigraphNavDataShort> = {};

    // region VHF

    /* const vhf = await dbPartialRequest<{
        airport_identifier: string;
        area_code: string;
        continent: string;
        country: string;
        datum_code: string;
        dme_elevation: number;
        dme_ident: string;
        dme_latitude: number;
        dme_longitude: number;
        icao_code: string;
        ilsdme_bias: number;
        magnetic_variation: number;
        navaid_class: string;
        navaid_frequency: number;
        navaid_identifier: string;
        navaid_latitude: number;
        navaid_longitude: number;
        navaid_name: string;
        range: number;
        station_declination: number;
    }>({
        db,
        sql: 'SELECT * FROM tbl_d_vhfnavaids',
        table: 'tbl_d_vhfnavaids',
    });

    obj.vhf = {
        type: 'FeatureCollection',
        features: vhf.map(x => ({
            type: 'Feature',
            properties: {
                airport: x.airport_identifier,
                country: x.country,
                datum: x.datum_code,
                elevation: x.dme_elevation,
                ident: x.dme_ident,
                coordinates: [x.dme_longitude, x.dme_latitude],
                icaoCode: x.icao_code,
                bias: x.ilsdme_bias,
                magneticVariation: x.magnetic_variation,
                class: x.navaid_class,
                frequency: x.navaid_frequency,
                navaid: {
                    ident: x.navaid_identifier,
                    coordinates: [x.navaid_longitude, x.navaid_latitude],
                    name: x.navaid_name,
                },
                range: x.range,
                declination: x.station_declination,
            },
            geometry: {
                type: 'Point',
                coordinates: [x.dme_longitude, x.dme_latitude],
            },
        })),
    };*/

    // endregion VHF

    // region NDB

    const ndb = await dbPartialRequest<{
        area_code: string;
        continent: string;
        country: string;
        datum_code: string;
        icao_code: string;
        magnetic_variation: number;
        navaid_class: string;
        navaid_frequency: number;
        navaid_identifier: string;
        navaid_latitude: number;
        navaid_longitude: number;
        navaid_name: string;
        range: number;
    }>({
        db,
        sql: 'SELECT * FROM tbl_db_enroute_ndbnavaids',
        table: 'tbl_db_enroute_ndbnavaids',
    });

    fullData.ndb = {};
    shortData.ndb = {};

    for (const item of ndb) {
        const key = `${ item.icao_code }-${ item.navaid_frequency }`;

        fullData.ndb[key] = {
            airport: null,
            country: item.country,
            datum: item.datum_code,
            icaoCode: item.icao_code,
            magneticVariation: item.magnetic_variation,
            class: item.navaid_class,
            frequency: item.navaid_frequency,
            navaid: {
                ident: item.navaid_identifier,
                coordinates: [item.navaid_longitude, item.navaid_latitude],
                name: item.navaid_name,
            },
            range: item.range,
        };

        shortData.ndb[key] = [item.navaid_name, item.icao_code, item.navaid_frequency, item.navaid_longitude, item.navaid_latitude];
    }

    // endregion NDB

    // region Holdings

    const holdings = await dbPartialRequest<{
        area_code: string;
        duplicate_identifier: number;
        holding_name: string;
        holding_speed: number;
        icao_code: string;
        inbound_holding_course: number;
        leg_length: number;
        leg_time: number;
        maximum_altitude: number;
        minimum_altitude: number;
        region_code: string;
        turn_direction: string;
        waypoint_identifier: string;
        waypoint_latitude: number;
        waypoint_longitude: number;
        waypoint_ref_table: string;
    }>({
        db,
        sql: 'SELECT * FROM tbl_ep_holdings',
        table: 'tbl_ep_holdings',
    });

    fullData.holdings = {};
    shortData.holdings = {};

    for (const item of holdings) {
        const key = `${ item.icao_code }-${ item.area_code }-${ item.region_code }`;

        fullData.holdings[key] = {
            name: item.holding_name,
            speed: item.holding_speed,
            icaoCode: item.icao_code,
            inboundCourse: item.inbound_holding_course,
            legLength: item.leg_length,
            letTime: item.leg_time,
            maxAlt: item.maximum_altitude,
            minAlt: item.minimum_altitude,
            region: item.region_code,
            turns: item.turn_direction as 'R' | 'L',
            waypoint: {
                identifier: item.waypoint_identifier,
                coordinate: [item.waypoint_longitude, item.waypoint_latitude],
                ref: item.waypoint_ref_table,
            },
        };

        shortData.holdings[key] = [item.inbound_holding_course, item.leg_time, item.turn_direction as 'L' | 'R', item.waypoint_longitude, item.waypoint_latitude];
    }

    // endregion Holdings

    // region Waypoints

    const waypoints = await dbPartialRequest<{
        area_code: string;
        continent: string;
        country: string;
        datum_code: string;
        icao_code: string;
        magnetic_variation: number;
        waypoint_identifier: string;
        waypoint_latitude: number;
        waypoint_longitude: number;
        waypoint_name: string;
        waypoint_type: string;
        waypoint_usage: string;
    }>({
        db,
        sql: 'SELECT * FROM tbl_ea_enroute_waypoints',
        table: 'tbl_ea_enroute_waypoints',
    });

    fullData.waypoints = [];
    shortData.waypoints = {};

    for (const item of waypoints) {
        fullData.waypoints.push({
            identifier: item.waypoint_identifier,
            coordinate: [item.waypoint_longitude, item.waypoint_latitude],
            type: item.waypoint_type,
            usage: item.waypoint_usage,
        });

        shortData.waypoints[`${ item.waypoint_identifier }-${ item.area_code }`] = [item.waypoint_identifier, item.waypoint_longitude, item.waypoint_latitude];
    }

    // endregion Waypoints

    // region Airways

    const airways = await dbPartialRequest<{
        area_code: string;
        crusing_table_identifier: string;
        direction_restriction: string;
        flightlevel: string;
        icao_code: string;
        inbound_course: number;
        inbound_distance: number;
        maximum_altitude: number;
        minimum_altitude1: number;
        minimum_altitude2: number;
        outbound_course: number;
        route_identifier_postfix: string;
        route_identifier: string;
        route_type: string;
        seqno: number;
        waypoint_description_code: string;
        waypoint_identifier: string;
        waypoint_latitude: number;
        waypoint_longitude: number;
        waypoint_ref_table: string;
    }>({
        db,
        sql: 'SELECT * FROM tbl_er_enroute_airways',
        table: 'tbl_er_enroute_airways',
    });

    fullData.airways = {};
    shortData.airways = {};

    for (const airway of airways) {
        const key = `${ airway.area_code }-${ airway.route_type }-${ airway.route_identifier }`;
        let objectAirway = fullData.airways[key];
        let shortAirway = shortData.airways[key];

        if (!objectAirway) {
            objectAirway = {
                airway: {
                    icaoCode: airway.icao_code,
                    areaCode: airway.area_code,
                    identifier: airway.route_identifier,
                    type: airway.route_type,
                },
                waypoints: [],
            };

            fullData.airways[key] = objectAirway;
        }

        if (!shortAirway) {
            shortAirway = [airway.route_identifier, []];
            shortData.airways[key] = shortAirway;
        }

        objectAirway.waypoints.push({
            identifier: airway.waypoint_identifier,
            coordinate: [airway.waypoint_longitude, airway.waypoint_latitude],
            ref: airway.waypoint_ref_table,
            minAlt: airway.minimum_altitude1,
            maxAlt: airway.maximum_altitude,
        });
        shortAirway[1].push([airway.waypoint_identifier, airway.waypoint_longitude, airway.waypoint_latitude]);
    }

    // endregion airways

    // region Restricted Airspace

    const restricted = await dbPartialRequest<{
        arc_bearing: number;
        arc_distance: number;
        arc_origin_latitude: number;
        arc_origin_longitude: number;
        area_code: string;
        boundary_via: string;
        flightlevel: string;
        icao_code: string;
        latitude: number;
        longitude: number;
        lower_limit: string;
        multiple_code: string;
        restrictive_airspace_designation: string;
        restrictive_airspace_name: string;
        restrictive_type: string;
        seqno: number;
        unit_indicator_lower_limit: string;
        unit_indicator_upper_limit: string;
        upper_limit: string;
    }>({
        db,
        sql: 'SELECT * FROM tbl_ur_restrictive_airspace',
        table: 'tbl_ur_restrictive_airspace',
    });

    fullData.restrictedAirspace = [];
    shortData.restrictedAirspace = [];

    for (let i = 0; i < restricted.length; i++) {
        const item = restricted[i];
        if (item.seqno !== 10) continue;

        const coordinates: Coordinate[] = [[item.longitude, item.latitude]];

        let k = i + 1;
        let nextItem = restricted[k];

        while (nextItem && nextItem.seqno !== 10) {
            coordinates.push([nextItem.longitude, nextItem.latitude]);
            k++;
            nextItem = restricted[k];
        }

        fullData.restrictedAirspace.push({
            type: item.restrictive_type,
            icaoCode: item.icao_code,
            areaCode: item.area_code,
            designation: item.restrictive_airspace_designation,
            lowerLimit: item.lower_limit,
            upperLimit: item.upper_limit,
            name: item.restrictive_airspace_name,
            flightLevel: item.flightlevel as any,
            coordinates,
        });

        shortData.restrictedAirspace.push([item.restrictive_type, item.restrictive_airspace_designation, item.lower_limit, item.upper_limit, coordinates]);
    }

    // endregion Restricted Airspace

    // region Controlled Airspace

    const controlled = await dbPartialRequest<{
        airspace_center: string;
        airspace_classification: string;
        airspace_type: string;
        arc_bearing: number;
        arc_distance: number;
        arc_origin_latitude: number;
        arc_origin_longitude: number;
        area_code: string;
        boundary_via: string;
        controlled_airspace_name: string;
        flightlevel: string;
        icao_code: string;
        latitude: number;
        longitude: number;
        lower_limit: string;
        multiple_code: string;
        seqno: number;
        time_code: string;
        unit_indicator_lower_limit: string;
        unit_indicator_upper_limit: string;
        upper_limit: string;
    }>({
        db,
        sql: 'SELECT * FROM tbl_uc_controlled_airspace',
        table: 'tbl_uc_controlled_airspace',
    });

    fullData.controlledAirspace = [];
    shortData.controlledAirspace = [];

    for (let i = 0; i < controlled.length; i++) {
        const item = controlled[i];
        if (item.seqno !== 10 || !item.airspace_classification || item.airspace_classification === 'A' || item.upper_limit === 'UNLTD' || !item.longitude) continue;

        const coordinates: Coordinate[] = [[item.longitude, item.latitude]];

        let k = i + 1;
        let nextItem = controlled[k];

        while (!nextItem || nextItem.seqno !== 10) {
            if (!nextItem.longitude) break;
            coordinates.push([nextItem.longitude, nextItem.latitude]);
            k++;
            nextItem = controlled[k];
        }

        fullData.controlledAirspace.push({
            center: item.airspace_center,
            classification: item.airspace_classification,
            type: item.airspace_type,
            multipleCode: item.multiple_code,
            icaoCode: item.icao_code,
            areaCode: item.area_code,
            lowerLimit: item.lower_limit,
            upperLimit: item.upper_limit,
            name: item.controlled_airspace_name,
            flightLevel: item.flightlevel as any,
            coordinates,
        });

        shortData.controlledAirspace.push([item.airspace_classification, item.lower_limit, item.upper_limit, coordinates]);
    }

    // endregion Controlled Airspace

    console.timeEnd('navigraph get');

    return {
        full: fullData as NavigraphNavData,
        short: shortData as NavigraphNavDataShort,
    };
}

export async function updateNavigraphNavData() {

}
