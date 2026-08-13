import type sqlite3 from 'better-sqlite3';
import { dbPartialRequest } from '~/utils/server/navigraph/db';
import type { H3Event } from 'h3';
import { handleH3Error, streamProxyResponse, validateDataReady } from '~/utils/server/h3';
import { findAndRefreshUserByCookie } from '~/utils/server/user';
import { processNavdataNDB, processNavdataVHF } from '~/utils/server/navigraph/navdata/vordme';
import {
    processNavdataAirways,
    processNavdataHoldings,
    processNavdataWaypoints,
} from '~/utils/server/navigraph/navdata/misc';
import type {
    NavdataProcessFunction,
    NavdataRunwaysByAirport,
    NavigraphNavDataFull,
    NavigraphNavDataShort,
} from '~/utils/server/navigraph/navdata/types';
import { processNavdataIap, processNavdataSid, processNavdataStar } from '~/utils/server/navigraph/navdata/star-sid';
import { processNavdataControlledAirspace, processNavdataRestrictedAirspace } from '~/utils/server/navigraph/navdata/airspaces';

export async function processDatabase(db: sqlite3.Database, version: string) {
    console.time('navigraph get');

    const fullData: Partial<NavigraphNavDataFull> = {};
    const shortData: Partial<NavigraphNavDataShort> = {
        version,
    };

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

    await processNavdataRestrictedAirspace(settings);
    console.timeLog('navigraph get', 'restricted airspace');

    await processNavdataControlledAirspace(settings);
    console.timeLog('navigraph get', 'controlled airspace');

    await processNavdataSid(settings);
    console.timeLog('navigraph get', 'sids');

    await processNavdataStar(settings);
    console.timeLog('navigraph get', 'stars');

    await processNavdataIap(settings);
    console.timeLog('navigraph get', 'iaps');

    console.timeEnd('navigraph get');

    return {
        full: fullData as NavigraphNavDataFull,
        short: shortData as NavigraphNavDataShort,
    };
}


export async function getShortNavData(event: H3Event, type: 'current' | 'outdated') {
    if (!await validateDataReady(event)) return;
    const config = useRuntimeConfig();

    if (type === 'current') {
        const user = await findAndRefreshUserByCookie(event);

        if (!user || !user.hasFms) {
            return handleH3Error({
                event,
                statusCode: 403,
                data: 'You must have Navigraph Data/Unlimited subscription to access this short data',
            });
        }
    }

    return streamProxyResponse(event, `${ config.NAVIGRAPH_HOST }/data/${ type }`);
}

export async function getNavDataProcedure(event: H3Event, request: 'short' | 'full' | 'all') {
    const { type, airport, group, index } = getRouterParams(event);

    if (type !== 'outdated') {
        const user = await findAndRefreshUserByCookie(event);

        if (!user || !user.hasFms) {
            return handleH3Error({
                event,
                statusCode: 403,
                data: 'You must have Navigraph Data/Unlimited subscription to access this short data',
            });
        }
    }

    const key = type === 'outdated' ? type : 'current';

    const config = useRuntimeConfig();
    if (request === 'all') return streamProxyResponse(event, `${ config.NAVIGRAPH_HOST }/airport/${ key }/${ airport }`);
    if (request === 'short') return streamProxyResponse(event, `${ config.NAVIGRAPH_HOST }/airport/${ key }/${ airport }/${ group }`);
    return streamProxyResponse(event, `${ config.NAVIGRAPH_HOST }/airport/${ key }/${ airport }/${ group }/${ index }`);
}
