import { handleH3Error } from '~/utils/backend/h3';
import { findAndRefreshFullUserByCookie } from '~/utils/backend/user';
import { getNavigraphRunways } from '~/utils/backend/navigraph';
import type { NavigraphRunway } from '~/types/data/navigraph';

export default defineEventHandler(async (event): Promise<NavigraphRunway[] | undefined> => {
    const user = await findAndRefreshFullUserByCookie(event);

    const icao = getRouterParam(event, 'icao');

    if (icao?.length !== 4) {
        handleH3Error({
            event,
            statusCode: 400,
            data: 'Invalid code',
        });
        return;
    }

    const runways = await getNavigraphRunways({
        user,
        event,
        icao,
    });

    if (!runways) return [];

    return runways;
});
