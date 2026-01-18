import { handleH3Error, validateDataReady } from '~/utils/server/h3';
import { findAndRefreshUserByCookie } from '~/utils/server/user';

export default defineEventHandler(async event => {
    if (!await validateDataReady(event)) return;
    const config = useRuntimeConfig();

    const { type, data, key } = getRouterParams(event);

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

    return $fetch<Record<string, any>>(`${ config.NAVIGRAPH_HOST }/item/${ type }/${ data }/${ key }`);
});
