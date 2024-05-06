import { handleH3Error } from '~/utils/backend/h3';
import { findAndRefreshFullUserByCookie } from '~/utils/backend/user';
import { getNavigraphGates, getNavigraphRunways } from '~/utils/backend/navigraph';
import type { NavigraphAirportData } from '~/types/data/navigraph';

export default defineEventHandler(async (event): Promise<NavigraphAirportData | undefined> => {
    const user = await findAndRefreshFullUserByCookie(event);

    const icao = getRouterParam(event, 'icao');

    if (icao?.length !== 4) {
        handleH3Error({
            event,
            statusCode: 400,
            statusMessage: 'Invalid code',
        });
        return;
    }

    const [runways, gates] = await Promise.all([
        getNavigraphRunways({
            user,
            event,
            icao,
        }),
        getNavigraphGates({
            user,
            event,
            icao,
        }),
    ]);

    if (!runways || !gates) return;

    return {
        airport: icao,
        runways,
        gates,
    };
});
