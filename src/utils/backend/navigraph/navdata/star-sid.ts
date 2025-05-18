import { dbPartialRequest } from '~/utils/backend/navigraph/db';
import type {
    NavDataProcedure,
    NavdataProcessFunction,
    NavigraphNavDataAirportWaypoint, NavigraphNavDataApproach, NavigraphNavDataSid, NavigraphNavDataStar,
} from '~/utils/backend/navigraph/navdata/types';
import { addNavDataRunways, buildNavDataWaypoint } from '~/utils/backend/navigraph/navdata/utils';
import { sleep } from '~/utils';

export const processNavdataSid: NavdataProcessFunction = async ({ fullData, db, runwaysByAirport }) => {
    const sids = await dbPartialRequest<{
        airport_identifier: string;
        altitude_description: string;
        altitude1: number;
        altitude2: number;
        // arc_radius: number;
        area_code: string;
        // authorization_required: string;
        // center_waypoint_icao_code: string;
        // center_waypoint_latitude: number;
        // center_waypoint_longitude: number;
        // center_waypoint_ref_table: string;
        // center_waypoint: string;
        // course_flag: string;
        course: number;
        distance_time: number;
        path_termination: string;
        procedure_identifier: string;
        // recommended_navaid_icao_code: string;
        // recommended_navaid_latitude: number;
        // recommended_navaid_longitude: number;
        // recommended_navaid_ref_table: string;
        // recommended_navaid: string;
        // rho: number;
        // rnp: number;
        // route_distance_holding_distance_time: string;
        route_type: string;
        seqno: number;
        speed_limit_description: string;
        speed_limit: number;
        // theta: number;
        // transition_altitude: number;
        transition_identifier: string;
        // turn_direction: string;
        // vertical_angle: number;
        waypoint_description_code: string;
        waypoint_icao_code: string;
        waypoint_identifier: string;
        waypoint_latitude: number;
        waypoint_longitude: number;
        waypoint_ref_table: string;
    }>({
        db,
        sql: 'SELECT airport_identifier, altitude_description, altitude1, altitude2, area_code, course, distance_time, path_termination, procedure_identifier, route_type, seqno, speed_limit_description, speed_limit, transition_identifier, waypoint_description_code, waypoint_icao_code, waypoint_identifier, waypoint_latitude, waypoint_longitude, waypoint_ref_table FROM tbl_pd_sids',
        table: 'tbl_pd_sids',
    });

    fullData.sids = {};

    const allowedRoutes = ['1', '2', '3', '4', '5', '6'];

    // key is airport-procedure here
    const sidsList: Record<string, NavDataProcedure<NavigraphNavDataSid>> = {};

    for (let i = 0; i < sids.length; i++) {
        const item = sids[i];
        const previousItem = sids[i - 1];
        if ((previousItem && previousItem.seqno < item.seqno) || !allowedRoutes.includes(item.route_type)) continue;

        const isRunwayTransition = item.route_type === '1' || item.route_type === '4';
        const isDeparture = item.route_type === '2' || item.route_type === '5';
        const isEnroute = item.route_type === '3' || item.route_type === '6';

        const waypoints: NavigraphNavDataAirportWaypoint[] = [];

        if (item.waypoint_latitude) waypoints.push(buildNavDataWaypoint(item));

        let k = i + 1;
        let seqno = item.seqno;
        let nextItem = sids[k];

        while (nextItem && nextItem.seqno > seqno) {
            if (nextItem.waypoint_latitude) {
                waypoints.push(buildNavDataWaypoint(nextItem));
            }
            k++;
            seqno = nextItem.seqno;
            nextItem = sids[k];
        }

        let procedure = sidsList[`${ item.airport_identifier }-${ item.procedure_identifier }`];
        if (!procedure) {
            procedure = sidsList[`${ item.airport_identifier }-${ item.procedure_identifier }`] = { procedure: { runways: [] }, transitions: { runway: [], enroute: [] }, waypoints: [] } as unknown as NavDataProcedure<NavigraphNavDataSid>;
        }

        const transition = item.transition_identifier?.replace('RW', '');

        if (item.transition_identifier?.startsWith('RW') || item.transition_identifier === 'ALL') {
            if (procedure.procedure.runways === null) procedure.procedure.runways = [null];

            addNavDataRunways(item.airport_identifier, transition, procedure.procedure.runways, runwaysByAirport);
        }

        if (isRunwayTransition) {
            procedure.transitions.runway.push({
                name: transition ?? '',
                waypoints,
            });
        }
        else if (isEnroute) {
            procedure.transitions.runway.push({
                name: transition ?? waypoints[waypoints.length - 1].identifier,
                waypoints,
            });
        }
        else if (isDeparture) {
            procedure.waypoints = waypoints;
        }

        procedure.procedure.airport ||= item.airport_identifier;
        procedure.procedure.identifier ||= item.procedure_identifier;
    }

    for (const [key, value] of Object.entries(sidsList)) {
        fullData.sids[key.split('-')[0]] ||= [];
        fullData.sids[key.split('-')[0]].push(value);

        const runways = runwaysByAirport[value.procedure.airport];

        if (!runways) continue;

        if (!value.transitions.runway?.length && value.procedure.runways?.length === 1 && value.procedure.runways[0]) {
            const runway = runways.find(x => x.identifier === value.procedure.runways![0]);

            if (!runway) continue;
            value.waypoints.unshift({
                altitude: null,
                altitude1: null,
                altitude2: null,
                speed: null,
                speedLimit: null,
                identifier: `RW${ runway.identifier }`,
                coordinate: runway.coordinate,
                ref: '',
            });
        }
    }
};

