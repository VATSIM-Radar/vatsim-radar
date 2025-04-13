import { handleH3Error } from '~/utils/backend/h3';
import { getDiffPolygons, getSimAwareData } from '~/utils/backend/debug/data-get';

export default defineEventHandler(async event => {
    const { type, id } = getRouterParams(event);
    if (!type || !id || (type !== 'simaware' && type !== 'vatspy') || isNaN(+id)) {
        return handleH3Error({
            event,
            statusCode: 400,
        });
    }

    return getDiffPolygons(await getSimAwareData(+id), 'simaware');
});
