import type sqlite3 from 'sqlite3';
import { dbPartialRequest } from '~/utils/backend/navigraph/db';
import type { H3Event } from 'h3';
import { handleH3Error, validateDataReady } from '~/utils/backend/h3';
import { findAndRefreshFullUserByCookie } from '~/utils/backend/user';
import { processNavdataNDB, processNavdataVHF } from '~/utils/backend/navigraph/navdata/vordme';
import {
    processNavdataAirways,
    processNavdataHoldings,
    processNavdataWaypoints,
} from '~/utils/backend/navigraph/navdata/misc';
import type {
    NavdataProcessFunction,
    NavdataRunwaysByAirport,
    NavigraphNavData,
    NavigraphNavDataShort,
} from '~/utils/backend/navigraph/navdata/types';
import { processNavdataIap, processNavdataSid, processNavdataStar } from '~/utils/backend/navigraph/navdata/star-sid';

export async function processDatabase(db: sqlite3.Database) {
    console.time('navigraph get');

    const fullData: Partial<NavigraphNavData> = {};
    const shortData: Partial<NavigraphNavDataShort> = {};

    const runways = await dbPartialRequest<{
        airport_identifier: string;
        runway_identifier: string;
        runway_latitude: number;
        runway_longitude: number;
    }>({
        db,
        sql: 'SELECT airport_identifier, runway_identifier, runway_latitude, runway_longitude FROM tbl_pg_runways',
        table: 'tbl_pg_runways',
    });

    const runwaysByAirport: NavdataRunwaysByAirport = {};

    for (const runway of runways) {
        runwaysByAirport[runway.airport_identifier] ||= [];
        runwaysByAirport[runway.airport_identifier].push({
            identifier: runway.runway_identifier.replace('RW', ''),
            coordinate: [runway.runway_longitude, runway.runway_latitude],
        });
    }

    const settings: Parameters<NavdataProcessFunction>[0] = {
        db,
        fullData,
        shortData,
        runwaysByAirport,
    };

    console.timeLog('navigraph get', 'runways');

    await processNavdataWaypoints(settings);
    console.timeLog('navigraph get', 'waypoints');

    await processNavdataVHF(settings);
    console.timeLog('navigraph get', 'vhf');

    await processNavdataNDB(settings);
    console.timeLog('navigraph get', 'ndb');

    await processNavdataHoldings(settings);
    console.timeLog('navigraph get', 'holdings');

    await processNavdataAirways(settings);
    console.timeLog('navigraph get', 'airways');

    await processNavdataSid(settings);
    console.timeLog('navigraph get', 'sids');

    await processNavdataStar(settings);
    console.timeLog('navigraph get', 'stars');

    await processNavdataIap(settings);
    console.timeLog('navigraph get', 'iaps');

    console.timeEnd('navigraph get');

    return {
        full: fullData as NavigraphNavData,
        short: shortData as NavigraphNavDataShort,
    };
}


export async function getShortNavData(event: H3Event, type: 'current' | 'outdated') {
    if (!await validateDataReady(event)) return;

    if (type === 'current') {
        const user = await findAndRefreshFullUserByCookie(event);

        if (!user || !user.hasFms) {
            return handleH3Error({
                event,
                statusCode: 403,
                data: 'You must have Navigraph Data/Unlimited subscription to access this short data',
            });
        }
    }

    return $fetch<Record<string, any>>(`http://navigraph:3000/data/${ type }`);
}

export async function getNavDataProcedure(event: H3Event, request: 'short' | 'full' | 'all') {
    const { type, airport, group, index } = getRouterParams(event);

    if (type !== 'outdated') {
        const user = await findAndRefreshFullUserByCookie(event);

        if (!user || !user.hasFms) {
            return handleH3Error({
                event,
                statusCode: 403,
                data: 'You must have Navigraph Data/Unlimited subscription to access this short data',
            });
        }
    }

    const key = type === 'outdated' ? type : 'current';

    if (request === 'all') return $fetch<Record<string, any>>(`http://navigraph:3000/airport/${ key }/${ airport }`);
    if (request === 'short') return $fetch<Record<string, any>>(`http://navigraph:3000/airport/${ key }/${ airport }/${ group }`);
    else return $fetch<Record<string, any>>(`http://navigraph:3000/airport/${ key }/${ airport }/${ group }/${ index }`);
}
