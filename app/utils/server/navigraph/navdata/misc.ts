import { dbPartialRequest } from '~/utils/server/navigraph/db';
import type { NavDataFlightLevel, NavdataProcessFunction } from '~/utils/server/navigraph/navdata/types';

export const processNavdataHoldings: NavdataProcessFunction = async ({ fullData, shortData, db }) => {
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
        const key = `${ item.icao_code }-${ item.waypoint_identifier }-${ item.area_code }-${ item.region_code }`;

        const waypoint = shortData.waypoints?.[`${ item.waypoint_identifier }-${ item.area_code }`];

        fullData.holdings[key] = {
            name: item.holding_name,
            speed: item.holding_speed,
            inboundCourse: item.inbound_holding_course,
            legLength: item.leg_length,
            legTime: item.leg_time,
            maxAlt: item.maximum_altitude,
            minAlt: item.minimum_altitude,
            turns: item.turn_direction as 'R' | 'L',
            waypoint: {
                identifier: item.waypoint_identifier,
                coordinate: [item.waypoint_longitude, item.waypoint_latitude],
                type: waypoint?.[3],
            },
        };

        shortData.holdings[key] = [item.waypoint_identifier, item.inbound_holding_course, item.leg_time, item.leg_length, item.turn_direction as 'L' | 'R', item.waypoint_longitude, item.waypoint_latitude, item.holding_speed, item.region_code, item.minimum_altitude, item.maximum_altitude, waypoint?.[3]];
    }
};

export const processNavdataWaypoints: NavdataProcessFunction = async ({ fullData, shortData, db }) => {
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
        waypoint_usage?: string;
        is_terminal?: boolean;
    }>({
        db,
        sql: 'SELECT * FROM tbl_ea_enroute_waypoints',
        table: 'tbl_ea_enroute_waypoints',
    });

    const terminalWaypoints = await dbPartialRequest<{
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
        is_terminal?: boolean;
    }>({
        db,
        sql: 'SELECT * FROM tbl_pc_terminal_waypoints',
        table: 'tbl_pc_terminal_waypoints',
    });

    for (let i = 0; i < terminalWaypoints.length; i++) {
        terminalWaypoints[i].is_terminal = true;
        waypoints.push(terminalWaypoints[i]);
    }

    fullData.waypoints = [];
    shortData.waypoints = {};

    for (const item of waypoints) {
        fullData.waypoints.push({
            identifier: item.waypoint_identifier,
            coordinate: [item.waypoint_longitude, item.waypoint_latitude],
            type: item.waypoint_type,
            usage: item.waypoint_usage,
            terminal: !!item.is_terminal,
        });

        shortData.waypoints[`${ item.waypoint_identifier }-${ item.area_code }`] = [item.waypoint_identifier, item.waypoint_longitude, item.waypoint_latitude, item.waypoint_type, !!item.is_terminal];
    }
};

const flightLevels: NavDataFlightLevel[] = ['H', 'L', 'B'];

function getFlightLevel(data: string): NavDataFlightLevel {
    if (flightLevels.includes(data as NavDataFlightLevel)) return data as NavDataFlightLevel;
    return 'B';
}

export const processNavdataAirways: NavdataProcessFunction = async ({ fullData, shortData, db }) => {
    const airways = await dbPartialRequest<{
        area_code: string;
        // crusing_table_identifier: string;
        direction_restriction: string;
        flightlevel: string;
        icao_code: string;
        inbound_course: number;
        inbound_distance: number;
        maximum_altitude: number;
        minimum_altitude1: number;
        minimum_altitude2: number;
        outbound_course: number;
        // route_identifier_postfix: string;
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
        sql: 'SELECT area_code, flightlevel, icao_code, direction_restriction, inbound_course, inbound_distance, maximum_altitude, minimum_altitude1, minimum_altitude2, outbound_course, route_identifier, route_type, seqno, waypoint_description_code, waypoint_identifier, waypoint_latitude, waypoint_longitude, waypoint_ref_table FROM tbl_er_enroute_airways',
        table: 'tbl_er_enroute_airways',
    });

    fullData.airways = {};
    shortData.airways = {};

    for (let i = 0; i < airways.length; i++) {
        const airway = airways[i];
        const key = `${ airway.route_identifier }-${ airway.area_code }-${ airway.route_type }-${ airway.icao_code }`;
        const previousAirway = airways[i - 1];
        let objectAirway = fullData.airways[key];
        let shortAirway = shortData.airways[key];

        if (previousAirway && previousAirway.seqno < airway.seqno && airway.route_identifier === previousAirway.route_identifier) continue;

        const nextAirways: typeof airways = [airway];

        let k = i + 1;
        let nextItem = airways[k];

        while (nextItem && airway.route_identifier === nextItem.route_identifier && airway.seqno < nextItem.seqno) {
            nextAirways.push(nextItem);
            k++;
            nextItem = airways[k];
        }

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
            shortAirway = [airway.route_identifier, airway.route_type, []];
            shortData.airways[key] = shortAirway;
        }

        for (const airway of nextAirways) {
            const flightLevel = getFlightLevel(airway.flightlevel);

            objectAirway.waypoints.push({
                identifier: airway.waypoint_identifier,
                coordinate: [airway.waypoint_longitude, airway.waypoint_latitude],
                minAlt: airway.minimum_altitude1,
                maxAlt: airway.maximum_altitude,
                inbound: airway.inbound_course,
                outbound: airway.outbound_course,
                seqno: airway.seqno,
                flightLevel,
                direction: airway.direction_restriction as any,
            });

            const waypoint = shortData.waypoints?.[`${ airway.waypoint_identifier }-${ airway.area_code }`];

            shortAirway[2].push([airway.waypoint_identifier, airway.inbound_course, airway.outbound_course, airway.waypoint_longitude, airway.waypoint_latitude, flightLevel, waypoint?.[3]]);
        }
    }
};
