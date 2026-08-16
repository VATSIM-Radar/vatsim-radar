import { handleH3Error, streamProxyResponse, validateDataReady } from '~/utils/server/h3';
import { findAndRefreshUserByCookie } from '~/utils/server/user';

export default defineEventHandler(async event => {
    if (!await validateDataReady(event)) return;
    const config = useRuntimeConfig();

    const { type, data } = getRouterParams(event);

    if (type !== 'outdated') {
        const user = await findAndRefreshUserByCookie(event);

        if (!user || !user.hasFms) {
            return handleH3Error({
                event,
                statusCode: 403,
                data: 'You must have Navigraph Data/Unlimited subscription to access this data',
            });
        }
    }

    return streamProxyResponse(event, `${ config.NAVIGRAPH_HOST }/item/${ type }/${ data }`);
});