export const processNavdataStar: NavdataProcessFunction = async ({ fullData, db, runwaysByAirport }) => {
    const stars = await dbPartialRequest<{
        airport_identifier: string;
        altitude_description: string;
        altitude1: number;
        altitude2: number;
        // arc_radius: number;
        area_code: string;
        // authorization_required: string;
        // center_waypoint_icao_code: string;
        // center_waypoint_latitude: number;
        // center_waypoint_longitude: number;
        // center_waypoint_ref_table: string;
        // center_waypoint: string;
        // course_flag: string;
        course: number;
        distance_time: number;
        path_termination: string;
        procedure_identifier: string;
        // recommended_navaid_icao_code: string;
        // recommended_navaid_latitude: number;
        // recommended_navaid_longitude: number;
        // recommended_navaid_ref_table: string;
        // recommended_navaid: string;
        // rho: number;
        // rnp: number;
        // route_distance_holding_distance_time: string;
        route_type: string;
        seqno: number;
        speed_limit_description: string;
        speed_limit: number;
        // theta: number;
        // transition_altitude: number;
        transition_identifier: string;
        // turn_direction: string;
        // vertical_angle: number;
        waypoint_description_code: string;
        waypoint_icao_code: string;
        waypoint_identifier: string;
        waypoint_latitude: number;
        waypoint_longitude: number;
        waypoint_ref_table: string;
    }>({
        db,
        sql: 'SELECT airport_identifier, altitude_description, altitude1, altitude2, area_code, course, distance_time, path_termination, procedure_identifier, route_type, seqno, speed_limit_description, speed_limit, transition_identifier, waypoint_description_code, waypoint_icao_code, waypoint_identifier, waypoint_latitude, waypoint_longitude, waypoint_ref_table FROM tbl_pe_stars',
        table: 'tbl_pe_stars',
    });

    fullData.stars = {};

    const starAllowedRoutes = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

    // key is airport-procedure here
    const starsList: Record<string, NavDataProcedure<NavigraphNavDataStar>> = {};

    for (let i = 0; i < stars.length; i++) {
        const item = stars[i];
        const previousItem = stars[i - 1];
        if ((previousItem && previousItem.seqno < item.seqno) || !starAllowedRoutes.includes(item.route_type)) continue;

        const isRunwayTransition = item.route_type === '3' || item.route_type === '6' || item.route_type === '9';
        const isStar = item.route_type === '2' || item.route_type === '5' || item.route_type === '8';
        const isEnroute = item.route_type === '1' || item.route_type === '4' || item.route_type === '7';

        let waypoints: NavigraphNavDataAirportWaypoint[] = [buildNavDataWaypoint(item)];

        let k = i + 1;
        let seqno = item.seqno;
        let nextItem = stars[k];

        while (nextItem && nextItem.seqno > seqno) {
            waypoints.push(buildNavDataWaypoint(nextItem));
            k++;
            seqno = nextItem.seqno;
            nextItem = stars[k];
        }

        waypoints = waypoints.filter(x => x.coordinate[0]);

        let procedure = starsList[`${ item.airport_identifier }-${ item.procedure_identifier }`];
        if (!procedure) {
            procedure = starsList[`${ item.airport_identifier }-${ item.procedure_identifier }`] = { procedure: { runways: [] }, transitions: { runway: [], enroute: [] }, waypoints: [] } as unknown as NavDataProcedure<NavigraphNavDataStar>;
        }

        const transition = item.transition_identifier?.replace('RW', '');

        if (item.transition_identifier?.startsWith('RW') || item.transition_identifier === 'ALL') {
            if (procedure.procedure.runways === null) procedure.procedure.runways = [null];

            addNavDataRunways(item.airport_identifier, transition, procedure.procedure.runways, runwaysByAirport);
        }

        if (isRunwayTransition) {
            procedure.transitions.runway.push({
                name: transition ?? '',
                waypoints,
            });
        }
        else if (isEnroute) {
            procedure.transitions.runway.push({
                name: transition ?? waypoints[waypoints.length - 1].identifier,
                waypoints,
            });
        }
        else if (isStar) {
            procedure.waypoints = waypoints;
        }

        procedure.procedure.airport ||= item.airport_identifier;
        procedure.procedure.identifier ||= item.procedure_identifier;
    }

    for (const [key, value] of Object.entries(starsList)) {
        fullData.stars[key.split('-')[0]] ||= [];
        fullData.stars[key.split('-')[0]].push(value);
    }
};

