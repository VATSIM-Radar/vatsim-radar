import { radarStorage } from '~/utils/backend/storage';
import { handleH3Error, validateDataReady } from '~/utils/backend/h3';
import { findAndRefreshFullUserByCookie } from '~/utils/backend/user';
import type { NavigraphNavData } from '~/utils/backend/navigraph/navdata';

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

    const object = radarStorage.navigraphData.full[type as 'current' | 'outdated']?.[data as keyof NavigraphNavData];
    if (!object) {
        return handleH3Error({
            event,
            statusCode: 404,
            data: 'Data object not found',
        });
    }

    const item = object[key as keyof typeof object];
    if (!item) {
        return handleH3Error({
            event,
            statusCode: 404,
            data: 'Item not found for this key',
        });
    }

    if (type !== 'outdated' && !import.meta.dev) {
        setResponseHeader(event, 'Cache-Control', 'private, max-age=604800, stale-while-revalidate=86400, immutable');
    }

    return item as Record<string, any>;
});
