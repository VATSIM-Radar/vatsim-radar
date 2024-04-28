import { handleH3Error } from '~/utils/backend/h3';
import { findAndRefreshFullUserByCookie } from '~/utils/backend/user';
import { getNavigraphGates } from '~/utils/backend/navigraph';

export default defineEventHandler(async (event) => {
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

    return getNavigraphGates({
        user,
        event,
        icao,
    });
});