export const processNavdataIap: NavdataProcessFunction = async ({ fullData, db, runwaysByAirport }) => {
    const iaps = await dbPartialRequest<{
        airport_identifier: string;
        altitude_description: string;
        altitude1: number;
        altitude2: number;
        // arc_radius: number;
        area_code: string;
        // authorization_required: string;
        // center_waypoint_icao_code: string;
        // center_waypoint_latitude: number;
        // center_waypoint_longitude: number;
        // center_waypoint_ref_table: string;
        // center_waypoint: string;
        // course_flag: string;
        course: number;
        distance_time: number;
        // gnss_fms_indication: string;
        // lnav_authorized_sbas: string;
        // lnav_level_service_name: string;
        // lnav_vnav_authorized_sbas: string;
        // lnav_vnav_level_service_name: string;
        path_termination: string;
        procedure_identifier: string;
        // recommended_navaid_icao_code: string;
        // recommended_navaid_latitude: number;
        // recommended_navaid_longitude: number;
        // recommended_navaid_ref_table: string;
        // recommended_navaid: string;
        // rho: number;
        // rnp: number;
        // route_distance_holding_distance_time: string;
        route_type: string;
        seqno: number;
        speed_limit_description: string;
        speed_limit: number;
        // theta: number;
        // transition_altitude: number;
        transition_identifier: string;
        // turn_direction: string;
        // vertical_angle: number;
        waypoint_description_code: string;
        waypoint_icao_code: string;
        waypoint_identifier: string;
        waypoint_latitude: number;
        waypoint_longitude: number;
        waypoint_ref_table: string;
    }>({
        db,
        sql: 'SELECT airport_identifier, altitude_description, altitude1, altitude2, area_code, course, distance_time, path_termination, procedure_identifier, route_type, seqno, speed_limit_description, speed_limit, transition_identifier, waypoint_description_code, waypoint_icao_code, waypoint_identifier, waypoint_latitude, waypoint_longitude, waypoint_ref_table FROM tbl_pf_iaps',
        table: 'tbl_pf_iaps',
    });

    fullData.approaches = {};

    const approachNames: Record<string, string> = {
        B: 'LOC (Back crs)',
        D: 'VOR DME',
        F: 'FMS',
        G: 'IGS',
        I: 'ILS',
        J: 'GLS',
        L: 'LOC',
        M: 'MLS',
        N: 'NDB',
        P: 'GPS',
        Q: 'NDB DME',
        R: 'RNAV',
        S: 'VOR (DME/TAC)',
        T: 'TACAN',
        U: 'SDF',
        V: 'VOR',
        W: 'MLS Type A',
        X: 'LDA',
        Y: 'MLS Type B/C',
    };

    const runwayRegex = /(?<runway>[0-9]{2}([RLC])?)(?<suffix>[A-Z]+)?/;

    // key is airport-approach here
    const approachList: Record<string, NavDataProcedure<NavigraphNavDataApproach>> = {};

    for (let i = 0; i < iaps.length; i++) {
        if (i % 1000 === 0) await sleep(0);

        const item = iaps[i];
        const previousItem = iaps[i - 1];
        if ((previousItem && previousItem.seqno < item.seqno) || item.route_type === 'Z') continue;

        let waypoints: NavigraphNavDataAirportWaypoint[] = [buildNavDataWaypoint(item)];
        let missedApproach: NavigraphNavDataAirportWaypoint[] = [];

        const isTransition = item.route_type === 'A';

        let k = i + 1;
        let seqno = item.seqno;
        let nextItem = iaps[k];
        let isMissedApproach = false;

        while (nextItem && nextItem.seqno > seqno) {
            if (!isMissedApproach && nextItem.waypoint_description_code && (nextItem.waypoint_description_code[3] === 'M' || nextItem.waypoint_description_code[4] === 'M')) {
                isMissedApproach = true;
            }

            if (isMissedApproach) {
                missedApproach.push(buildNavDataWaypoint(nextItem));
            }
            else {
                waypoints.push(buildNavDataWaypoint(nextItem));
            }

            k++;
            seqno = nextItem.seqno;
            nextItem = iaps[k];
        }

        waypoints = waypoints.filter(x => x.coordinate[0]);
        missedApproach = missedApproach.filter(x => x.coordinate[0]);

        const regex = runwayRegex.exec(item.procedure_identifier)?.groups;
        const runway = regex?.runway;
        const suffix = regex?.suffix;
        if (!runway) continue;

        let procedure = approachList[`${ item.airport_identifier }-${ item.procedure_identifier }`];
        if (!procedure) {
            procedure = approachList[`${ item.airport_identifier }-${ item.procedure_identifier }`] = { procedure: { missedApproach: [] }, transitions: [], waypoints: [] } as unknown as NavDataProcedure<NavigraphNavDataApproach>;
        }

        if (isTransition) {
            procedure.transitions.push({
                name: item.transition_identifier,
                waypoints,
            });
        }
        else {
            procedure.waypoints = waypoints;
            procedure.procedure.missedApproach = missedApproach;

            procedure.procedure = {
                airport: item.airport_identifier,
                procedureName: `${ approachNames[item.route_type] ?? 'Unknown' }${ suffix ? ` ${ suffix }` : '' }`,
                runway,
                transition: item.transition_identifier ?? null,
                missedApproach,
            };
        }
    }

    for (const [key, value] of Object.entries(approachList)) {
        fullData.approaches[key.split('-')[0]] ||= [];
        fullData.approaches[key.split('-')[0]].push(value);

        const runways = runwaysByAirport[value.procedure.airport];

        if (!runways) continue;

        const runway = runways.find(x => x.identifier === value.procedure.runway);
        if (!runway) continue;

        value.waypoints.push({
            altitude: null,
            altitude1: null,
            altitude2: null,
            speed: null,
            speedLimit: null,
            identifier: `RW${ runway.identifier }`,
            coordinate: runway.coordinate,
            ref: '',
        });

        if (value.procedure.missedApproach.length) {
            value.procedure.missedApproach.unshift({
                altitude: null,
                altitude1: null,
                altitude2: null,
                speed: null,
                speedLimit: null,
                identifier: `RW${ runway.identifier }`,
                coordinate: runway.coordinate,
                ref: '',
            });
        }
    }
};
