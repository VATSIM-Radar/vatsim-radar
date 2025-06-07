import { handleH3Error, validateDataReady } from '~/utils/backend/h3';
import { findAndRefreshFullUserByCookie } from '~/utils/backend/user';

export default defineEventHandler(async event => {
    if (!await validateDataReady(event)) return;

    const { type, data, key } = getRouterParams(event);

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

    return $fetch<Record<string, any>>(`http://navigraph:3000/item/${ type }/${ data }/${ key }`);
});
