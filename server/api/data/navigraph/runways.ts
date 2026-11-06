import { findAndRefreshUserByCookie } from '~/utils/server/user';
import { getNavigraphRunways } from '~/utils/server/navigraph';
import { getBulkAirportIcaos, mapAirportsInBatches } from '~/utils/server/vatsim/airport-data';
import { isDebug } from '~/utils/server/debug';
import type { NavigraphRunway } from '~/types/data/navigraph';

/**
 * Lightweight bulk runway lookup (no gates/layout) for dashboard AWOS.
 * Subscribers get the current AIRAC, everyone else the outdated database, same as the airport endpoint.
 */
export default defineEventHandler(async (event): Promise<Record<string, NavigraphRunway[]> | undefined> => {
    const airports = getBulkAirportIcaos(event);
    if (!airports) return;

    const user = await findAndRefreshUserByCookie(event);

    const results = await mapAirportsInBatches(airports, async icao => [icao, await getNavigraphRunways({ user, icao, event }) ?? []] as const);

    if (!isDebug()) {
        // Response depends on the user's subscription, so it must stay private
        setResponseHeader(event, 'Cache-Control', 'private, max-age=86400');
    }

    return Object.fromEntries(results);
});
