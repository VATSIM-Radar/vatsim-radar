import type { NavdataRunwaysByAirport, NavigraphNavDataAirportWaypoint } from '~/utils/backend/navigraph/navdata/types';

export function addNavDataRunways(airport: string, runway: string, runways: any[], runwaysByAirport: NavdataRunwaysByAirport) {
    if (!runwaysByAirport[airport]) runways.push(runway);
    else if (runway === 'ALL') {
        runways.push(...runwaysByAirport[airport].map(x => x.identifier));
    }
    else if (!runway.endsWith('B')) runways.push(runway);
    else {
        const list = runwaysByAirport[airport].filter(x => runway.startsWith(x.identifier.slice(0, 2))).map(x => x.identifier);
        runways.push(...list);
    }
}

export function buildNavDataWaypoint(item: {
    waypoint_identifier: string;
    waypoint_latitude: number;
    waypoint_longitude: number;
    altitude_description: string;
    altitude1: number;
    altitude2: number;
    speed_limit_description: string;
    speed_limit: number;
    waypoint_ref_table: string;
    [key: string]: any;
}): NavigraphNavDataAirportWaypoint {
    const waypoint: NavigraphNavDataAirportWaypoint = {
        identifier: item.waypoint_identifier,
        coordinate: [item.waypoint_longitude, item.waypoint_latitude],
        ref: item.waypoint_ref_table,
        altitude: null,
        altitude1: null,
        altitude2: null,
        speed: null,
        speedLimit: item.speed_limit ?? null,
    };

    switch (item.altitude_description) {
        case '+':
            waypoint.altitude = 'above';
            waypoint.altitude1 = item.altitude1;
            break;
        case '-':
            waypoint.altitude = 'below';
            waypoint.altitude1 = item.altitude1;
            break;
        case '@':
            waypoint.altitude = 'equals';
            waypoint.altitude1 = item.altitude1;
            break;
        case 'B':
            waypoint.altitude = 'between';
            waypoint.altitude1 = item.altitude1 > item.altitude2 ? item.altitude1 : item.altitude2;
            waypoint.altitude2 = item.altitude1 > item.altitude2 ? item.altitude2 : item.altitude1;
            break;
        case 'C':
            waypoint.altitude = 'above';
            waypoint.altitude1 = item.altitude2;
            break;
        case 'G':
        case 'I':
        case 'X':
            waypoint.altitude = 'equals';
            waypoint.altitude1 = item.altitude1;
            break;
        case 'H':
        case 'J':
        case 'V':
            waypoint.altitude = 'above';
            waypoint.altitude1 = item.altitude1;
            break;
        case 'Y':
            waypoint.altitude = 'below';
            waypoint.altitude1 = item.altitude1;
            break;
    }

    switch (item.speed_limit_description) {
        case '@':
            waypoint.speed = 'equals';
            break;
        case '+':
            waypoint.speed = 'above';
            break;
        case '-':
            waypoint.speed = 'below';
            break;
    }

    return waypoint;
}
