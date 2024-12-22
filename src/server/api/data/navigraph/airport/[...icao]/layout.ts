import { handleH3Error } from '~/utils/backend/h3';
import { findAndRefreshFullUserByCookie } from '~/utils/backend/user';
import { getNavigraphLayout } from '~/utils/backend/navigraph';
import type { NavigraphLayout } from '~/types/data/navigraph';

export default defineEventHandler(async (event): Promise<NavigraphLayout | undefined> => {
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

    if (!user?.hasFms || !user.hasCharts) {
        handleH3Error({
            event,
            statusCode: 403,
            data: 'You require Navigraph Ultimate to access layouts feature',
        });
        return;
    }

    return getNavigraphLayout({
        icao,
    });
});
